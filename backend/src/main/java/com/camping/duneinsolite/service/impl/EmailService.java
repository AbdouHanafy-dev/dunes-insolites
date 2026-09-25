package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.mail.MailLayout;
import com.camping.duneinsolite.mail.MailMessages;
import com.camping.duneinsolite.model.enums.MailLocale;
import jakarta.mail.MessagingException;
import static com.camping.duneinsolite.observability.LogSanitizer.maskEmail;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import static com.camping.duneinsolite.mail.MailLayout.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final MailMessages messages;

    @Value("${app.mail.from:noreply@duneinsolite.com}")
    private String fromAddress;

    @Value("${app.frontend.url:https://duneinsolite.com}")
    private String frontendUrl;

    // Where the vitrine's contact form actually lands. Defaults to the real,
    // already-documented business address (frontend/lib/site.ts's
    // site.email) rather than inventing a new one - overridable per
    // deployment via CONTACT_TO_EMAIL.
    @Value("${app.mail.contact-to:hello@dunes-insolites.tn}")
    private String contactToAddress;

    /**
     * Sends a welcome email with temporary password to a newly created user (admin flow).
     * Runs asynchronously so it never blocks the HTTP response.
     */
    @Async
    public void sendWelcomeEmail(String to, String name, String temporaryPassword) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Bienvenue sur Dunes Insolites — Vos identifiants de connexion");
            helper.setText(buildPlainText(name, to, temporaryPassword), false);
            helper.setText(buildHtml(name, to, temporaryPassword), true);

            mailSender.send(message);
            log.info("✅ Welcome email sent to: {}", maskEmail(to));

        } catch (MessagingException e) {
            // Log the error but do NOT crash the user-creation flow
            log.error("❌ Failed to send welcome email to: {} — {}", maskEmail(to), e.getMessage());
        }
    }

    /**
     * Sent right after self-registration (AccountActionServiceImpl). Does
     * not gate login — the frontend auto-logs a new account in immediately
     * (see AuthForm.tsx) — this is a trust-building confirmation, not an
     * access-control step. The link is single-use and expires in 24h; see
     * AccountActionToken's own doc comment.
     */
    @Async
    public void sendVerificationEmail(String to, String name, String verifyLink, MailLocale locale) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(messages.text(locale, "acct.verify.subject"));
            helper.setText(accountPlainText(locale, "verify", name, verifyLink), false);
            helper.setText(accountHtml(locale, "verify", name, verifyLink), true);

            mailSender.send(message);
            log.info("✅ Verification email sent to: {}", maskEmail(to));

        } catch (Exception e) {
            // Not just MessagingException - a real SMTP auth failure (found
            // live: this backend's Gmail app-password credential is empty
            // locally right now) surfaces as Spring's unchecked
            // MailAuthenticationException from mailSender.send() itself, not
            // from building the MimeMessage. Catching the narrower type
            // would let that escape this @Async method uncaught - harmless
            // (Spring's default async handler just logs it), but noisy, and
            // the whole point of this catch is "an email failure can never
            // be the caller's problem" - see the existing methods' own
            // comments for that same intent.
            log.error("❌ Failed to send verification email to: {} — {}", maskEmail(to), e.getMessage());
        }
    }

    /**
     * Sent on request from the "forgot password" form. The link is
     * single-use and expires in 1h — shorter than the verify-email link,
     * since redeeming it hands over the account outright.
     */
    @Async
    public void sendPasswordResetEmail(String to, String name, String resetLink, MailLocale locale) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(messages.text(locale, "acct.reset.subject"));
            helper.setText(accountPlainText(locale, "reset", name, resetLink), false);
            helper.setText(accountHtml(locale, "reset", name, resetLink), true);

            mailSender.send(message);
            log.info("✅ Password-reset email sent to: {}", maskEmail(to));

        } catch (Exception e) {
            // See sendVerificationEmail's comment on why this is Exception,
            // not MessagingException.
            log.error("❌ Failed to send password-reset email to: {} — {}", maskEmail(to), e.getMessage());
        }
    }

    /** Invitation for an admin-created chauffeur account; no password is ever emailed. */
    @Async
    public void sendDriverInvitationEmail(String to, String name, String setupLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Activez votre espace chauffeur — Dunes Insolites");
            helper.setText(buildDriverInvitePlainText(name, setupLink), false);
            helper.setText(buildDriverInviteHtml(name, setupLink), true);
            mailSender.send(message);
            log.info("✅ Driver invitation email sent to: {}", maskEmail(to));
        } catch (Exception e) {
            log.error("❌ Failed to send driver invitation to: {} — {}", maskEmail(to), e.getMessage());
        }
    }

    @Async
    public void sendGuestAccountInvitationEmail(String to, String name, String setupLink, MailLocale locale) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(messages.text(locale, "acct.guest.subject"));
            helper.setText(accountPlainText(locale, "guest", name, setupLink), false);
            helper.setText(accountHtml(locale, "guest", name, setupLink), true);
            mailSender.send(message);
            log.info("✅ Guest account invitation sent to: {}", maskEmail(to));
        } catch (Exception e) {
            log.error("❌ Failed to send guest account invitation to: {} — {}", maskEmail(to), e.getMessage());
        }
    }

    /**
     * The vitrine's contact form (ContactForm.tsx). Deliberately synchronous
     * (no @Async) and deliberately does not swallow the exception like every
     * other method in this class - found live (SEO/vitrine audit): the
     * previous behaviour, before this endpoint existed at all, was the
     * frontend's local route-handler stub validating the input and
     * returning success while the message went nowhere,
     * `// TODO: forward to the inbox / CRM.` The whole point of fixing that
     * is a visitor either really reaches the inbox or is told it failed -
     * a silently-swallowed send here would just move the same lie one
     * layer down. replyTo is set to the visitor's own address so replying
     * to the notification email reaches them directly.
     */
    public void sendContactMessage(String name, String fromEmail, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setReplyTo(fromEmail);
            helper.setTo(contactToAddress);
            helper.setSubject(
                    "[Contact] " + (subject == null || subject.isBlank() ? "New message from the website" : subject));
            helper.setText("""
                New message from the contact form on the website.

                Name: %s
                Email: %s

                %s
                """.formatted(name, fromEmail, body), buildContactHtml(name, fromEmail, subject, body));

            mailSender.send(message);
            log.info("✅ Contact message from {} forwarded to {}", maskEmail(fromEmail), maskEmail(contactToAddress));

        } catch (Exception e) {
            log.error("❌ Failed to forward contact message from: {} — {}", maskEmail(fromEmail), e.getMessage());
            throw new com.camping.duneinsolite.exception.EmailDeliveryException(
                    "Failed to send contact message", e);
        }
    }

    /**
     * The admin's one-click "the site is ready" send, triggered from the
     * newsletter subscribers list once the launch countdown (see
     * MaintenanceWindow's "/*" site-wide window) is actually lifted. Every
     * subscriber only ever gets this once — see
     * NewsletterServiceImpl.sendLaunchAnnouncementToAll and
     * NewsletterSubscriber.launchEmailSentAt.
     *
     * <p><b>Deliberately synchronous, unlike every other method here, and
     * throws rather than swallows.</b> Found live: the caller used to mark
     * a subscriber as sent the moment this was merely triggered, not once
     * it actually succeeded — a bad SMTP credential silently "sent" the
     * announcement to nobody and permanently skipped them (the whole point
     * of launchEmailSentAt is to never re-send, so a false-positive mark
     * can't self-heal). The caller now marks sent only after this returns
     * without throwing.
     */
    public void sendLaunchAnnouncementEmail(String to) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromAddress);
        helper.setTo(to);
        helper.setSubject("C'est ouvert — l'aventure Dunes Insolites vous attend");
        helper.setText(buildLaunchPlainText(), false);
        helper.setText(buildLaunchHtml(), true);

        mailSender.send(message);
        log.info("✅ Launch announcement sent to: {}", maskEmail(to));
    }

    // ── Bodies ────────────────────────────────────────────────────
    // Every HTML email goes through MailLayout (brand header, footer, fonts,
    // colours). Account emails are French, like the account screens.

    private static final String AUTO_NOTE = "Cet email a été envoyé automatiquement — merci de ne pas y répondre.";

    private String page(String eyebrow, String title, String bodyHtml, String footerNote) {
        return MailLayout.page(new MailLayout.Frame("fr", false, frontendUrl, "Dunes Insolites", eyebrow, title,
                bodyHtml, footerNote));
    }

    private static String hello(String name) {
        return p("Bonjour " + strong(name) + ",");
    }

    private static String signoff() {
        return "<p style=\"margin:8px 0 24px;font-family:" + BODY + ";font-size:15px;line-height:1.7;color:"
                + INK + ";\">Cordialement,<br><strong style=\"font-family:" + DISPLAY
                + ";font-weight:600;\">L'équipe Dunes Insolites</strong></p>";
    }

    private String buildLaunchPlainText() {
        return """
            Bonjour,

            C'est officiel : le site Dunes Insolites est ouvert.

            Réservez dès maintenant votre séjour dans le désert de Sabria :

              %s

            À très vite dans les dunes,
            L'équipe Dunes Insolites
            """.formatted(frontendUrl);
    }

    private String buildLaunchHtml() {
        String body = "<img src=\"" + esc(frontendUrl) + "/images/camp-hero-poster.jpg\" width=\"540\" alt=\"\" "
                + "style=\"display:block;width:100%;max-width:540px;height:auto;border:0;border-radius:12px;margin:0 0 22px;\">"
                + p("Merci de votre patience — le site est maintenant en ligne. Réservez dès aujourd'hui votre séjour "
                + "dans le désert de Sabria : nuitées, camel trek, sandboard et bien plus.")
                + button(frontendUrl, "Découvrir Dunes Insolites →")
                + signoff();
        return page("Le site est ouvert", "C'est ouvert.", body,
                "Vous recevez cet email car vous vous êtes inscrit(e) pour être averti(e) de l'ouverture du site.");
    }

    private String buildDriverInvitePlainText(String name, String link) {
        return """
            Bonjour %s,

            Dunes Insolites vous invite à accéder à votre espace chauffeur.
            Choisissez votre mot de passe avec ce lien personnel, valable 24 heures :

              %s

            Ce lien est à usage unique. Si vous ne connaissez pas Dunes Insolites,
            ignorez simplement cet email.

            Cordialement,
            L'équipe Dunes Insolites
            """.formatted(name, link);
    }

    private String buildDriverInviteHtml(String name, String link) {
        String body = hello(name)
                + p("Dunes Insolites vous invite à accéder à votre espace chauffeur. Choisissez votre mot de passe avec "
                + "le lien personnel ci-dessous, valable 24 heures.")
                + button(link, "Activer mon compte →")
                + muted("Ce lien est à usage unique. Si vous ne connaissez pas Dunes Insolites, ignorez cet email.")
                + signoff();
        return page("Espace chauffeur", "Activez votre espace chauffeur", body, AUTO_NOTE);
    }

    /** Verify-email, password-reset and guest-setup emails, in the language of the site the user was on. */
    private String accountPlainText(MailLocale l, String kind, String name, String link) {
        return messages.text(l, "greeting", java.util.Map.of("name", name == null ? "" : name)) + "\n\n"
                + messages.text(l, "acct." + kind + ".lead") + "\n\n  " + link + "\n\n"
                + messages.text(l, "acct." + kind + ".ignore") + "\n\n"
                + messages.text(l, "regards") + "\n" + messages.text(l, "team") + "\n";
    }

    private String accountHtml(MailLocale l, String kind, String name, String link) {
        String hello = p(esc(messages.text(l, "greeting")).replace("{name}", strong(name == null ? "" : name)));
        String body = hello
                + p(esc(messages.text(l, "acct." + kind + ".lead")))
                + button(link, messages.text(l, "acct." + kind + ".button"))
                + muted(esc(messages.text(l, "acct." + kind + ".ignore")))
                + "<p style=\"margin:8px 0 24px;font-family:" + BODY + ";font-size:15px;line-height:1.7;color:" + INK + ";\">"
                + esc(messages.text(l, "regards")) + "<br><strong style=\"font-family:" + DISPLAY + ";font-weight:600;\">"
                + esc(messages.text(l, "team")) + "</strong></p>";
        return MailLayout.page(new MailLayout.Frame(l.tag(), l.isRtl(), frontendUrl, messages.text(l, "brand"),
                messages.text(l, "acct." + kind + ".eyebrow"), messages.text(l, "acct." + kind + ".title"), body,
                messages.text(l, "footer")));
    }

    private String buildContactHtml(String name, String fromEmail, String subject, String message) {
        String body = p("Un visiteur vient d'écrire depuis le formulaire de contact du site. Répondre à cet email "
                + "l'atteint directement.")
                + panel(rows(row("Nom", esc(name))
                + row("Email", "<a href=\"mailto:" + esc(fromEmail) + "\" style=\"color:" + EMBER
                + ";text-decoration:none;\">" + esc(fromEmail) + "</a>")
                + row("Sujet", esc(subject == null || subject.isBlank() ? "—" : subject))))
                + label("Message")
                + "<p style=\"margin:0 0 22px;font-family:" + BODY + ";font-size:15px;line-height:1.7;color:"
                + INK + ";white-space:pre-line;\">" + esc(message) + "</p>";
        return page("Formulaire de contact", "Nouveau message du site", body, null);
    }

    // ── Plain-text fallback ───────────────────────────────────────

    private String buildPlainText(String name, String email, String password) {
        return """
            Bonjour %s,

            Votre compte a été créé avec succès sur Dunes Insolites.

            Vos identifiants de connexion :

              Email          : %s
              Mot de passe   : %s

            Pour des raisons de sécurité, veuillez changer votre mot de passe
            dès votre première connexion.

            Se connecter : %s/login

            Cordialement,
            L'équipe Dunes Insolites
            """.formatted(name, email, password, frontendUrl);
    }

    // ── HTML email ────────────────────────────────────────────────

    private String buildHtml(String name, String email, String password) {
        String body = hello(name)
                + p("Votre compte a été créé avec succès par l'administrateur. Voici vos identifiants de connexion temporaires :")
                + panel(rows(row("Email", esc(email)) + row("Mot de passe", code(password))))
                + notice("<strong>Important :</strong> ce mot de passe est temporaire. Veuillez le changer dès votre "
                + "première connexion pour sécuriser votre compte.", AMBER)
                + button(frontendUrl + "/login", "Se connecter →")
                + signoff();
        return page("Espace partenaire", "Bienvenue dans votre espace", body, AUTO_NOTE);
    }
}
