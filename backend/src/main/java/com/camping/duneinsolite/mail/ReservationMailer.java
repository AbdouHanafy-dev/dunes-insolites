package com.camping.duneinsolite.mail;

import com.camping.duneinsolite.exception.TransactionalEmailException;
import com.camping.duneinsolite.model.enums.MailLocale;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.List;
import java.util.Map;

import static com.camping.duneinsolite.observability.LogSanitizer.maskEmail;

/**
 * Every email that concerns a reservation, written in the language the client
 * booked in (Reservation.locale). One layout, copy from {@link MailMessages}.
 * Account and newsletter emails stay in EmailService.
 *
 * Three emails:
 *  - received   : "we got your request" - synchronous and throwing, because it
 *                 is driven by the RabbitMQ listener's retry/dead-letter
 *                 machinery (see ReservationEmailConsumer). Do not make async.
 *  - payment    : the confirmation, or a later payment request - what is due
 *                 now, by when, which methods, and the payment link if any.
 *  - received-payment: "we got your 40 TND, the rest is payable on site".
 * The two staff-triggered ones are @Async and only log on failure.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationMailer {

    public enum PayKind { NONE, DEPOSIT, FULL }

    public enum PayMethod {
        ONLINE("method.online"), TRANSFER("method.transfer"), CARD("method.card"),
        CASH("method.cash"), CHEQUE("method.cheque");

        final String key;
        PayMethod(String key) { this.key = key; }
    }

    /** A confirmation (confirmation=true) or a payment request (false). */
    public record PaymentMail(
            String to, String name, String group, MailLocale locale, boolean confirmation,
            PayKind kind, String currency, BigDecimal total, BigDecimal amountDue,
            LocalDate dueDate, String link, List<PayMethod> methods, String note) {}

    public record PaymentReceivedMail(
            String to, String name, String group, MailLocale locale, String currency,
            BigDecimal received, BigDecimal remaining, List<PayMethod> onSiteMethods) {}

    private final JavaMailSender mailSender;
    private final MailMessages messages;

    @Value("${app.mail.from:noreply@duneinsolite.com}")
    private String fromAddress;

    // ── "We received your request" ────────────────────────────────

    public void sendReceived(String to, String name, MailLocale locale, LocalDate date,
                             BigDecimal total, String currency) {
        Map<String, String> v = Map.of("name", name == null ? "" : name);
        StringBuilder text = new StringBuilder();
        text.append(t(locale, "greeting", v)).append("\n\n").append(t(locale, "received.lead")).append("\n");
        StringBuilder rows = new StringBuilder();
        if (date != null) {
            String d = longDate(date, locale);
            text.append("  ").append(t(locale, "received.date")).append(": ").append(d).append("\n");
            rows.append(row(t(locale, "received.date"), d));
        }
        if (total != null) {
            String amt = money(total, currency);
            text.append("  ").append(t(locale, "received.total")).append(": ").append(amt).append("\n");
            rows.append(row(t(locale, "received.total"), amt));
        }
        text.append("\n").append(t(locale, "received.follow")).append("\n\n").append(signoffText(locale));

        String body = p(t(locale, "greeting", escaped(v)))
                + p(esc(t(locale, "received.lead")))
                + (rows.length() > 0 ? box("<table cellpadding=\"6\" cellspacing=\"0\">" + rows + "</table>") : "")
                + p(esc(t(locale, "received.follow")));

        try {
            deliver(to, t(locale, "received.subject"), text.toString(),
                    layout(locale, t(locale, "received.subtitle"), body));
            log.info("✅ Reservation-received email sent to: {}", maskEmail(to));
        } catch (MessagingException | MailException e) {
            throw new TransactionalEmailException(
                    "reservation-received email to " + to + " failed: " + e.getMessage(), e);
        }
    }

    // ── Confirmation / payment request ────────────────────────────

    @Async
    public void sendPayment(PaymentMail m) {
        MailLocale l = m.locale();
        String pre = m.confirmation() ? "pay.confirm" : "pay.request";
        Map<String, String> group = Map.of("group", m.group());

        String lead = t(l, pre + ".lead", group);
        String terms = terms(m);
        String methods = methodsText(l, m.methods());

        StringBuilder text = new StringBuilder();
        text.append(t(l, "greeting", Map.of("name", m.name()))).append("\n\n")
                .append(lead).append("\n\n").append(terms).append("\n\n");
        if (!m.methods().isEmpty()) {
            text.append(t(l, "pay.methods.title")).append(":\n");
            m.methods().forEach(x -> text.append("  - ").append(t(l, x.key)).append("\n"));
            text.append("\n");
        }
        if (hasLink(m.link())) text.append(t(l, "pay.link.plain")).append(" ").append(m.link()).append("\n\n");
        if (hasText(m.note())) text.append(m.note()).append("\n\n");
        text.append(signoffText(l));

        StringBuilder body = new StringBuilder();
        body.append(p(t(l, "greeting", escaped(Map.of("name", m.name())))));
        body.append(p(esc(lead) + " " + esc(terms)));
        if (!m.methods().isEmpty()) {
            body.append("<p style=\"margin:0 0 8px;font-size:13px;color:#9ca3af;font-weight:600;")
                    .append("text-transform:uppercase;letter-spacing:0.5px;\">")
                    .append(esc(t(l, "pay.methods.title"))).append("</p>")
                    .append("<ul style=\"margin:0 0 24px;padding-").append(l.isRtl() ? "right" : "left")
                    .append(":20px;font-size:15px;color:#374151;line-height:1.7;\">");
            m.methods().forEach(x -> body.append("<li>").append(esc(t(l, x.key))).append("</li>"));
            body.append("</ul>");
        }
        if (hasLink(m.link())) body.append(button(m.link(), t(l, "pay.link.button")));
        if (hasText(m.note())) {
            body.append("<p style=\"margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;white-space:pre-line;\">")
                    .append(esc(m.note())).append("</p>");
        }

        try {
            deliver(m.to(), t(l, pre + ".subject"), text.toString(), layout(l, t(l, pre + ".subtitle"), body.toString()));
            log.info("✅ Payment email ({}) sent to: {}", m.confirmation() ? "confirmation" : "request", maskEmail(m.to()));
        } catch (MessagingException | MailException e) {
            log.error("❌ Failed to send payment email to: {} — {}", maskEmail(m.to()), e.getMessage());
        }
    }

    private String terms(PaymentMail m) {
        MailLocale l = m.locale();
        String deadline = m.dueDate() != null
                ? t(l, "pay.deadline.date", Map.of("date", longDate(m.dueDate(), l)))
                : t(l, "pay.deadline.arrival");
        return switch (m.kind()) {
            case NONE -> t(l, "pay.none");
            case FULL -> t(l, "pay.full", Map.of("amount", money(m.amountDue(), m.currency()), "deadline", deadline));
            case DEPOSIT -> t(l, "pay.deposit", Map.of(
                    "amount", money(m.amountDue(), m.currency()),
                    "total", money(m.total(), m.currency()),
                    "deadline", deadline));
        };
    }

    // ── "We received your payment" ────────────────────────────────

    @Async
    public void sendPaymentReceived(PaymentReceivedMail m) {
        MailLocale l = m.locale();
        Map<String, String> vars = Map.of(
                "received", money(m.received(), m.currency()),
                "remaining", money(m.remaining(), m.currency()),
                "group", m.group(),
                "methods", methodsText(l, m.onSiteMethods()));

        String lead = t(l, "payrcv.lead", vars);
        String follow;
        if (m.remaining().signum() <= 0) follow = t(l, "payrcv.paid");
        else if (m.onSiteMethods().isEmpty()) follow = t(l, "payrcv.balance.nomethods", vars);
        else follow = t(l, "payrcv.balance", vars);

        String text = t(l, "greeting", Map.of("name", m.name())) + "\n\n" + lead + "\n\n" + follow + "\n\n" + signoffText(l);
        String body = p(t(l, "greeting", escaped(Map.of("name", m.name())))) + p(esc(lead)) + p(esc(follow));

        try {
            deliver(m.to(), t(l, "payrcv.subject"), text, layout(l, t(l, "payrcv.subtitle"), body));
            log.info("✅ Payment-received email sent to: {}", maskEmail(m.to()));
        } catch (MessagingException | MailException e) {
            log.error("❌ Failed to send payment-received email to: {} — {}", maskEmail(m.to()), e.getMessage());
        }
    }

    // ── plumbing ──────────────────────────────────────────────────

    private void deliver(String to, String subject, String plain, String html) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromAddress);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(plain, html);
        mailSender.send(message);
    }

    private String t(MailLocale l, String key) {
        return messages.text(l, key);
    }

    private String t(MailLocale l, String key, Map<String, String> vars) {
        return messages.text(l, key, vars);
    }

    private String signoffText(MailLocale l) {
        return t(l, "regards") + "\n" + t(l, "team") + "\n";
    }

    private String methodsText(MailLocale l, List<PayMethod> methods) {
        return String.join(", ", methods.stream().map(x -> t(l, x.key)).toList());
    }

    static String money(BigDecimal amount, String currency) {
        BigDecimal a = amount.stripTrailingZeros();
        if (a.scale() < 0) a = a.setScale(0);
        return a.toPlainString() + " " + ("EUR".equals(currency) ? "€" : currency);
    }

    static String longDate(LocalDate date, MailLocale l) {
        return date.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(l.javaLocale()));
    }

    private static boolean hasLink(String s) { return s != null && !s.isBlank(); }
    private static boolean hasText(String s) { return s != null && !s.isBlank(); }

    private static String esc(String s) { return HtmlUtils.htmlEscape(s); }

    private static Map<String, String> escaped(Map<String, String> vars) {
        Map<String, String> out = new java.util.HashMap<>();
        vars.forEach((k, v) -> out.put(k, "<strong>" + esc(v == null ? "" : v) + "</strong>"));
        return out;
    }

    private static String p(String html) {
        return "<p style=\"margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;\">" + html + "</p>";
    }

    private static String box(String inner) {
        return "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fef9f0;"
                + "border:1px solid #f0d9a8;border-radius:8px;margin-bottom:24px;\"><tr><td style=\"padding:20px 24px;\">"
                + inner + "</td></tr></table>";
    }

    private static String row(String label, String value) {
        return "<tr><td style=\"font-size:13px;color:#9ca3af;font-weight:600;text-transform:uppercase;"
                + "letter-spacing:0.5px;padding-right:16px;padding-left:16px;\">" + esc(label) + "</td>"
                + "<td style=\"font-size:15px;color:#111827;font-weight:500;\">" + esc(value) + "</td></tr>";
    }

    /** Only http(s) links reach an href (the service validates on save; this is the last line). */
    private static String button(String link, String label) {
        String l = link.trim();
        if (!(l.startsWith("https://") || l.startsWith("http://"))) return "";
        return "<p style=\"text-align:center;margin:0 0 24px;\"><a href=\"" + esc(l) + "\" "
                + "style=\"display:inline-block;background:#c8963e;color:#ffffff;font-size:15px;font-weight:600;"
                + "text-decoration:none;padding:14px 36px;border-radius:8px;\">" + esc(label) + "</a></p>";
    }

    private String layout(MailLocale l, String subtitle, String bodyHtml) {
        String dir = l.isRtl() ? "rtl" : "ltr";
        String align = l.isRtl() ? "right" : "left";
        return "<!DOCTYPE html><html lang=\"" + l.tag() + "\" dir=\"" + dir + "\"><head><meta charset=\"UTF-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head>"
                + "<body style=\"margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;\">"
                + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f4f4f5;padding:40px 0;\">"
                + "<tr><td align=\"center\"><table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);\">"
                + "<tr><td style=\"background:linear-gradient(135deg,#c8963e,#a07030);padding:32px 40px;text-align:center;\">"
                + "<h1 style=\"margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:1px;\">"
                + esc(t(l, "brand")) + "</h1>"
                + "<p style=\"margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;\">" + esc(subtitle) + "</p>"
                + "</td></tr><tr><td style=\"padding:36px 40px 16px;text-align:" + align + ";direction:" + dir + ";\">"
                + bodyHtml
                + "<p style=\"margin:8px 0 0;font-size:15px;color:#4b5563;line-height:1.6;\">"
                + esc(t(l, "regards")) + "<br>" + esc(t(l, "team")) + "</p>"
                + "</td></tr><tr><td style=\"padding:20px 40px 32px;border-top:1px solid #f3f4f6;text-align:center;\">"
                + "<p style=\"margin:0;font-size:13px;color:#9ca3af;line-height:1.6;\">" + esc(t(l, "footer")) + "</p>"
                + "</td></tr></table></td></tr></table></body></html>";
    }
}
