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
     * Sends the reservation-confirmed / payment-due email to the client who owns the
     * reservation. Fired once, right after the admin confirms and the proforma is
     * generated. dueDate may be null (no checkInDate/serviceDate) — the deadline line
     * is skipped in that case rather than showing a garbage date. paymentLink is optional.
     */
    @Async
    public void sendReservationConfirmedPaymentEmail(String to, String name, String groupName,
                                                       java.math.BigDecimal totalAmount, java.math.BigDecimal minPaymentAmount,
                                                       String currency, LocalDate dueDate, String paymentLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Réservation confirmée — Acompte requis");
            helper.setText(
                    buildPaymentPlainText(name, groupName, totalAmount, minPaymentAmount, currency, dueDate, paymentLink),
                    false);
            helper.setText(
                    buildPaymentHtml(name, groupName, totalAmount, minPaymentAmount, currency, dueDate, paymentLink),
                    true);

            mailSender.send(message);
            log.info("✅ Payment-reminder email sent to: {}", maskEmail(to));

        } catch (MessagingException e) {
            log.error("❌ Failed to send payment-reminder email to: {} — {}", maskEmail(to), e.getMessage());
        }
    }

    /**
     * Sent once, right after a guest or client submits a booking request
     * (DI-014) - a plain acknowledgement, not an invoice. This platform
     * confirms bookings as a manual staff step ("booking as request"), so
     * this deliberately promises nothing about timing or price finality.
     * date/total may be null (not every reservation type prices the same
     * way) - both are skipped from the email rather than shown blank.
     *
     * <p><b>Synchronous and it throws.</b> Unlike the account emails above,
     * this one is driven by a RabbitMQ listener ({@code ReservationEmailConsumer})
     * on a dedicated container factory with retry + dead-lettering. It must run
     * on the listener thread and propagate failure so the broker can retry and
     * ultimately dead-letter - the previous {@code @Async} + swallow meant the
     * message was acked before the send even ran, so a failure was lost with no
     * signal. Do not add {@code @Async} back.
     */
    public void sendReservationReceivedEmail(String to, String name, LocalDate date,
                                              java.math.BigDecimal total, String currency) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Nous avons bien reçu votre demande de réservation");
            helper.setText(buildReceivedPlainText(name, date, total, currency), false);
            helper.setText(buildReceivedHtml(name, date, total, currency), true);

            mailSender.send(message);
            log.info("✅ Reservation-received email sent to: {}", maskEmail(to));

        } catch (MessagingException | org.springframework.mail.MailException e) {
            // Propagate so the listener's retry/DLQ machinery engages. Caller
            // (ReservationEmailConsumer) records the failure on email_dispatch
            // before rethrowing.
            throw new com.camping.duneinsolite.exception.TransactionalEmailException(
                    "reservation-received email to " + to + " failed: " + e.getMessage(), e);
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
                                   padding:44px 40px;text-align:center;">
                          <h1 style="margin:0;color:#ffffff;font-size:30px;font-weight:700;
                                     letter-spacing:1px;">🏕️ Dune Insolite</h1>
                          <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">
                            C'est ouvert.
                          </p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:40px 40px 28px;text-align:center;">
                          <p style="margin:0 0 8px;font-size:20px;color:#111827;font-weight:600;">
                            L'aventure vous attend.
                          </p>
                          <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                            Merci de votre patience — le site est maintenant en ligne.
                            Réservez dès aujourd'hui votre séjour dans le désert de Sabria :
                            nuitées, camel trek, sandboard et bien plus.
                          </p>
                          <table width="100%%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center">
                                <a href="%s"
                                   style="display:inline-block;background:linear-gradient(135deg,#c8963e,#a07030);
                                          color:#ffffff;font-size:15px;font-weight:600;
                                          text-decoration:none;padding:16px 42px;
                                          border-radius:8px;letter-spacing:0.3px;">
                                  Découvrir Dune Insolite →
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
            """.formatted(frontendUrl);
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

    private String buildReceivedPlainText(String name, LocalDate date, java.math.BigDecimal total, String currency) {
        String dateLine = date != null
                ? "\n  Date demandée : " + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : "";
        String totalLine = total != null
                ? "\n  Montant estimé : " + "%.2f %s".formatted(total, currency)
                : "";

        return """
            Bonjour %s,

            Nous avons bien reçu votre demande de réservation.
            %s%s

            Notre équipe la confirmera sous peu et vous recontactera par email ou téléphone.

            Cordialement,
            L'équipe Dune Insolite
            """.formatted(name, dateLine, totalLine);
    }

    private String buildReceivedHtml(String name, LocalDate date, java.math.BigDecimal total, String currency) {
        String dateRow = date != null
                ? """
                  <tr>
                    <td style="font-size:13px;color:#9ca3af;font-weight:600;text-transform:uppercase;
                               letter-spacing:0.5px;padding-right:16px;">Date demandée</td>
                    <td style="font-size:15px;color:#111827;font-weight:500;">%s</td>
                  </tr>
                  """.formatted(date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                : "";
        String totalRow = total != null
                ? """
                  <tr>
                    <td style="font-size:13px;color:#9ca3af;font-weight:600;text-transform:uppercase;
                               letter-spacing:0.5px;padding-right:16px;">Montant estimé</td>
                    <td style="font-size:15px;color:#111827;font-weight:500;">%.2f %s</td>
                  </tr>
                  """.formatted(total, currency)
                : "";

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
                            Demande de réservation reçue
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:40px 40px 24px;">
                          <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                            Bonjour <strong>%s</strong>,
                          </p>
                          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                            Nous avons bien reçu votre demande de réservation. Notre équipe la
                            confirmera sous peu et vous recontactera par email ou téléphone.
                          </p>
                          <table width="100%%" cellpadding="0" cellspacing="0"
                                 style="background:#fef9f0;border:1px solid #f0d9a8;
                                        border-radius:8px;margin-bottom:8px;">
                            <tr>
                              <td style="padding:24px 28px;">
                                <table cellpadding="6" cellspacing="0">
                                  %s
                                  %s
                                </table>
                              </td>
                            </tr>
                          </table>
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
            """.formatted(name, dateRow, totalRow);
    }

    private String buildPaymentPlainText(String name, String groupName, java.math.BigDecimal totalAmount, java.math.BigDecimal minPaymentAmount,
                                          String currency, LocalDate dueDate, String paymentLink) {
        String deadlineLine = dueDate != null
                ? "avant le " + dueDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : "avant votre date d'arrivée";
        String linkLine = (paymentLink != null && !paymentLink.isBlank())
                ? "\nPayer en ligne : " + paymentLink + "\n"
                : "";

        return """
            Bonjour %s,

            Votre réservation pour le groupe "%s" a été confirmée.

            Un acompte minimum de 10%% du montant total est requis %s :

              Montant total       : %.2f %s
              Acompte minimum (10%%) : %.2f %s
            %s
            Cordialement,
            L'équipe Dune Insolite
            """.formatted(name, groupName, deadlineLine, totalAmount, currency, minPaymentAmount, currency, linkLine);
    }

    private String buildPaymentHtml(String name, String groupName, java.math.BigDecimal totalAmount, java.math.BigDecimal minPaymentAmount,
                                     String currency, LocalDate dueDate, String paymentLink) {
        String deadlineText = dueDate != null
                ? "avant le <strong>" + dueDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + "</strong>"
                : "avant votre date d'arrivée";

        String linkButton = (paymentLink != null && !paymentLink.isBlank())
                ? """
                  <table width="100%%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="%s"
                           style="display:inline-block;background:linear-gradient(135deg,#c8963e,#a07030);
                                  color:#ffffff;font-size:15px;font-weight:600;
                                  text-decoration:none;padding:14px 36px;
                                  border-radius:8px;letter-spacing:0.3px;">
                          Payer maintenant →
                        </a>
                      </td>
                    </tr>
                  </table>
                  """.formatted(paymentLink)
                : "";

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
                            Réservation confirmée
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
                            Votre réservation pour le groupe <strong>%s</strong> a été confirmée.
                            Un acompte minimum de <strong>10%%</strong> du montant total est requis %s.
                          </p>

                          <!-- Amount box -->
                          <table width="100%%" cellpadding="0" cellspacing="0"
                                 style="background:#fef9f0;border:1px solid #f0d9a8;
                                        border-radius:8px;margin-bottom:24px;">
                            <tr>
                              <td style="padding:24px 28px;">
                                <table cellpadding="6" cellspacing="0">
                                  <tr>
                                    <td style="font-size:13px;color:#9ca3af;font-weight:600;
                                               text-transform:uppercase;letter-spacing:0.5px;
                                               padding-right:16px;">Montant total</td>
                                    <td style="font-size:15px;color:#111827;font-weight:500;">%.2f %s</td>
                                  </tr>
                                  <tr>
                                    <td style="font-size:13px;color:#9ca3af;font-weight:600;
                                               text-transform:uppercase;letter-spacing:0.5px;
                                               padding-right:16px;">Acompte minimum (10%%)</td>
                                    <td>
                                      <code style="font-size:15px;color:#c8963e;font-weight:700;
                                                   background:#fff8ed;border:1px solid #f0d9a8;
                                                   padding:3px 10px;border-radius:4px;
                                                   letter-spacing:1px;">%.2f %s</code>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          %s
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
            """.formatted(name, groupName, deadlineText, totalAmount, currency, minPaymentAmount, currency, linkButton);
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