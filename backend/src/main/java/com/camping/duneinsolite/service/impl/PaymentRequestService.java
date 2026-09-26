package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.response.PaymentRequestResult;
import com.camping.duneinsolite.dto.response.PaymentSummary;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ReservationStatusException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mail.ReservationMailer;
import com.camping.duneinsolite.mail.ReservationMailer.PayKind;
import com.camping.duneinsolite.mail.ReservationMailer.PayMethod;
import com.camping.duneinsolite.model.PaymentPolicy;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.enums.MailLocale;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.PaymentPolicyRepository;
import com.camping.duneinsolite.repository.ReservationRepository;
import com.camping.duneinsolite.service.PaymentService;
import com.camping.duneinsolite.service.ReservationStateMachine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Everything the client is told about paying, in their own language
 * (Reservation.locale) - the confirmation email, a later payment request, and
 * the "we received your payment" email. Payment status itself is never stored
 * here: it stays derived from recorded transactions.
 *
 * What is asked upfront, in order of precedence:
 *   1. the amount staff set for this booking (Reservation.depositAmount; 0 = none),
 *   2. otherwise the payment policy (none / a percentage / everything).
 * minus what has already been recorded, floored at zero. The amount is always
 * computed here, never taken from an email or a client as a price.
 *
 * Kept out of ReservationServiceImpl on purpose (see CLAUDE.md: that class is
 * the money path and is not to be grown before it has tests).
 */
@Service
@RequiredArgsConstructor
public class PaymentRequestService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final ReservationRepository reservationRepository;
    private final PaymentPolicyRepository policyRepository;
    private final PaymentService paymentService;
    private final ReservationMailer mailer;
    private final ReservationOverviewFactory overviewFactory;
    private final CustomerCurrency customerCurrency;

    /**
     * Staff "send / resend the payment request" from the reservation page.
     *
     * @param paymentLink optional; when non-blank it replaces the stored link
     * @param amount      optional; when set it becomes this booking's deposit (0 = none)
     */
    @Transactional
    public PaymentRequestResult send(UUID reservationId, String paymentLink, BigDecimal amount) {
        Reservation reservation = load(reservationId);
        if (ReservationStateMachine.TERMINAL.contains(reservation.getStatus())) {
            throw new ReservationStatusException(
                    "Cette réservation est terminée, annulée ou refusée : aucune demande de paiement possible.");
        }
        applyTerms(reservation, paymentLink, amount);
        return dispatch(reservation, false, true);
    }

    /** Called when a reservation is confirmed: the confirmation email, with the payment terms in it. */
    @Transactional
    public void sendConfirmation(UUID reservationId) {
        dispatch(load(reservationId), true, false);
    }

    /** Saves this booking's payment terms without emailing (used just before confirming). */
    @Transactional
    public void saveTerms(UUID reservationId, String paymentLink, BigDecimal amount) {
        applyTerms(load(reservationId), paymentLink, amount);
    }

    /** "We received your payment - the rest is payable on site." Called after a payment is recorded. */
    @Transactional(readOnly = true)
    public void sendPaymentReceived(UUID reservationId, BigDecimal received) {
        Reservation reservation = load(reservationId);
        PaymentPolicy policy = policy();
        PaymentSummary summary = paymentService.computePaymentSummary(reservation);

        List<PayMethod> onSite = new ArrayList<>();
        if (policy.isAcceptCardOnSite()) onSite.add(PayMethod.CARD);
        if (policy.isAcceptCashOnSite()) onSite.add(PayMethod.CASH);
        if (policy.isAcceptCheque()) onSite.add(PayMethod.CHEQUE);

        mailer.sendPaymentReceived(new ReservationMailer.PaymentReceivedMail(
                reservation.getUser().getEmail(),
                reservation.getUser().getName(),
                groupOf(reservation),
                MailLocale.from(reservation.getLocale()),
                customerCurrency.of(reservation).name(),
                customerCurrency.convert(reservation, received),
                customerCurrency.convert(reservation, Money.nz(summary.getRemainingTotal())),
                onSite,
                overviewFactory.forReservation(reservationId)));
    }

    // ── internals ─────────────────────────────────────────────────

    private PaymentRequestResult dispatch(Reservation reservation, boolean confirmation, boolean strict) {
        PaymentPolicy policy = policy();
        PaymentSummary summary = paymentService.computePaymentSummary(reservation);
        BigDecimal total = summary.getOriginalTotalAmount();
        BigDecimal paid = Money.nz(summary.getTotalPaid());

        BigDecimal requested = requestedUpfront(reservation, policy, total);
        BigDecimal due = Money.subtract(requested, paid);
        if (due.signum() < 0) due = Money.ZERO;

        if (strict && requested.signum() > 0 && due.signum() == 0) {
            throw new ConflictException("Le montant demandé à l'avance a déjà été réglé.");
        }

        BigDecimal remaining = Money.nz(summary.getRemainingTotal());
        PayKind kind = due.signum() == 0 ? PayKind.NONE
                : Money.gte(due, remaining) ? PayKind.FULL : PayKind.DEPOSIT;

        LocalDate arrival = reservation.getCheckInDate() != null ? reservation.getCheckInDate() : reservation.getServiceDate();
        LocalDate dueDate = arrival == null ? null
                : arrival.minusDays(policy.getDeadlineDaysBefore() == null ? 0 : policy.getDeadlineDaysBefore());

        String link = policy.isAcceptOnlineLink() ? reservation.getPaymentLink() : null;
        boolean hasLink = link != null && !link.isBlank();
        String currency = currencyOf(reservation);

        mailer.sendPayment(new ReservationMailer.PaymentMail(
                reservation.getUser().getEmail(),
                reservation.getUser().getName(),
                groupOf(reservation),
                MailLocale.from(reservation.getLocale()),
                confirmation,
                kind,
                customerCurrency.of(reservation).name(),
                customerCurrency.convert(reservation, total),
                customerCurrency.convert(reservation, due),
                dueDate,
                link,
                methodsOf(policy, hasLink),
                policy.getNote(),
                overviewFactory.forReservation(reservation.getReservationId())));

        return new PaymentRequestResult(reservation.getUser().getEmail(), due, currency, dueDate, hasLink);
    }

    private void applyTerms(Reservation reservation, String paymentLink, BigDecimal amount) {
        if (paymentLink != null && !paymentLink.isBlank()) {
            reservation.setPaymentLink(validatedLink(paymentLink));
        }
        if (amount != null) {
            BigDecimal total = Money.nz(paymentService.computePaymentSummary(reservation).getOriginalTotalAmount());
            if (amount.signum() < 0 || Money.round(amount).compareTo(total) > 0) {
                throw new ConflictException("Le montant demandé doit être compris entre 0 et le total de la réservation.");
            }
            reservation.setDepositAmount(Money.round(amount));
        }
        reservationRepository.save(reservation);
    }

    /** The amount asked for upfront before subtracting what is already paid. */
    static BigDecimal requestedUpfront(Reservation reservation, PaymentPolicy policy, BigDecimal total) {
        if (reservation.getDepositAmount() != null) return reservation.getDepositAmount();
        return requiredUpfront(policy, total);
    }

    static BigDecimal requiredUpfront(PaymentPolicy policy, BigDecimal total) {
        return switch (policy.getDepositMode()) {
            case NONE -> Money.ZERO;
            case FULL -> total;
            case PERCENT -> Money.divide(Money.multiply(total, policy.getDepositPercent()), HUNDRED);
        };
    }

    static List<PayMethod> methodsOf(PaymentPolicy policy, boolean hasLink) {
        List<PayMethod> methods = new ArrayList<>();
        if (policy.isAcceptOnlineLink() && hasLink) methods.add(PayMethod.ONLINE);
        if (policy.isAcceptBankTransfer()) methods.add(PayMethod.TRANSFER);
        if (policy.isAcceptCardOnSite()) methods.add(PayMethod.CARD);
        if (policy.isAcceptCashOnSite()) methods.add(PayMethod.CASH);
        if (policy.isAcceptCheque()) methods.add(PayMethod.CHEQUE);
        return methods;
    }

    private Reservation load(UUID id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + id));
    }

    private PaymentPolicy policy() {
        return policyRepository.findById(1L)
                .orElseThrow(() -> new ResourceNotFoundException("Payment policy row is missing"));
    }

    private static String groupOf(Reservation r) {
        return r.getGroupName() != null && !r.getGroupName().isBlank() ? r.getGroupName() : r.getUser().getName();
    }

    private static String currencyOf(Reservation r) {
        return r.getCurrency() != null ? r.getCurrency().name() : "EUR";
    }

    /** Only http(s) links go into an email href - never javascript: or data: URLs. */
    private static String validatedLink(String raw) {
        String link = raw.trim();
        try {
            String scheme = URI.create(link).getScheme();
            if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)) return link;
        } catch (IllegalArgumentException ignored) {
            // falls through to the same error below
        }
        throw new ConflictException("Le lien de paiement doit être une adresse http(s) valide.");
    }
}
