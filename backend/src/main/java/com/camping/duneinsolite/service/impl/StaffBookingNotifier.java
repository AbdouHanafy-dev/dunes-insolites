package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.mail.StaffBookingMailer;
import com.camping.duneinsolite.model.DeletedAccount;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.EmailType;
import com.camping.duneinsolite.model.enums.ReservationType;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.EmailDispatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Tells the team by e-mail about a site booking's life: it arrived, it was confirmed, or it was
 * cancelled - each sent once per reservation (idempotent through {@code email_dispatch}, so a
 * redelivered message never mails twice) and never allowed to fail the booking, the status change
 * or the guest's own confirmation: every problem is logged and swallowed.
 *
 * <p>The two legal entities keep separate inboxes: a circuit (Route Insolite) goes to
 * {@code app.mail.staff-booking-recipients-circuits}, a stay or an activity (Dunes Insolites) to
 * {@code app.mail.staff-booking-recipients} - either falls back to every ADMIN account when unset,
 * independently of the other.
 *
 * <p>Only bookings from the public site are announced. A booking the team enters itself in the
 * backoffice, or a status the team sets on one, does not need an e-mail telling them about it.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StaffBookingNotifier {

    static final String VITRINE_SOURCE = "Site web";

    private static final Map<String, String> LANGUAGES = Map.of(
            "fr", "Français", "en", "Anglais", "de", "Allemand", "it", "Italien", "da", "Danois", "ar", "Arabe");

    private final ReservationOverviewFactory overviewFactory;
    private final UserRepository userRepository;
    private final EmailDispatchService dispatch;
    private final StaffBookingMailer mailer;

    /** Comma-separated; blank means every ADMIN account. Stays and activities (Dunes Insolites). */
    @Value("${app.mail.staff-booking-recipients:}")
    private String configuredRecipients = "";

    /** Comma-separated; blank means every ADMIN account. Circuits (Route Insolite). */
    @Value("${app.mail.staff-booking-recipients-circuits:}")
    private String configuredCircuitRecipients = "";

    @Value("${app.admin.url:https://admin.dunesinsolites.com}")
    private String adminUrl = "https://admin.dunesinsolites.com";

    /** Never throws. */
    public void notifyNewBooking(UUID reservationId, String correlationId) {
        announce(reservationId, correlationId, EmailType.STAFF_NEW_BOOKING, StaffBookingMailer.Kind.NEW);
    }

    /** Never throws. Called right after a site booking is confirmed, and by the backfill below. */
    public boolean notifyConfirmed(UUID reservationId, String correlationId) {
        return announce(reservationId, correlationId, EmailType.STAFF_RESERVATION_CONFIRMED, StaffBookingMailer.Kind.CONFIRMED);
    }

    /** Never throws. Called right after a site booking is cancelled. */
    public void notifyCancelled(UUID reservationId, String correlationId) {
        announce(reservationId, correlationId, EmailType.STAFF_RESERVATION_CANCELLED, StaffBookingMailer.Kind.CANCELLED);
    }

    /** True only when this call actually sent the mail (not already sent, not skipped, no failure). Never throws. */
    private boolean announce(UUID reservationId, String correlationId, EmailType emailType, StaffBookingMailer.Kind kind) {
        try {
            var facts = overviewFactory.staffFacts(reservationId);
            if (!VITRINE_SOURCE.equals(facts.sourceName())) return false;

            List<String> to = recipients(facts.reservationType());
            if (to.isEmpty()) {
                log.warn("{} for {} not announced to the team: no recipient (no ADMIN account and "
                        + "the relevant app.mail.staff-booking-recipients* property is empty)", kind, reservationId);
                return false;
            }

            var claim = dispatch.claim(reservationId, emailType,
                    to.size() == 1 ? to.get(0) : to.get(0) + " +" + (to.size() - 1), correlationId);
            if (claim.alreadySent()) return false;

            try {
                mailer.send(to, kind, facts.reservationType(), facts.overview(),
                        new StaffBookingMailer.Customer(facts.customerName(), facts.customerEmail(),
                                facts.customerPhone(), languageName(facts.locale())),
                        adminUrl.replaceAll("/+$", "") + "/reservations/" + reservationId);
                dispatch.markSent(claim.dispatchId());
                return true;
            } catch (RuntimeException sendFailure) {
                dispatch.markFailed(claim.dispatchId(), sendFailure.toString());
                throw sendFailure;
            }
        } catch (RuntimeException e) {
            log.error("could not announce {} for {} to the team: {}", kind, reservationId, e.getMessage());
            return false;
        }
    }

    /** A circuit (Route Insolite) and everything else (Dunes Insolites: stays, activities) use their own list. */
    List<String> recipients(ReservationType type) {
        return type == ReservationType.TOURS
                ? resolve(configuredCircuitRecipients)
                : resolve(configuredRecipients);
    }

    /** The stays/activities list, kept for the existing tests and callers that don't split by type. */
    List<String> recipients() {
        return resolve(configuredRecipients);
    }

    private List<String> resolve(String configured) {
        LinkedHashSet<String> out = new LinkedHashSet<>();
        Arrays.stream(configured == null ? new String[0] : configured.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).forEach(out::add);
        if (out.isEmpty()) {
            for (User admin : userRepository.findAllByRole(UserRole.ADMIN)) {
                String email = admin.getEmail();
                if (email != null && !email.isBlank() && !DeletedAccount.isEmail(email)) out.add(email.trim());
            }
        }
        return List.copyOf(out);
    }

    private static String languageName(String locale) {
        if (locale == null || locale.isBlank()) return null;
        String tag = locale.toLowerCase().split("[-_]")[0];
        return LANGUAGES.getOrDefault(tag, locale);
    }
}
