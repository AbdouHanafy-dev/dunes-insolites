package com.camping.duneinsolite.mail;

import com.camping.duneinsolite.exception.TransactionalEmailException;
import com.camping.duneinsolite.mail.MailLayout.Frame;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.List;
import java.util.Map;

import static com.camping.duneinsolite.mail.MailLayout.*;
import static com.camping.duneinsolite.observability.LogSanitizer.maskEmail;

/**
 * Every email that concerns a reservation, written in the language the client
 * booked in (Reservation.locale). One layout ({@link MailLayout}), copy from
 * {@link MailMessages}. Account and newsletter emails stay in EmailService.
 *
 * Three emails:
 *  - received   : "we got your request" - synchronous and throwing, because it
 *                 is driven by the RabbitMQ listener's retry/dead-letter
 *                 machinery (see ReservationEmailConsumer). Do not make async.
 *  - payment    : the confirmation, or a later payment request - what is due
 *                 now, by when, which methods, and the payment link if any.
 *  - received-payment: "we got your 40 TND, the rest is payable on site".
 * The two staff-triggered ones are @Async and only log on failure.
 *
 * Each can carry a {@link ReservationOverview}: the booking at a glance with a
 * price breakdown and what is paid / still due.
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
            LocalDate dueDate, String link, List<PayMethod> methods, String note,
            ReservationOverview overview) {

        public PaymentMail(String to, String name, String group, MailLocale locale, boolean confirmation,
                           PayKind kind, String currency, BigDecimal total, BigDecimal amountDue,
                           LocalDate dueDate, String link, List<PayMethod> methods, String note) {
            this(to, name, group, locale, confirmation, kind, currency, total, amountDue, dueDate, link, methods,
                    note, null);
        }
    }

    public record PaymentReceivedMail(
            String to, String name, String group, MailLocale locale, String currency,
            BigDecimal received, BigDecimal remaining, List<PayMethod> onSiteMethods,
            ReservationOverview overview) {

        public PaymentReceivedMail(String to, String name, String group, MailLocale locale, String currency,
                                   BigDecimal received, BigDecimal remaining, List<PayMethod> onSiteMethods) {
            this(to, name, group, locale, currency, received, remaining, onSiteMethods, null);
        }
    }

    private final JavaMailSender mailSender;
    private final MailMessages messages;

    @Value("${app.mail.from:noreply@duneinsolite.com}")
    private String fromAddress;

    @Value("${app.frontend.url:https://www.dunes-insolites.com}")
    private String frontendUrl = "https://www.dunes-insolites.com";

    // ── "We received your request" ────────────────────────────────

    public void sendReceived(String to, String name, MailLocale locale, LocalDate date,
                             BigDecimal total, String currency) {
        sendReceived(to, name, locale, date, total, currency, null);
    }

    public void sendReceived(String to, String name, MailLocale locale, LocalDate date,
                             BigDecimal total, String currency, ReservationOverview overview) {
        Map<String, String> v = Map.of("name", name == null ? "" : name);
        StringBuilder text = new StringBuilder();
        text.append(t(locale, "greeting", v)).append("\n\n").append(t(locale, "received.lead")).append("\n");

        StringBuilder body = new StringBuilder();
        body.append(p(t(locale, "greeting", escaped(v))));
        body.append(p(esc(t(locale, "received.lead"))));

        if (overview != null) {
            text.append("\n").append(overviewText(locale, overview));
            body.append(overviewHtml(locale, overview));
        } else {
            StringBuilder rows = new StringBuilder();
            if (date != null) {
                String d = longDate(date, locale);
                text.append("  ").append(t(locale, "received.date")).append(": ").append(d).append("\n");
                rows.append(row(t(locale, "received.date"), esc(d)));
            }
            if (total != null) {
                String amt = money(total, currency);
                text.append("  ").append(t(locale, "received.total")).append(": ").append(amt).append("\n");
                rows.append(row(t(locale, "received.total"), esc(amt)));
            }
            if (rows.length() > 0) body.append(panel(rows(rows.toString())));
        }
        text.append("\n").append(t(locale, "received.follow")).append("\n\n").append(signoffText(locale));
        body.append(p(esc(t(locale, "received.follow")))).append(signoffHtml(locale));

        try {
            deliver(to, t(locale, "received.subject"), text.toString(),
                    layout(locale, t(locale, "received.subtitle"), t(locale, "received.title"), body.toString()));
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

        StringBuilder text = new StringBuilder();
        text.append(t(l, "greeting", Map.of("name", m.name()))).append("\n\n")
                .append(lead).append("\n\n");
        if (m.overview() != null) text.append(overviewText(l, m.overview())).append("\n");
        text.append(terms).append("\n\n");
        if (!m.methods().isEmpty()) {
            text.append(t(l, "pay.methods.title")).append(":\n");
            m.methods().forEach(x -> text.append("  - ").append(t(l, x.key)).append("\n"));
            text.append("\n");
        }
        if (hasText(m.link())) text.append(t(l, "pay.link.plain")).append(" ").append(m.link()).append("\n\n");
        if (hasText(m.note())) text.append(m.note()).append("\n\n");
        text.append(signoffText(l));

        StringBuilder body = new StringBuilder();
        body.append(p(t(l, "greeting", escaped(Map.of("name", m.name())))));
        body.append(p(esc(lead)));
        if (m.overview() != null) body.append(overviewHtml(l, m.overview()));

        body.append(notice(esc(terms), EMBER));
        if (!m.methods().isEmpty()) {
            body.append(label(t(l, "pay.methods.title")));
            StringBuilder items = new StringBuilder();
            m.methods().forEach(x -> items.append("<li style=\"margin:0 0 4px;\">").append(esc(t(l, x.key))).append("</li>"));
            body.append("<ul style=\"margin:0 0 22px;padding-").append(l.isRtl() ? "right" : "left")
                    .append(":20px;font-family:").append(BODY).append(";font-size:14px;color:").append(INK)
                    .append(";line-height:1.7;\">").append(items).append("</ul>");
        }
        if (hasText(m.link())) body.append(button(m.link(), t(l, "pay.link.button")));
        if (hasText(m.note())) {
            body.append("<p style=\"margin:0 0 22px;font-family:").append(BODY).append(";font-size:13px;color:").append(MUTED)
                    .append(";line-height:1.6;white-space:pre-line;\">").append(esc(m.note())).append("</p>");
        }
        body.append(signoffHtml(l));

        try {
            deliver(m.to(), t(l, pre + ".subject"), text.toString(),
                    layout(l, t(l, pre + ".subtitle"), t(l, pre + ".title"), body.toString()));
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
        boolean settled = m.remaining().signum() <= 0;
        String follow;
        if (settled) follow = t(l, "payrcv.paid");
        else if (m.onSiteMethods().isEmpty()) follow = t(l, "payrcv.balance.nomethods", vars);
        else follow = t(l, "payrcv.balance", vars);

        String text = t(l, "greeting", Map.of("name", m.name())) + "\n\n" + lead + "\n\n"
                + (m.overview() != null ? overviewText(l, m.overview()) + "\n" : "")
                + follow + "\n\n" + signoffText(l);
        String body = p(t(l, "greeting", escaped(Map.of("name", m.name())))) + p(esc(lead))
                + (m.overview() != null ? overviewHtml(l, m.overview()) : "")
                + notice(esc(follow), settled ? TEAL : EMBER) + signoffHtml(l);

        try {
            deliver(m.to(), t(l, "payrcv.subject"), text,
                    layout(l, t(l, "payrcv.subtitle"), t(l, "payrcv.title"), body));
            log.info("✅ Payment-received email sent to: {}", maskEmail(m.to()));
        } catch (MessagingException | MailException e) {
            log.error("❌ Failed to send payment-received email to: {} — {}", maskEmail(m.to()), e.getMessage());
        }
    }

    // ── the booking overview ──────────────────────────────────────

    /** The booking at a glance: reference, dates, party, what was booked, price breakdown, paid / due. */
    String overviewHtml(MailLocale l, ReservationOverview o) {
        StringBuilder facts = new StringBuilder();
        if (hasText(o.reference())) facts.append(row(t(l, "ov.reference"), code(o.reference())));
        if (o.arrival() != null) facts.append(row(t(l, o.departure() != null ? "ov.arrival" : "ov.date"), esc(longDate(o.arrival(), l))));
        if (o.departure() != null) facts.append(row(t(l, "ov.departure"), esc(longDate(o.departure(), l))));
        facts.append(row(t(l, "ov.guests"), esc(guestsText(l, o))));

        StringBuilder out = new StringBuilder();
        out.append(label(t(l, "ov.title"))).append(panel(rows(facts.toString())));

        StringBuilder lines = new StringBuilder();
        for (ReservationOverview.Item it : o.items()) {
            lines.append(lineRow(it.name(), it.detail(), null, false));
        }
        if (o.mainAmount() != null && o.mainAmount().signum() > 0) {
            lines.append(lineRow(t(l, "ov.main"), null, money(o.mainAmount(), o.currency()), false));
        }
        for (ReservationOverview.Extra ex : o.extras()) {
            lines.append(lineRow(ex.name(), ex.detail(), money(ex.amount(), o.currency()), false));
        }
        if (lines.length() > 0) out.append(label(t(l, "ov.items"))).append(panel(rows(lines.toString())));

        StringBuilder sums = new StringBuilder();
        sums.append(lineRow(t(l, "ov.total"), null, money(o.total(), o.currency()), true));
        if (o.paid() != null && o.paid().signum() > 0) {
            sums.append(lineRow(t(l, "ov.paid"), null, "− " + money(o.paid(), o.currency()), false));
        }
        boolean settled = o.balance() != null && o.balance().signum() <= 0;
        sums.append(lineRow(t(l, "ov.balance"), null,
                settled ? t(l, "ov.settled") : money(o.balance(), o.currency()), true));
        out.append(panel(rows(sums.toString())));
        return out.toString();
    }

    String overviewText(MailLocale l, ReservationOverview o) {
        StringBuilder s = new StringBuilder();
        s.append(t(l, "ov.title")).append("\n");
        if (hasText(o.reference())) s.append("  ").append(t(l, "ov.reference")).append(": ").append(o.reference()).append("\n");
        if (o.arrival() != null) {
            s.append("  ").append(t(l, o.departure() != null ? "ov.arrival" : "ov.date")).append(": ")
                    .append(longDate(o.arrival(), l)).append("\n");
        }
        if (o.departure() != null) s.append("  ").append(t(l, "ov.departure")).append(": ").append(longDate(o.departure(), l)).append("\n");
        s.append("  ").append(t(l, "ov.guests")).append(": ").append(guestsText(l, o)).append("\n");
        for (ReservationOverview.Item it : o.items()) {
            s.append("  - ").append(it.name()).append(hasText(it.detail()) ? " (" + it.detail() + ")" : "").append("\n");
        }
        if (o.mainAmount() != null && o.mainAmount().signum() > 0) {
            s.append("  ").append(t(l, "ov.main")).append(": ").append(money(o.mainAmount(), o.currency())).append("\n");
        }
        for (ReservationOverview.Extra ex : o.extras()) {
            s.append("  ").append(ex.name()).append(hasText(ex.detail()) ? " (" + ex.detail() + ")" : "")
                    .append(": ").append(money(ex.amount(), o.currency())).append("\n");
        }
        s.append("  ").append(t(l, "ov.total")).append(": ").append(money(o.total(), o.currency())).append("\n");
        if (o.paid() != null && o.paid().signum() > 0) {
            s.append("  ").append(t(l, "ov.paid")).append(": ").append(money(o.paid(), o.currency())).append("\n");
        }
        boolean settled = o.balance() != null && o.balance().signum() <= 0;
        s.append("  ").append(t(l, "ov.balance")).append(": ")
                .append(settled ? t(l, "ov.settled") : money(o.balance(), o.currency())).append("\n");
        return s.toString();
    }

    private String guestsText(MailLocale l, ReservationOverview o) {
        StringBuilder g = new StringBuilder();
        if (o.adults() > 0) g.append(t(l, "ov.adults", Map.of("n", String.valueOf(o.adults()))));
        if (o.children() > 0) {
            if (g.length() > 0) g.append(" · ");
            g.append(t(l, "ov.children", Map.of("n", String.valueOf(o.children()))));
        }
        if (o.infants() > 0) {
            if (g.length() > 0) g.append(" · ");
            g.append(t(l, "ov.infants", Map.of("n", String.valueOf(o.infants()))));
        }
        return g.length() == 0 ? "—" : g.toString();
    }

    /** A name (with optional detail) on the left, an optional amount on the right; bold for totals. */
    private static String lineRow(String name, String detail, String amount, boolean bold) {
        String weight = bold ? "700" : "500";
        StringBuilder r = new StringBuilder("<tr><td style=\"padding:10px 12px 10px 0;border-bottom:1px solid ").append(LINE)
                .append(";font-family:").append(BODY).append(";font-size:14px;font-weight:").append(weight)
                .append(";color:").append(INK).append(";vertical-align:top;\">").append(esc(name));
        if (hasText(detail)) {
            r.append("<br><span style=\"font-size:12px;font-weight:400;color:").append(MUTED).append(";\">")
                    .append(esc(detail)).append("</span>");
        }
        r.append("</td><td align=\"right\" style=\"padding:10px 0;border-bottom:1px solid ").append(LINE)
                .append(";font-family:").append(BODY).append(";font-size:").append(bold ? "16" : "14")
                .append("px;font-weight:").append(weight).append(";color:").append(bold ? EMBER : INK)
                .append(";white-space:nowrap;vertical-align:top;\">").append(amount == null ? "" : esc(amount))
                .append("</td></tr>");
        return r.toString();
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

    private String signoffHtml(MailLocale l) {
        return "<p style=\"margin:8px 0 24px;font-family:" + BODY + ";font-size:15px;line-height:1.7;color:" + INK + ";\">"
                + esc(t(l, "regards")) + "<br><strong style=\"font-family:" + DISPLAY + ";font-weight:600;\">"
                + esc(t(l, "team")) + "</strong></p>";
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

    private static boolean hasText(String s) { return s != null && !s.isBlank(); }

    private static Map<String, String> escaped(Map<String, String> vars) {
        Map<String, String> out = new java.util.HashMap<>();
        vars.forEach((k, v) -> out.put(k, "<strong style=\"font-weight:600;\">" + esc(v == null ? "" : v) + "</strong>"));
        return out;
    }

    private String layout(MailLocale l, String eyebrow, String title, String bodyHtml) {
        return MailLayout.page(new Frame(l.tag(), l.isRtl(), frontendUrl, t(l, "brand"), eyebrow, title, bodyHtml,
                t(l, "footer")));
    }
}
