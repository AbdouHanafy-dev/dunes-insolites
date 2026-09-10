package com.camping.duneinsolite.service.impl;

import static com.camping.duneinsolite.observability.LogSanitizer.maskEmail;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.Currency;
import com.camping.duneinsolite.repository.InvoiceRepository;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceEmailService {

    private final InvoiceRepository invoiceRepository;
    private final JavaMailSender    mailSender;

    @Value("${app.mail.from:noreply@duneinsolite.com}")
    private String fromAddress;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final String LOGO_DUNES = "https://www.dunes-insolites.com/wp-content/uploads/2024/05/Campement-Dunes-insolites-logo.png";
    private static final String LOGO_ROUTE = "https://route-insolite.com/wp-content/uploads/2023/09/Route_insolite_Djerba__1_-removebg-preview.png";

    // Cache logos/stamps as base64 so we only load them once per JVM start
    private final Map<String, String> imageCache = new ConcurrentHashMap<>();

    // ── Public async entry points ─────────────────────────────────

    @Async
    @Transactional(readOnly = true)
    public void sendProformaByEmail(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        String clientEmail = invoice.getUser().getEmail();
        String clientName  = invoice.getUser().getName();
        if (clientEmail == null || clientEmail.isBlank()) {
            log.warn("No email for invoice {}, skipping.", invoiceId);
            return;
        }
        try {
            List<ItemRow> items = buildItemRows(invoice);
            // Same formula buildPageHtml uses internally, so the total shown in the
            // email body always matches the total shown in the attached PDF exactly.
            java.math.BigDecimal total = com.camping.duneinsolite.money.Money.sum(items.stream().map(ItemRow::totalTtc).toList());

            byte[] pdf     = generatePdf(buildPageHtml(invoice, false, items));
            String subject = "Proforma " + invoice.getInvoiceNumber() + " — Rappel de paiement";
            String body    = buildEmailBody(clientName, invoice.getInvoiceNumber(), false,
                    total, com.camping.duneinsolite.money.Money.nz(invoice.getPaidAmount()), invoice.getCurrency());

            send(clientEmail, subject, body, pdf, "Proforma_" + invoice.getInvoiceNumber() + ".pdf");
            log.info("Proforma email sent to {} for {}", maskEmail(clientEmail), invoice.getInvoiceNumber());
        } catch (Exception e) {
            log.error("Failed to send proforma email for {}: {}", invoiceId, e.getMessage(), e);
        }
    }

    @Async
    @Transactional(readOnly = true)
    public void sendFactureByEmail(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        String clientEmail = invoice.getUser().getEmail();
        String clientName  = invoice.getUser().getName();
        if (clientEmail == null || clientEmail.isBlank()) {
            log.warn("No email for invoice {}, skipping.", invoiceId);
            return;
        }
        try {
            List<ItemRow> items = buildItemRows(invoice);
            // Same formula buildPageHtml uses internally, so the total shown in the
            // email body always matches the total shown in the attached PDF exactly.
            java.math.BigDecimal totalHt  = com.camping.duneinsolite.money.Money.sum(items.stream().map(ItemRow::totalHt).toList());
            java.math.BigDecimal totalTva = com.camping.duneinsolite.money.Money.sum(items.stream().map(r -> com.camping.duneinsolite.money.Money.subtract(r.totalTtc(), r.totalHt())).toList());
            java.math.BigDecimal timbre   = com.camping.duneinsolite.money.Money.nz(invoice.getTimbreFiscal());
            java.math.BigDecimal ttc      = com.camping.duneinsolite.money.Money.add(totalHt, totalTva, timbre);
            java.math.BigDecimal paid     = com.camping.duneinsolite.money.Money.nz(invoice.getPaidAmount());

            byte[] pdf     = generatePdf(buildPageHtml(invoice, true, items));
            String subject = "Facture " + invoice.getInvoiceNumber() + " — Rappel de paiement";
            String body    = buildEmailBody(clientName, invoice.getInvoiceNumber(), true, ttc, paid, invoice.getCurrency());

            send(clientEmail, subject, body, pdf, "Facture_" + invoice.getInvoiceNumber() + ".pdf");
            log.info("Facture email sent to {} for {}", maskEmail(clientEmail), invoice.getInvoiceNumber());
        } catch (Exception e) {
            log.error("Failed to send facture email for {}: {}", invoiceId, e.getMessage(), e);
        }
    }

    // ── PDF generation ────────────────────────────────────────────

    private byte[] generatePdf(String html) throws Exception {
        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.toStream(os);
            builder.run();
            return os.toByteArray();
        }
    }

    // ── Main HTML builder ─────────────────────────────────────────

    private String buildPageHtml(Invoice inv, boolean isFacture, List<ItemRow> items) {
        String logoSrc   = logoDataUri(inv.getCompanyType() == CompanyType.ROUTE_INSOLITE ? LOGO_ROUTE : LOGO_DUNES);
        String stampSrc  = stampDataUri(inv.getCompanyType());
        String cur       = currencyLabel(inv.getCurrency() != null ? inv.getCurrency().name() : "TND");

        // Totals are recomputed from the same item rows shown in the table below —
        // exactly what the in-app facture/proforma modal does — instead of trusting
        // the invoice's own stored totals, so the numbers on screen never diverge
        // from the numbers in the table above them.
        java.math.BigDecimal totalHt  = com.camping.duneinsolite.money.Money.sum(items.stream().map(ItemRow::totalHt).toList());
        java.math.BigDecimal totalTva = com.camping.duneinsolite.money.Money.sum(items.stream().map(r -> com.camping.duneinsolite.money.Money.subtract(r.totalTtc(), r.totalHt())).toList());
        java.math.BigDecimal timbre   = isFacture ? com.camping.duneinsolite.money.Money.nz(inv.getTimbreFiscal()) : com.camping.duneinsolite.money.Money.ZERO;
        java.math.BigDecimal ttc       = isFacture
                ? com.camping.duneinsolite.money.Money.add(totalHt, totalTva, timbre)
                : com.camping.duneinsolite.money.Money.sum(items.stream().map(ItemRow::totalTtc).toList());

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\"/>")
          .append("<style>")
          .append("@page{size:A4 portrait;margin:14mm 15mm;}")
          .append("*{box-sizing:border-box;}")
          .append("body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;margin:0;padding:0;}")
          .append("p{margin:0;padding:0;}")
          .append("</style></head><body>");

        // ── Company header ────────────────────────────────────────
        sb.append("<table width=\"100%\" style=\"margin-bottom:16px;\" cellpadding=\"0\" cellspacing=\"0\"><tr>");
        // Logo cell
        if (!logoSrc.isEmpty()) {
            sb.append("<td style=\"width:105px;vertical-align:top;\">")
              .append("<img src=\"").append(logoSrc).append("\" ")
              .append("style=\"width:100px;height:100px;object-fit:contain;\"/>")
              .append("</td>");
        }
        // Company details cell
        sb.append("<td style=\"vertical-align:top;padding-left:12px;\">");
        if (inv.getCompanyType() == CompanyType.ROUTE_INSOLITE) {
            sb.append("<p style=\"font-size:14px;font-weight:700;margin-bottom:3px;\">Route Insolite</p>")
              .append("<p style=\"font-size:11px;color:#475569;margin-bottom:2px;\">Boulevard 11 janvier, Rond-Point Fatou, Houmet Souk Djerba, 4180</p>")
              .append("<p style=\"font-size:11px;color:#475569;margin-bottom:2px;\">RIB : TN59 25081000000896143 70</p>")
              .append("<p style=\"font-size:11px;color:#475569;margin-bottom:2px;\">T&#233;l : +216 50 655 844</p>")
              .append("<p style=\"font-size:11px;color:#475569;\">contact@route-insolite.com</p>");
        } else {
            sb.append("<p style=\"font-size:14px;font-weight:700;margin-bottom:3px;\">Campement Dunes Insolites</p>")
              .append("<p style=\"font-size:11px;color:#475569;margin-bottom:2px;\">Sabria, El Faouar &#8211; K&#233;ibili</p>")
              .append("<p style=\"font-size:11px;color:#475569;margin-bottom:2px;\">M.F : 1710104/R &#8211; RIB : TN59 25081000000896143 70</p>")
              .append("<p style=\"font-size:11px;color:#475569;margin-bottom:2px;\">T&#233;l : 75 461 016 &#8211; GSM : 27 391 501</p>")
              .append("<p style=\"font-size:11px;color:#475569;\">dunesinsolites@gmail.com</p>");
        }
        sb.append("</td>");
        // Date cell
        sb.append("<td style=\"text-align:right;vertical-align:top;font-size:12px;\">")
          .append("<strong>Date :</strong> ").append(LocalDate.now().format(DATE_FMT))
          .append("</td></tr></table>");

        // ── Invoice title ─────────────────────────────────────────
        String titleText = isFacture
                ? "FACTURE N&#176; " + esc(inv.getInvoiceNumber().toUpperCase())
                : "PROFORMA N&#176; " + esc(inv.getInvoiceNumber().toUpperCase());
        sb.append("<h1 style=\"text-align:center;font-size:20px;font-weight:700;margin:18px 0;letter-spacing:0.02em;\">")
          .append(titleText).append("</h1>");

        // ── Client block (right-aligned via wrapper table) ────────
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:16px;\"><tr>")
          .append("<td style=\"width:50%;\"></td>")
          .append("<td style=\"width:50%;\">");
        sb.append("<table cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;border:1px solid #e2e8f0;border-radius:6px;\">")
          .append("<tr><td style=\"padding:10px 16px;text-align:right;font-size:12px;line-height:1.9;\">");
        sb.append("<strong>Client :</strong> ").append(esc(safeStr(inv.getUser().getName()))).append("<br/>");
        if (notBlank(inv.getUser().getAgencyAddress())) {
            sb.append("<strong>Adresse :</strong> ").append(esc(inv.getUser().getAgencyAddress())).append("<br/>");
        }
        if (notBlank(inv.getUser().getMatriculeFiscal())) {
            sb.append("<strong>M.F :</strong> ").append(esc(inv.getUser().getMatriculeFiscal())).append("<br/>");
        }
        sb.append("<strong>T&#233;l :</strong> ").append(esc(safeStr(inv.getUser().getPhone()))).append("<br/>");
        if (notBlank(inv.getUser().getEmail())) {
            sb.append("<strong>Email :</strong> ").append(esc(inv.getUser().getEmail())).append("<br/>");
        }
        sb.append("</td></tr></table>");
        sb.append("</td></tr></table>");

        // ── Items table ───────────────────────────────────────────
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:14px;border-collapse:collapse;\">")
          .append("<thead><tr style=\"background:#fef3c7;\">")
          .append("<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:left;width:100px;\">DATE</th>")
          .append("<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:left;\">D&#201;SIGNATION</th>")
          .append("<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;width:50px;\">QT&#201;</th>");
        if (isFacture) {
            sb.append("<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;width:110px;\">PRIX HT</th>")
              .append("<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;width:60px;\">TVA %</th>")
              .append("<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;width:110px;\">TOTAL HT</th>");
        } else {
            sb.append("<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;width:120px;\">PRIX TTC</th>")
              .append("<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;width:120px;\">TOTAL TTC</th>");
        }
        sb.append("</tr></thead><tbody>");
        for (ItemRow row : items) {
            sb.append("<tr>")
              .append("<td style=\"padding:8px 10px;border:1px solid #e5e7eb;\">").append(esc(row.date())).append("</td>")
              .append("<td style=\"padding:8px 10px;border:1px solid #e5e7eb;\">").append(esc(row.description())).append("</td>")
              .append("<td style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;\">").append(row.quantity()).append("</td>");
            if (isFacture) {
                sb.append("<td style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;\">").append(fmt(row.unitPriceHt())).append(" ").append(cur).append("</td>")
                  .append("<td style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;\">").append(fmtPct(row.tva())).append(" %</td>")
                  .append("<td style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;\">").append(fmt(row.totalHt())).append(" ").append(cur).append("</td>");
            } else {
                java.math.BigDecimal unitTtc = com.camping.duneinsolite.money.Money.round(row.unitPriceHt().multiply(java.math.BigDecimal.ONE.add(row.tva().movePointLeft(2))));
                sb.append("<td style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;\">").append(fmt(unitTtc)).append(" ").append(cur).append("</td>")
                  .append("<td style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:center;\">").append(fmt(row.totalTtc())).append(" ").append(cur).append("</td>");
            }
            sb.append("</tr>");
        }
        sb.append("</tbody></table>");

        // ── Totals + signature/cachet — one right-aligned block ───
        // (matches the in-app modal: totals table with the cachet stacked directly
        // under it, both right-aligned; the arrêté line comes after, full-width)
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:16px;\"><tr>")
          .append("<td style=\"width:46%;\"></td>")
          .append("<td style=\"width:54%;\">");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;\">");
        if (isFacture) {
            sb.append(totalRow("Total HT",     fmt(totalHt)  + " " + cur, false, false))
              .append(totalRow("Total TVA",    fmt(totalTva) + " " + cur, false, false))
              .append(totalRow("Timbre fiscal", fmt(timbre)  + " " + cur, false, false))
              .append(totalRow("Total TTC",    fmt(ttc)      + " " + cur, true,  false));
        } else {
            sb.append(totalRow("Total TTC",    fmt(ttc)       + " " + cur, true,  false));
        }
        sb.append("</table>");
        sb.append("<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:10px;\"><tr><td style=\"text-align:center;\">")
          .append("<p style=\"font-size:10px;color:#64748b;font-style:italic;margin-bottom:6px;\">Signature &amp; Cachet</p>");
        if (!stampSrc.isEmpty()) {
            sb.append("<img src=\"").append(stampSrc).append("\" style=\"width:160px;max-height:160px;object-fit:contain;\"/>");
        }
        sb.append("</td></tr></table>");
        sb.append("</td></tr></table>");

        // ── Arrêté (facture only) — full width, below the totals+cachet block ──
        if (isFacture) {
            java.math.BigDecimal ttcRounded = com.camping.duneinsolite.money.Money.round(ttc);
            long dinars   = ttcRounded.longValue();
            long millimes = ttcRounded.remainder(java.math.BigDecimal.ONE).movePointRight(3).abs().longValue();
            sb.append("<p style=\"font-size:11px;color:#1e293b;margin-bottom:16px;\">")
              .append("ARRETE LA PRESENTE FACTURE A LA SOMME DE : ")
              .append(dinars).append(" DINARS ET ").append(String.format("%03d", millimes))
              .append(" MILLIMES</p>");
        }

        // ── Footer ────────────────────────────────────────────────
        sb.append("<hr style=\"border:none;border-top:1px solid #e5e7eb;margin:8px 0;\"/>")
          .append("<p style=\"text-align:center;font-size:10px;color:#94a3b8;margin:0;\">")
          .append(footerText(inv.getCompanyType()))
          .append("</p>");

        sb.append("</body></html>");
        return sb.toString();
    }

    private String totalRow(String label, String value, boolean bold, boolean green) {
        boolean isTtc = label.contains("TTC");
        String fontSize = isTtc ? "15px" : "12px";
        String labelStyle = "padding:8px 14px;border:1px solid #e5e7eb;font-size:" + fontSize + ";" + (bold ? "font-weight:700;" : "");
        String valueStyle = "padding:8px 14px;border:1px solid #e5e7eb;text-align:right;font-size:" + fontSize + ";"
                + (bold  ? "font-weight:700;" : "")
                + (green ? "color:#10b981;"   : "");
        String bg = label.contains("Reste") ? "background:#f0fdf4;" : (bold && !green ? "background:#f9fafb;" : "");
        return "<tr style=\"" + bg + "\"><td style=\"" + labelStyle + "\">" + label
                + "</td><td style=\"" + valueStyle + "\">" + value + "</td></tr>";
    }

    // ── Logo: download + cache as base64 ─────────────────────────

    private String logoDataUri(String url) {
        return imageCache.computeIfAbsent(url, u -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(u).openConnection();
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0");
                byte[] bytes = conn.getInputStream().readAllBytes();
                String mime = Optional.ofNullable(conn.getContentType())
                        .map(ct -> ct.split(";")[0].trim()).orElse("image/png");
                return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(bytes);
            } catch (Exception e) {
                log.warn("Could not load logo from {}: {}", u, e.getMessage());
                return "";
            }
        });
    }

    // ── Stamp/signature: bundled backend asset, embedded as base64 ───────────────
    // (unlike the logos, these aren't publicly hosted anywhere, so they're shipped
    // as a backend resource rather than fetched over HTTP)

    private String stampDataUri(CompanyType companyType) {
        String filename = companyType == CompanyType.ROUTE_INSOLITE ? "CachetRouteinsolite.png" : "TomponDunes.png";
        return imageCache.computeIfAbsent("stamp:" + filename, key -> {
            try {
                byte[] bytes = new ClassPathResource("static/stamps/" + filename).getInputStream().readAllBytes();
                return "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes);
            } catch (Exception e) {
                log.warn("Could not load stamp {}: {}", filename, e.getMessage());
                return "";
            }
        });
    }

    // ── Email HTML body ───────────────────────────────────────────

    private String buildEmailBody(String clientName, String invoiceNumber,
                                  boolean isFacture, java.math.BigDecimal total, java.math.BigDecimal paid, Currency currency) {
        java.math.BigDecimal remaining = com.camping.duneinsolite.money.Money.subtract(total, paid);
        String typeLabel = isFacture ? "facture" : "proforma";
        String cur = currencyLabel(currency != null ? currency.name() : "TND");
        return "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\"/></head>"
                + "<body style=\"margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;\">"
                + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f4f4f5;padding:36px 0;\">"
                + "<tr><td align=\"center\">"
                + "<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);\">"
                + "<tr><td style=\"background:linear-gradient(135deg,#c8963e,#a07030);padding:32px 40px;text-align:center;\">"
                + "<h1 style=\"margin:0;color:#ffffff;font-size:24px;font-weight:700;\">&#127956;&#65039; Dunes Insolites</h1>"
                + "<p style=\"margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;\">Rappel de paiement</p>"
                + "</td></tr>"
                + "<tr><td style=\"padding:36px 40px 24px;\">"
                + "<p style=\"margin:0 0 14px;font-size:15px;color:#374151;\">Bonjour <strong>" + esc(safeStr(clientName)) + "</strong>,</p>"
                + "<p style=\"margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;\">Veuillez trouver ci-joint votre " + typeLabel
                + " <strong>" + esc(invoiceNumber) + "</strong>.<br/>Nous vous rappelons qu&#8217;un solde reste &#224; r&#233;gler.</p>"
                + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fef9f0;border:1px solid #f0d9a8;border-radius:8px;margin-bottom:24px;\">"
                + "<tr><td style=\"padding:20px 24px;\">"
                + "<table width=\"100%\" cellpadding=\"6\" cellspacing=\"0\">"
                + "<tr><td style=\"font-size:13px;color:#9ca3af;font-weight:600;\">Total</td>"
                + "<td style=\"font-size:14px;color:#111827;font-weight:500;text-align:right;\">" + fmt(total) + " " + cur + "</td></tr>"
                + "<tr><td style=\"font-size:13px;color:#9ca3af;font-weight:600;\">D&#233;j&#224; r&#233;gl&#233;</td>"
                + "<td style=\"font-size:14px;color:#10b981;font-weight:600;text-align:right;\">" + fmt(paid) + " " + cur + "</td></tr>"
                + "<tr><td style=\"font-size:13px;color:#9ca3af;font-weight:600;\">Reste &#224; payer</td>"
                + "<td style=\"font-size:16px;color:#dc2626;font-weight:700;text-align:right;\">" + fmt(remaining) + " " + cur + "</td></tr>"
                + "</table></td></tr></table>"
                + "<p style=\"margin:0;font-size:13px;color:#6b7280;line-height:1.6;\">Pour toute question, n&#8217;h&#233;sitez pas &#224; nous contacter.<br/>Merci de votre confiance.</p>"
                + "</td></tr>"
                + "<tr><td style=\"padding:20px 40px 32px;border-top:1px solid #f3f4f6;text-align:center;\">"
                + "<p style=\"margin:0;font-size:12px;color:#9ca3af;line-height:1.6;\">Cet email a &#233;t&#233; envoy&#233; automatiquement &#8212; merci de ne pas y r&#233;pondre.<br/>&#169; 2026 Dunes Insolites. Tous droits r&#233;serv&#233;s.</p>"
                + "</td></tr>"
                + "</table></td></tr></table></body></html>";
    }

    // ── Mail sender ───────────────────────────────────────────────

    private void send(String to, String subject, String htmlBody, byte[] pdfBytes, String filename)
            throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromAddress);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);
        helper.addAttachment(filename, new ByteArrayDataSource(pdfBytes, "application/pdf"));
        mailSender.send(message);
    }

    // ── Item rows — built from the invoice's own persisted InvoiceItem rows, the
    // same source of truth the in-app facture/proforma modals read from, so the
    // emailed PDF always matches exactly (correct per-line TVA, adult/child split,
    // activity dates — not a re-derivation from the reservation). ─────────────────

    private List<ItemRow> buildItemRows(Invoice invoice) {
        return invoice.getItems().stream()
                .sorted(Comparator.comparing(i -> i.getLineNumber() != null ? i.getLineNumber() : 0))
                .map(i -> {
                    java.math.BigDecimal tva         = com.camping.duneinsolite.money.Money.nz(i.getTva());
                    java.math.BigDecimal unitPriceHt = com.camping.duneinsolite.money.Money.nz(i.getUnitPrice());
                    int    qty         = i.getQuantity() != null ? i.getQuantity() : 0;
                    java.math.BigDecimal totalHt     = com.camping.duneinsolite.money.Money.multiply(unitPriceHt, qty);
                    java.math.BigDecimal totalTtc    = com.camping.duneinsolite.money.Money.round(totalHt.multiply(java.math.BigDecimal.ONE.add(tva.movePointLeft(2))));
                    return new ItemRow(
                            formatItemDate(i.getActivityDate(), i.getActivityEndDate()),
                            i.getDescription(), qty, unitPriceHt, tva, totalHt, totalTtc);
                })
                .toList();
    }

    private String formatItemDate(LocalDate start, LocalDate end) {
        if (start == null) return "—";
        if (end != null) return "du " + DATE_FMT.format(start) + " au " + DATE_FMT.format(end);
        return DATE_FMT.format(start);
    }

    private static java.math.BigDecimal r2(java.math.BigDecimal v) { return com.camping.duneinsolite.money.Money.round(v); }

    // ── Helpers ───────────────────────────────────────────────────

    private String footerText(CompanyType type) {
        if (type == CompanyType.ROUTE_INSOLITE)
            return "ROUTE INSOLITE - BOULEVARD 11 JANVIER, ROND-POINT FATOU, HOUMET SOUK DJERBA, 4180 - TEL : +216 50 655 844"
                    + "<br/><span style=\"white-space:nowrap;\">EMAIL : contact@route-insolite.com</span>";
        return "DUNES INSOLITES - EL FAOUAR 4264 KEBILI TUNISIE - TEL/FAX : 75 461 016 - GSM : 27 391 501"
                + "<br/><span style=\"white-space:nowrap;\">EMAIL : dunesinsolites@gmail.com</span>";
    }

    private String fmt(java.math.BigDecimal v)               { return String.format("%.3f", com.camping.duneinsolite.money.Money.nz(v)); }
    private String fmtPct(java.math.BigDecimal v)            { java.math.BigDecimal x = com.camping.duneinsolite.money.Money.nz(v); return x.stripTrailingZeros().scale() <= 0 ? String.valueOf(x.longValue()) : x.stripTrailingZeros().toPlainString(); }
    private boolean notBlank(String s)       { return s != null && !s.isBlank(); }
    private String  safeStr(String s)        { return s != null ? s : "—"; }

    private String currencyLabel(String currency) {
        return switch (currency) { case "EUR" -> "€"; case "USD" -> "$"; default -> "DT"; };
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private record ItemRow(String date, String description, int quantity,
                            java.math.BigDecimal unitPriceHt, java.math.BigDecimal tva, java.math.BigDecimal totalHt, java.math.BigDecimal totalTtc) {}
}
