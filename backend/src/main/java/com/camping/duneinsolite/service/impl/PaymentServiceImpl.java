package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.config.CurrencyConfig;
import com.camping.duneinsolite.config.RabbitMQConfig;
import com.camping.duneinsolite.dto.message.NotificationMessage;
import com.camping.duneinsolite.dto.request.PaymentRequest;
import com.camping.duneinsolite.dto.response.PaymentResponse;
import com.camping.duneinsolite.dto.response.PaymentSummary;
import com.camping.duneinsolite.dto.response.TransactionResponse;
import com.camping.duneinsolite.exception.ReservationValidationException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.TransactionMapper;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.Transaction;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.repository.ReservationRepository;
import com.camping.duneinsolite.repository.TransactionRepository;
import com.camping.duneinsolite.service.NotificationPublisher;
import com.camping.duneinsolite.service.PaymentService;
import com.camping.duneinsolite.money.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private final TransactionRepository transactionRepository;
    private final ReservationRepository reservationRepository;
    private final TransactionMapper transactionMapper;
    private final NotificationPublisher notificationPublisher;
    private final CurrencyConfig currencyConfig;
    private final com.camping.duneinsolite.security.CallerContext caller;

    @Override
    public PaymentResponse recordPayment(UUID reservationId, PaymentRequest request) {

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));

        // STAFF ONLY (security assessment 2026-09-10, P-1). This writes a
        // COMPLETED transaction straight into the ledger. A customer must never
        // reach it — they could otherwise mark their own reservation PAID for
        // free. Defence in depth on top of the controller's @PreAuthorize.
        // Online payment (Q3) records via a verified provider webhook, not here.
        if (!caller.isStaff()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only staff may record a payment.");
        }

        Currency requestedCurrency = request.getCurrency();

        // ── Step 1: Check if this is the first payment ────────────
        boolean isFirstPayment = Money.isZeroOrNull(
                transactionRepository.sumCompletedAmountByReservationId(reservationId));

        if (isFirstPayment) {
            // ── First payment: apply conversion if currency differs ──
            if (requestedCurrency != reservation.getCurrency()) {
                applyCurrencyConversion(reservation, requestedCurrency);
                reservationRepository.save(reservation);
            }
        } else {
            // ── Subsequent payment: currency must match reservation ──
            if (requestedCurrency != reservation.getCurrency()) {
                throw new ReservationValidationException(
                        "Currency mismatch. This reservation must be paid in "
                                + reservation.getCurrency().name()
                                + ". You provided: " + requestedCurrency.name());
            }
        }

        // ── Step 2: Validate amount <= remainingTotal ─────────────
        PaymentSummary current = computePaymentSummary(reservation);

        if (current.getPaymentStatus() == PaymentStatus.PAID) {
            throw new ReservationValidationException(
                    "This reservation is already fully paid. No further payments are required.");
        }

        if (Money.gt(request.getAmount(), current.getRemainingTotal())) {
            throw new ReservationValidationException(
                    "Payment amount (" + request.getAmount() + " " + requestedCurrency.name()
                            + ") exceeds the remaining balance ("
                            + current.getRemainingTotal() + " " + reservation.getCurrency().name() + ").");
        }

        // ── Step 3: Save transaction ──────────────────────────────
        Transaction transaction = buildTransaction(reservation, request);
        Transaction saved = transactionRepository.save(transaction);

        // ── Step 4: Recompute after save ──────────────────────────
        PaymentSummary summary = computePaymentSummary(reservation);

        publishPaymentReceivedInternal(reservation, request.getAmount());

        if (summary.getPaymentStatus() == PaymentStatus.PAID) {
            publishPaymentCompletedInternal(reservation);
        }

        TransactionResponse txResponse = transactionMapper.toResponse(saved);

        PaymentResponse response = new PaymentResponse();
        response.setTransactionId(txResponse.getTransactionId());
        response.setTransactionNumber(txResponse.getTransactionNumber());
        response.setAmount(txResponse.getAmount());
        response.setCurrency(txResponse.getCurrency());
        response.setPaymentMethod(txResponse.getPaymentMethod());
        response.setStatus(txResponse.getStatus());
        response.setTransactionDate(txResponse.getTransactionDate());
        response.setReservationId(reservationId);
        response.setPaymentSummary(summary);

        return response;
    }

    // ── Currency conversion ───────────────────────────────────────
    private void applyCurrencyConversion(Reservation reservation, Currency targetCurrency) {
        if (targetCurrency == com.camping.duneinsolite.config.CurrencyConfig.BASE) {
            reservation.setCurrency(targetCurrency);
            return;
        }
        java.math.BigDecimal rate = currencyConfig.rateFor(targetCurrency);
        reservation.setExchangeRateApplied(rate);

        reservation.setTotalAmount(Money.divide(reservation.getTotalAmount(), rate));
        reservation.setTotalExtrasAmount(Money.divide(reservation.getTotalExtrasAmount(), rate));

        reservation.getTourTypes().forEach(tt -> {
            tt.setAdultPrice(Money.divide(tt.getAdultPrice(), rate));
            tt.setChildPrice(Money.divide(tt.getChildPrice(), rate));
            tt.setInfantPrice(Money.divide(tt.getInfantPrice(), rate));
        });
        reservation.getTours().forEach(tour -> {
            tour.setAdultPrice(Money.divide(tour.getAdultPrice(), rate));
            tour.setChildPrice(Money.divide(tour.getChildPrice(), rate));
            tour.setInfantPrice(Money.divide(tour.getInfantPrice(), rate));
            tour.setTotalPrice(Money.divide(tour.getTotalPrice(), rate));
        });
        reservation.getExtras().forEach(extra -> {
            extra.setUnitPrice(Money.divide(extra.getUnitPrice(), rate));
            extra.setTotalPrice(Money.divide(extra.getTotalPrice(), rate));
        });

        reservation.setCurrency(targetCurrency);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentSummary computePaymentSummary(Reservation reservation) {
        java.math.BigDecimal main   = Money.nz(reservation.getTotalAmount());
        java.math.BigDecimal extras = Money.nz(reservation.getTotalExtrasAmount());
        java.math.BigDecimal total  = Money.add(main, extras);

        java.math.BigDecimal totalPaid = Money.nz(transactionRepository
                .sumCompletedAmountByReservationId(reservation.getReservationId()));

        java.math.BigDecimal remainingMain;
        java.math.BigDecimal remainingExtras;
        if (Money.gte(totalPaid, main)) {
            remainingMain = Money.ZERO;
            java.math.BigDecimal overflow = Money.subtract(totalPaid, main);
            java.math.BigDecimal r = Money.subtract(extras, overflow);
            remainingExtras = r.signum() < 0 ? Money.ZERO : r;
        } else {
            remainingMain = Money.subtract(main, totalPaid);
            remainingExtras = extras;
        }
        java.math.BigDecimal remainingTotal = Money.add(remainingMain, remainingExtras);

        PaymentStatus paymentStatus;
        if (totalPaid.signum() <= 0)          paymentStatus = PaymentStatus.UNPAID;
        else if (remainingTotal.signum() > 0) paymentStatus = PaymentStatus.PARTIALLY_PAID;
        else                                  paymentStatus = PaymentStatus.PAID;

        return PaymentSummary.builder()
                .originalMainAmount(main)
                .originalExtrasAmount(extras)
                .originalTotalAmount(total)
                .totalPaid(totalPaid)
                .remainingMainAmount(remainingMain)
                .remainingExtrasAmount(remainingExtras)
                .remainingTotal(remainingTotal)
                .paymentStatus(paymentStatus)
                .build();
    }

    @Override
    public Transaction buildTransaction(Reservation reservation, PaymentRequest request) {
        Currency currency = request.getCurrency() != null
                ? request.getCurrency()
                : reservation.getCurrency();

        return Transaction.builder()
                .transactionNumber(generateTransactionNumber())
                .amount(request.getAmount())
                .currency(currency)
                .paymentMethod(request.getPaymentMethod())
                .status(TransactionStatus.COMPLETED)
                .reservation(reservation)
                .build();
    }

    @Override
    public void publishPaymentReceivedInternal(Reservation reservation, java.math.BigDecimal amount) {
        String amountFormatted = String.format("%.2f %s",
                amount, reservation.getCurrency().name());

        notificationPublisher.publish(
                RabbitMQConfig.PAYMENT_RECEIVED,
                NotificationMessage.builder()
                        .targetRoles(List.of(UserRole.ADMIN))
                        .type(NotificationType.PAYMENT_RECEIVED)
                        .reservationId(reservation.getReservationId())
                        .title("Paiement reçu")
                        .message("Le groupe \"" + reservation.getGroupName()
                                + "\" a effectué un paiement de " + amountFormatted + ".")
                        .build()
        );

        notificationPublisher.publish(
                RabbitMQConfig.PAYMENT_RECEIVED,
                NotificationMessage.builder()
                        .targetUserId(reservation.getUser().getUserId())
                        .type(NotificationType.PAYMENT_RECEIVED)
                        .reservationId(reservation.getReservationId())
                        .title("Paiement enregistré")
                        .message("Votre paiement de " + amountFormatted
                                + " pour la réservation du groupe \""
                                + reservation.getGroupName() + "\" a bien été enregistré.")
                        .build()
        );
    }

    @Override
    public void publishPaymentCompletedInternal(Reservation reservation) {
        notificationPublisher.publish(
                RabbitMQConfig.PAYMENT_COMPLETED,
                NotificationMessage.builder()
                        .targetRoles(List.of(UserRole.ADMIN))
                        .type(NotificationType.PAYMENT_COMPLETED)
                        .reservationId(reservation.getReservationId())
                        .title("Réservation entièrement payée")
                        .message("Le groupe \"" + reservation.getGroupName()
                                + "\" a réglé la totalité du montant dû.")
                        .build()
        );

        notificationPublisher.publish(
                RabbitMQConfig.PAYMENT_COMPLETED,
                NotificationMessage.builder()
                        .targetUserId(reservation.getUser().getUserId())
                        .type(NotificationType.PAYMENT_COMPLETED)
                        .reservationId(reservation.getReservationId())
                        .title("Paiement complet")
                        .message("Votre réservation pour le groupe \""
                                + reservation.getGroupName()
                                + "\" est entièrement réglée. Merci !")
                        .build()
        );
    }

    private String generateTransactionNumber() {
        long count = transactionRepository.count() + 1;
        return String.format("TXN-%05d", count);
    }
}
