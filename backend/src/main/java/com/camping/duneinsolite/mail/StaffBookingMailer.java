package com.camping.duneinsolite.mail;

import com.camping.duneinsolite.exception.TransactionalEmailException;
import com.camping.duneinsolite.mail.MailLayout.Frame;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Currency;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import static com.camping.duneinsolite.mail.MailLayout.*;

/**
 * "You have received a booking" - the email the team gets when a guest books on the site:
 * what was booked, the reference, the date, who is coming and how to reach them, the price
 * and a button that opens the reservation in the backoffice. Always in French: it is for the
 * team, not the guest.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StaffBookingMailer {

    private static final Locale FR = Locale.FRENCH;

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@duneinsolite.com}")
    private String fromAddress = "noreply@duneinsolite.com";

    @Value("${app.frontend.url:https://www.dunes-insolites.com}")
    private String frontendUrl = "https://www.dunes-insolites.com";

    /** The person who booked, as they gave it on the form. */
    public record Customer(String name, String email, String phone, String language) {}

    public void send(List<String> to, ReservationOverview o, Customer customer, String reservationUrl) {
        String product = product(o);
        String date = o.arrival() == null ? "—" : longDate(o.arrival());
        String subject = "Nouvelle réservation : " + product + " · " + date + " · " + o.reference();
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to.toArray(String[]::new));
            helper.setSubject(subject);
            helper.setText(text(o, customer, reservationUrl), html(o, customer, reservationUrl));
            mailSender.send(message);
            log.info("new-booking email sent to {} team address(es) for {}", to.size(), o.reference());
        } catch (MessagingException | MailException e) {
            throw new TransactionalEmailException("new-booking email for " + o.reference() + " failed: " + e.getMessage(), e);
        }
    }

    // ── content ───────────────────────────────────────────────────

    String html(ReservationOverview o, Customer c, String reservationUrl) {
        StringBuilder rows = new StringBuilder();
        rows.append(row("Produit", strong(product(o))));
        rows.append(row("Référence", strong(o.reference())));
        rows.append(row("Date", strong(o.arrival() == null ? "—" : longDate(o.arrival()))));
        if (o.departure() != null) rows.append(row("Départ", esc(longDate(o.departure()))));
        rows.append(row("Participants", esc(participants(o))));

        StringBuilder who = new StringBuilder(strong(blank(c.name()) ? "—" : c.name()));
        if (!blank(c.email())) who.append("<br><a href=\"mailto:").append(esc(c.email())).append("\" style=\"color:")
                .append(EMBER).append(";\">").append(esc(c.email())).append("</a>");
        if (!blank(c.phone())) who.append("<br>Téléphone : <a href=\"tel:").append(esc(c.phone().replaceAll("\\s", "")))
                .append("\" style=\"color:").append(EMBER).append(";\">").append(esc(c.phone())).append("</a>");
        if (!blank(c.language())) who.append("<br>Langue : ").append(esc(c.language()));
        rows.append(row("Client principal", who.toString()));

        if (!o.extras().isEmpty()) {
            rows.append(row("Activités", esc(o.extras().stream()
                    .map(e -> e.name() + (blank(e.detail()) ? "" : " " + e.detail()))
                    .collect(Collectors.joining(", ")))));
        }
        rows.append(row("Prix", strong(money(o.total(), o.currency()))));

        String body = p(esc("Bonjour, vous avez reçu une nouvelle réservation depuis le site."))
                + panel(rows(rows.toString()))
                + button(reservationUrl, "Accéder à la réservation")
                + muted(esc("La demande est en attente : confirmez la disponibilité auprès du client."));
        return MailLayout.page(new Frame("fr", false, frontendUrl, "Dunes Insolites", "Nouvelle réservation",
                "Vous avez reçu une réservation", body, "Message automatique destiné à l’équipe."));
    }

    String text(ReservationOverview o, Customer c, String reservationUrl) {
        StringBuilder t = new StringBuilder("Vous avez reçu une nouvelle réservation depuis le site.\n\n");
        t.append("Produit : ").append(product(o)).append('\n');
        t.append("Référence : ").append(o.reference()).append('\n');
        t.append("Date : ").append(o.arrival() == null ? "—" : longDate(o.arrival())).append('\n');
        if (o.departure() != null) t.append("Départ : ").append(longDate(o.departure())).append('\n');
        t.append("Participants : ").append(participants(o)).append('\n');
        t.append("Client : ").append(blank(c.name()) ? "—" : c.name());
        if (!blank(c.email())) t.append(" <").append(c.email()).append('>');
        t.append('\n');
        if (!blank(c.phone())) t.append("Téléphone : ").append(c.phone()).append('\n');
        if (!blank(c.language())) t.append("Langue : ").append(c.language()).append('\n');
        t.append("Prix : ").append(money(o.total(), o.currency())).append("\n\n");
        t.append("Ouvrir la réservation : ").append(reservationUrl).append('\n');
        return t.toString();
    }

    static String product(ReservationOverview o) {
        String names = o.items().stream().map(ReservationOverview.Item::name)
                .filter(n -> n != null && !n.isBlank()).collect(Collectors.joining(" + "));
        return names.isBlank() ? "Réservation" : names;
    }

    static String participants(ReservationOverview o) {
        StringBuilder s = new StringBuilder();
        if (o.adults() > 0) s.append(o.adults()).append(o.adults() > 1 ? " adultes" : " adulte");
        if (o.children() > 0) s.append(s.length() > 0 ? " · " : "").append(o.children()).append(o.children() > 1 ? " enfants" : " enfant");
        if (o.infants() > 0) s.append(s.length() > 0 ? " · " : "").append(o.infants()).append(o.infants() > 1 ? " bébés" : " bébé");
        return s.length() == 0 ? "—" : s.toString();
    }

    private static String longDate(LocalDate d) {
        return d.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(FR));
    }

    static String money(BigDecimal amount, String currency) {
        NumberFormat f = NumberFormat.getCurrencyInstance(FR);
        try {
            f.setCurrency(Currency.getInstance(currency == null ? "EUR" : currency));
        } catch (IllegalArgumentException ignored) {
            // an unknown code keeps the default symbol
        }
        return f.format(amount == null ? BigDecimal.ZERO : amount).replace(' ', ' ').replace(' ', ' ');
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
