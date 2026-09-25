package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.mail.StaffBookingMailer;
import com.camping.duneinsolite.model.DeletedAccount;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.EmailType;
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
 * Tells the team by e-mail when a guest books on the site. Sent once per reservation
 * (idempotent through {@code email_dispatch}, so a redelivered message never mails twice)
 * and never allowed to fail the booking or the guest's own confirmation: every problem is
 * logged and swallowed.
 *
 * <p>Only bookings from the public site are announced. A booking the team enters itself in
 * the backoffice does not need an e-mail telling them about it.
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

    /** Comma-separated; blank means every ADMIN account. */
    @Value("${app.mail.staff-booking-recipients:}")
    private String configuredRecipients = "";

    @Value("${app.admin.url:https://admin.dunesinsolites.com}")
    private String adminUrl = "https://admin.dunesinsolites.com";

    /** Never throws. */
    public void notifyNewBooking(UUID reservationId, String correlationId) {
        try {
            var facts = overviewFactory.staffFacts(reservationId);
            if (!VITRINE_SOURCE.equals(facts.sourceName())) return;

            List<String> to = recipients();
            if (to.isEmpty()) {
                log.warn("new booking {} not announced to the team: no recipient (no ADMIN account and "
                        + "app.mail.staff-booking-recipients is empty)", reservationId);
                return;
            }

            var claim = dispatch.claim(reservationId, EmailType.STAFF_NEW_BOOKING,
                    to.size() == 1 ? to.get(0) : to.get(0) + " +" + (to.size() - 1), correlationId);
            if (claim.alreadySent()) return;

            try {
                mailer.send(to, facts.overview(),
                        new StaffBookingMailer.Customer(facts.customerName(), facts.customerEmail(),
                                facts.customerPhone(), languageName(facts.locale())),
                        adminUrl.replaceAll("/+$", "") + "/reservations/" + reservationId);
                dispatch.markSent(claim.dispatchId());
            } catch (RuntimeException sendFailure) {
                dispatch.markFailed(claim.dispatchId(), sendFailure.toString());
                throw sendFailure;
            }
        } catch (RuntimeException e) {
            log.error("could not announce new booking {} to the team: {}", reservationId, e.getMessage());
        }
    }

    List<String> recipients() {
        LinkedHashSet<String> out = new LinkedHashSet<>();
        Arrays.stream(configuredRecipients == null ? new String[0] : configuredRecipients.split(","))
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
