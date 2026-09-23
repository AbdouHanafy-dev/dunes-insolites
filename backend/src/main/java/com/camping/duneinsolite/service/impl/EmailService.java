package com.camping.duneinsolite.service.impl;

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

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

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
            helper.setSubject("Bienvenue sur Dune Insolite — Vos identifiants de connexion");
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
    public void sendVerificationEmail(String to, String name, String verifyLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Confirmez votre adresse email — Dune Insolite");
            helper.setText(buildVerifyPlainText(name, verifyLink), false);
            helper.setText(buildVerifyHtml(name, verifyLink), true);

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
    public void sendPasswordResetEmail(String to, String name, String resetLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Réinitialisez votre mot de passe — Dune Insolite");
            helper.setText(buildResetPlainText(name, resetLink), false);
            helper.setText(buildResetHtml(name, resetLink), true);

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
            helper.setSubject("Activez votre espace chauffeur — Dune Insolite");
            helper.setText(buildDriverInvitePlainText(name, setupLink), false);
            helper.setText(buildDriverInviteHtml(name, setupLink), true);
            mailSender.send(message);
            log.info("✅ Driver invitation email sent to: {}", maskEmail(to));
        } catch (Exception e) {
            log.error("❌ Failed to send driver invitation to: {} — {}", maskEmail(to), e.getMessage());
        }
    }

    @Async
    public void sendGuestAccountInvitationEmail(String to, String name, String setupLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Configurez votre compte — Dune Insolite");
            helper.setText("Bonjour " + name + ",\n\n"
                    + "Nous avons reçu votre demande de réservation et créé un espace client pour son suivi. "
                    + "Choisissez votre mot de passe avec ce lien sécurisé à usage unique, valable 24 heures :\n"
                    + setupLink + "\n\nSi vous n'êtes pas à l'origine de cette demande, contactez-nous.", false);
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
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

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
                """.formatted(name, fromEmail, body));

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
        helper.setSubject("C'est ouvert — l'aventure Dune Insolite vous attend");
        helper.setText(buildLaunchPlainText(), false);
        helper.setText(buildLaunchHtml(), true);

        mailSender.send(message);
        log.info("✅ Launch announcement sent to: {}", maskEmail(to));
    }

    private String buildLaunchPlainText() {
        return """
            Bonjour,

            C'est officiel : le site Dune Insolite est ouvert.

            Réservez dès maintenant votre séjour dans le désert de Sabria :

              %s

            À très vite dans les dunes,
            L'équipe Dune Insolite
            """.formatted(frontendUrl);
    }

    private String buildLaunchHtml() {
        // Real brand mark (frontend/public/logo-mark.png, the same file
        // the site's own header/footer use) instead of an emoji stand-in,
        // plus the real hero photo as a banner - on request, a "pro,
        // modern" look rather than the flat gradient-header template
        // shared with the transactional emails. Both are absolute URLs
        // off frontendUrl since an email client fetches them cold, with
        // no app origin to resolve a relative path against.
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background:#eeece7;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#eeece7;padding:32px 16px;">
                <tr>
                  <td align="center">
                    <table width="560" cellpadding="0" cellspacing="0"
                           style="width:560px;max-width:100%%;background:#ffffff;border-radius:18px;overflow:hidden;
                                  box-shadow:0 10px 40px rgba(20,14,10,0.12);">

                      <!-- Hero photo -->
                      <tr>
                        <td>
                          <img src="%s/images/camp-hero-poster.jpg" width="560" alt=""
                               style="display:block;width:100%%;height:200px;object-fit:cover;border:0;">
                        </td>
                      </tr>

                      <!-- Brand mark -->
                      <tr>
                        <td style="padding:36px 40px 0;text-align:center;">
                          <img src="%s/logo-mark.png" width="52" height="52" alt="Dune Insolite"
                               style="display:inline-block;border-radius:50%%;border:0;">
                          <p style="margin:14px 0 0;font-size:11px;font-weight:700;letter-spacing:0.16em;
                                    text-transform:uppercase;color:#a07030;">
                            Dune Insolite · Southern Tunisia
                          </p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:18px 40px 8px;text-align:center;">
                          <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#1a1410;letter-spacing:-0.01em;">
                            C'est ouvert.
                          </h1>
                          <p style="margin:0 0 30px;font-size:15px;color:#5b544c;line-height:1.65;">
                            Merci de votre patience — le site est maintenant en ligne.
                            Réservez dès aujourd'hui votre séjour dans le désert de Sabria :
                            nuitées, camel trek, sandboard et bien plus.
                          </p>
                          <table width="100%%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center">
                                <a href="%s"
                                   style="display:inline-block;background:#a04a2f;
                                          color:#ffffff;font-size:15px;font-weight:600;
                                          text-decoration:none;padding:15px 40px;
                                          border-radius:999px;letter-spacing:0.2px;
                                          box-shadow:0 8px 20px rgba(160,74,47,0.35);">
                                  Découvrir Dune Insolite →
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="padding:32px 40px 32px;">
                          <table width="100%%" cellpadding="0" cellspacing="0">
                            <tr><td style="border-top:1px solid #ece8e2;font-size:0;line-height:0;">&nbsp;</td></tr>
                          </table>
                          <p style="margin:20px 0 0;font-size:12px;color:#a29d94;line-height:1.6;text-align:center;">
                            Vous recevez cet email car vous vous êtes inscrit(e) pour être
                            averti(e) de l'ouverture du site.<br>
                            © 2026 Dune Insolite. Tous droits réservés.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(frontendUrl, frontendUrl, frontendUrl);
    }

    private String buildVerifyPlainText(String name, String link) {
        return """
            Bonjour %s,

            Merci de vous être inscrit sur Dune Insolite. Confirmez votre adresse
            email en ouvrant ce lien (valable 24h) :

              %s

            Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.

            Cordialement,
            L'équipe Dune Insolite
            """.formatted(name, link);
    }

    private String buildVerifyHtml(String name, String link) {
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                           style="background:#ffffff;border-radius:12px;overflow:hidden;
                                  box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                      <tr>
                        <td style="background:linear-gradient(135deg,#c8963e,#a07030);
                                   padding:36px 40px;text-align:center;">
                          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;
                                     letter-spacing:1px;">🏕️ Dune Insolite</h1>
                          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                            Confirmez votre adresse email
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:40px 40px 28px;">
                          <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                            Bonjour <strong>%s</strong>,
                          </p>
                          <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                            Merci de vous être inscrit. Confirmez votre adresse email en
                            cliquant sur le bouton ci-dessous — le lien est valable 24 heures.
                          </p>
                          <table width="100%%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center">
                                <a href="%s"
                                   style="display:inline-block;background:linear-gradient(135deg,#c8963e,#a07030);
                                          color:#ffffff;font-size:15px;font-weight:600;
                                          text-decoration:none;padding:14px 36px;
                                          border-radius:8px;letter-spacing:0.3px;">
                                  Confirmer mon email →
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
                            Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:24px 40px 36px;border-top:1px solid #f3f4f6;
                                   text-align:center;">
                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            Cet email a été envoyé automatiquement — merci de ne pas y répondre.<br>
                            © 2025 Dune Insolite. Tous droits réservés.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(name, link);
    }

    private String buildResetPlainText(String name, String link) {
        return """
            Bonjour %s,

            Une réinitialisation de mot de passe a été demandée pour votre compte.
            Ouvrez ce lien pour choisir un nouveau mot de passe (valable 1 heure) :

              %s

            Si vous n'êtes pas à l'origine de cette demande, ignorez cet email —
            votre mot de passe actuel reste inchangé.

            Cordialement,
            L'équipe Dune Insolite
            """.formatted(name, link);
    }

    private String buildDriverInvitePlainText(String name, String link) {
        return """
            Bonjour %s,

            Dune Insolite vous invite à accéder à votre espace chauffeur.
            Choisissez votre mot de passe avec ce lien personnel, valable 24 heures :

              %s

            Ce lien est à usage unique. Si vous ne connaissez pas Dune Insolite,
            ignorez simplement cet email.

            Cordialement,
            L'équipe Dune Insolite
            """.formatted(name, link);
    }

    private String buildDriverInviteHtml(String name, String link) {
        return """
            <!DOCTYPE html>
            <html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:40px;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
                <div style="background:#a07030;padding:32px;text-align:center;color:#fff"><h1 style="margin:0">Dune Insolite</h1><p>Espace chauffeur</p></div>
                <div style="padding:36px;color:#374151"><p>Bonjour <strong>%s</strong>,</p><p>Dune Insolite vous invite à accéder à votre espace chauffeur. Choisissez votre mot de passe avec le lien personnel ci-dessous, valable 24 heures.</p>
                  <p style="text-align:center;margin:28px"><a href="%s" style="display:inline-block;background:#a07030;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600">Activer mon compte →</a></p>
                  <p style="font-size:13px;color:#9ca3af">Ce lien est à usage unique. Si vous ne connaissez pas Dune Insolite, ignorez cet email.</p>
                </div>
              </div>
            </body></html>
            """.formatted(name, link);
    }

    private String buildResetHtml(String name, String link) {
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                           style="background:#ffffff;border-radius:12px;overflow:hidden;
                                  box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                      <tr>
                        <td style="background:linear-gradient(135deg,#c8963e,#a07030);
                                   padding:36px 40px;text-align:center;">
                          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;
                                     letter-spacing:1px;">🏕️ Dune Insolite</h1>
                          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                            Réinitialisation du mot de passe
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:40px 40px 28px;">
                          <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                            Bonjour <strong>%s</strong>,
                          </p>
                          <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                            Une réinitialisation de mot de passe a été demandée pour votre
                            compte. Cliquez ci-dessous pour choisir un nouveau mot de passe —
                            le lien est valable 1 heure.
                          </p>
                          <table width="100%%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center">
                                <a href="%s"
                                   style="display:inline-block;background:linear-gradient(135deg,#c8963e,#a07030);
                                          color:#ffffff;font-size:15px;font-weight:600;
                                          text-decoration:none;padding:14px 36px;
                                          border-radius:8px;letter-spacing:0.3px;">
                                  Choisir un nouveau mot de passe →
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
                            Si vous n'êtes pas à l'origine de cette demande, ignorez cet email —
                            votre mot de passe actuel reste inchangé.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:24px 40px 36px;border-top:1px solid #f3f4f6;
                                   text-align:center;">
                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            Cet email a été envoyé automatiquement — merci de ne pas y répondre.<br>
                            © 2025 Dune Insolite. Tous droits réservés.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(name, link);
    }

    // ── Plain-text fallback ───────────────────────────────────────

    private String buildPlainText(String name, String email, String password) {
        return """
            Bonjour %s,

            Votre compte a été créé avec succès sur Dune Insolite.

            Vos identifiants de connexion :

              Email          : %s
              Mot de passe   : %s

            ⚠️ Pour des raisons de sécurité, veuillez changer votre mot de passe
            dès votre première connexion.

            Se connecter : %s/login

            Cordialement,
            L'équipe Dune Insolite
            """.formatted(name, email, password, frontendUrl);
    }

    // ── HTML email ────────────────────────────────────────────────

    private String buildHtml(String name, String email, String password) {
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                           style="background:#ffffff;border-radius:12px;overflow:hidden;
                                  box-shadow:0 2px 12px rgba(0,0,0,0.08);">

                      <!-- Header -->
                      <tr>
                        <td style="background:linear-gradient(135deg,#c8963e,#a07030);
                                   padding:36px 40px;text-align:center;">
                          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;
                                     letter-spacing:1px;">🏕️ Dune Insolite</h1>
                          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                            Bienvenue dans votre espace partenaire
                          </p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:40px 40px 24px;">
                          <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                            Bonjour <strong>%s</strong>,
                          </p>
                          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                            Votre compte a été créé avec succès par l'administrateur.
                            Voici vos identifiants de connexion temporaires :
                          </p>

                          <!-- Credentials box -->
                          <table width="100%%" cellpadding="0" cellspacing="0"
                                 style="background:#fef9f0;border:1px solid #f0d9a8;
                                        border-radius:8px;margin-bottom:24px;">
                            <tr>
                              <td style="padding:24px 28px;">
                                <table cellpadding="6" cellspacing="0">
                                  <tr>
                                    <td style="font-size:13px;color:#9ca3af;font-weight:600;
                                               text-transform:uppercase;letter-spacing:0.5px;
                                               padding-right:16px;">Email</td>
                                    <td style="font-size:15px;color:#111827;font-weight:500;">%s</td>
                                  </tr>
                                  <tr>
                                    <td style="font-size:13px;color:#9ca3af;font-weight:600;
                                               text-transform:uppercase;letter-spacing:0.5px;
                                               padding-right:16px;">Mot de passe</td>
                                    <td>
                                      <code style="font-size:15px;color:#c8963e;font-weight:700;
                                                   background:#fff8ed;border:1px solid #f0d9a8;
                                                   padding:3px 10px;border-radius:4px;
                                                   letter-spacing:1px;">%s</code>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          <!-- Warning -->
                          <table width="100%%" cellpadding="0" cellspacing="0"
                                 style="background:#fff7ed;border-left:4px solid #f59e0b;
                                        border-radius:4px;margin-bottom:28px;">
                            <tr>
                              <td style="padding:14px 18px;font-size:14px;color:#92400e;line-height:1.5;">
                                ⚠️ <strong>Important :</strong> Ce mot de passe est temporaire.
                                Veuillez le changer dès votre première connexion pour sécuriser votre compte.
                              </td>
                            </tr>
                          </table>

                          <!-- CTA button -->
                          <table width="100%%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center">
                                <a href="%s/login"
                                   style="display:inline-block;background:linear-gradient(135deg,#c8963e,#a07030);
                                          color:#ffffff;font-size:15px;font-weight:600;
                                          text-decoration:none;padding:14px 36px;
                                          border-radius:8px;letter-spacing:0.3px;">
                                  Se connecter →
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="padding:24px 40px 36px;border-top:1px solid #f3f4f6;
                                   text-align:center;">
                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            Cet email a été envoyé automatiquement — merci de ne pas y répondre.<br>
                            © 2025 Dune Insolite. Tous droits réservés.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(name, email, password, frontendUrl);
    }
}
