package com.camping.duneinsolite.mail;

/**
 * The one visual frame every email goes through, so a client sees the same
 * brand in a booking confirmation, a password reset and an invoice: the site's
 * desert-paper background, night header with the logo mark, ember buttons,
 * Alexandria headings and Inter body text (frontend/app/fonts.ts, globals.css).
 *
 * Web fonts only load in clients that allow them (Apple Mail, iOS, some
 * webmail); everywhere else the fallback stacks below take over, which is
 * normal for email. Layout is table-based with inline styles because Outlook
 * and Gmail ignore most modern CSS. No user text reaches the HTML unescaped:
 * callers pass plain strings to {@link #esc(String)} / the helpers.
 */
public final class MailLayout {

    public static final String PAPER = "#f4e9d8";
    public static final String CARD = "#fffaf3";
    public static final String NIGHT = "#1a2429";
    public static final String INK = "#241b17";
    public static final String MUTED = "#6f655c";
    public static final String EMBER = "#a04a2f";
    public static final String AMBER = "#d99a5c";
    public static final String TEAL = "#3a6a66";
    public static final String LINE = "#e6d9c4";
    public static final String PANEL = "#f8f0e3";

    public static final String DISPLAY = "'Alexandria','Trebuchet MS','Segoe UI',Arial,sans-serif";
    public static final String BODY = "'Inter','Segoe UI',Helvetica,Arial,sans-serif";

    public static final String PHONE = "+216 27 391 501";
    public static final String EMAIL = "hello@dunes-insolites.tn";
    public static final String SITE = "www.dunes-insolites.com";

    private MailLayout() {}

    /** Everything that varies between emails. All strings are plain text except {@code bodyHtml}. */
    public record Frame(String lang, boolean rtl, String siteUrl, String brand, String eyebrow, String title,
                        String bodyHtml, String footerNote) {}

    public static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }

    public static String p(String html) {
        return "<p style=\"margin:0 0 18px;font-family:" + BODY + ";font-size:15px;line-height:1.7;color:" + INK + ";\">"
                + html + "</p>";
    }

    public static String muted(String html) {
        return "<p style=\"margin:0 0 18px;font-family:" + BODY + ";font-size:13px;line-height:1.6;color:" + MUTED + ";\">"
                + html + "</p>";
    }

    public static String strong(String text) {
        return "<strong style=\"font-weight:600;\">" + esc(text) + "</strong>";
    }

    /** A small uppercase section label, like the site's eyebrows. */
    public static String label(String text) {
        return "<p style=\"margin:26px 0 10px;font-family:" + BODY + ";font-size:11px;font-weight:700;"
                + "letter-spacing:0.14em;text-transform:uppercase;color:" + EMBER + ";\">" + esc(text) + "</p>";
    }

    /** Only http(s) links reach an href. */
    public static String button(String link, String label) {
        String l = link == null ? "" : link.trim();
        if (!(l.startsWith("https://") || l.startsWith("http://"))) return "";
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:8px 0 26px;\">"
                + "<tr><td align=\"center\"><a href=\"" + esc(l) + "\" style=\"display:inline-block;background:" + EMBER
                + ";color:#ffffff;font-family:" + BODY + ";font-size:15px;font-weight:600;text-decoration:none;"
                + "padding:15px 38px;border-radius:999px;letter-spacing:0.2px;\">" + esc(label) + "</a></td></tr></table>";
    }

    /** A soft panel holding a table of rows, for credentials and key facts. */
    public static String panel(String innerHtml) {
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:" + PANEL
                + ";border:1px solid " + LINE + ";border-radius:12px;margin:0 0 22px;\"><tr><td style=\"padding:8px 22px;\">"
                + innerHtml + "</td></tr></table>";
    }

    /** One label/value row inside a panel. */
    public static String row(String label, String valueHtml) {
        return "<tr><td style=\"padding:11px 12px 11px 0;border-bottom:1px solid " + LINE + ";font-family:" + BODY
                + ";font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:" + MUTED
                + ";vertical-align:top;\">" + esc(label) + "</td><td align=\"right\" style=\"padding:11px 0;"
                + "border-bottom:1px solid " + LINE + ";font-family:" + BODY + ";font-size:14px;font-weight:500;color:"
                + INK + ";vertical-align:top;\">" + valueHtml + "</td></tr>";
    }

    public static String rows(String rowsHtml) {
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" + rowsHtml + "</table>";
    }

    /** A highlighted note (tone: ember for warnings, teal for good news). */
    public static String notice(String html, String colour) {
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:0 0 22px;"
                + "background:#ffffff;border:1px solid " + LINE + ";border-left:4px solid " + colour
                + ";border-radius:8px;\"><tr><td style=\"padding:14px 18px;font-family:" + BODY
                + ";font-size:14px;line-height:1.6;color:" + INK + ";\">" + html + "</td></tr></table>";
    }

    /** A credential or code, monospaced on a paper chip. */
    public static String code(String text) {
        return "<code style=\"font-family:Consolas,'Courier New',monospace;font-size:15px;font-weight:700;color:" + EMBER
                + ";background:#ffffff;border:1px solid " + LINE + ";padding:3px 10px;border-radius:6px;"
                + "letter-spacing:1px;\">" + esc(text) + "</code>";
    }

    public static String page(Frame f) {
        String dir = f.rtl() ? "rtl" : "ltr";
        String align = f.rtl() ? "right" : "left";
        String site = f.siteUrl() == null ? "https://" + SITE : f.siteUrl().replaceAll("/+$", "");
        StringBuilder h = new StringBuilder(4096);
        h.append("<!DOCTYPE html><html lang=\"").append(esc(f.lang())).append("\" dir=\"").append(dir).append("\"><head>")
                .append("<meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">")
                .append("<meta name=\"color-scheme\" content=\"light\"><title>").append(esc(f.title())).append("</title>")
                .append("<link href=\"https://fonts.googleapis.com/css2?family=Alexandria:wght@500;600;700&family=Inter:wght@400;500;600&display=swap\" rel=\"stylesheet\">")
                .append("</head><body style=\"margin:0;padding:0;background:").append(PAPER).append(";\">")
                .append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:")
                .append(PAPER).append(";padding:32px 12px;\"><tr><td align=\"center\">")
                .append("<table role=\"presentation\" width=\"620\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:620px;max-width:100%;")
                .append("background:").append(CARD).append(";border-radius:18px;overflow:hidden;border:1px solid ").append(LINE).append(";\">")

                // header
                .append("<tr><td align=\"center\" style=\"background:").append(NIGHT).append(";padding:30px 32px 26px;\">")
                .append("<img src=\"").append(esc(site)).append("/logo-mark.png\" width=\"56\" height=\"56\" alt=\"\" ")
                .append("style=\"display:inline-block;border-radius:50%;border:0;\">")
                .append("<p style=\"margin:14px 0 0;font-family:").append(DISPLAY).append(";font-size:15px;font-weight:700;")
                .append("letter-spacing:0.28em;text-transform:uppercase;color:#f4e9d8;\">").append(esc(f.brand())).append("</p>")
                .append("<p style=\"margin:6px 0 0;font-family:").append(BODY).append(";font-size:11px;letter-spacing:0.22em;")
                .append("text-transform:uppercase;color:").append(AMBER).append(";\">Sabria · Sahara</p>")
                .append("</td></tr>")
                .append("<tr><td style=\"height:4px;line-height:4px;font-size:0;background:").append(EMBER).append(";\">&nbsp;</td></tr>")

                // title + body
                .append("<tr><td style=\"padding:36px 40px 12px;text-align:").append(align).append(";direction:").append(dir).append(";\">");
        if (f.eyebrow() != null && !f.eyebrow().isBlank()) {
            h.append("<p style=\"margin:0 0 8px;font-family:").append(BODY).append(";font-size:11px;font-weight:700;")
                    .append("letter-spacing:0.16em;text-transform:uppercase;color:").append(EMBER).append(";\">")
                    .append(esc(f.eyebrow())).append("</p>");
        }
        h.append("<h1 style=\"margin:0 0 22px;font-family:").append(DISPLAY).append(";font-size:26px;font-weight:600;")
                .append("line-height:1.25;color:").append(INK).append(";\">").append(esc(f.title())).append("</h1>")
                .append(f.bodyHtml())
                .append("</td></tr>")

                // footer
                .append("<tr><td style=\"padding:8px 40px 34px;text-align:center;\">")
                .append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr><td style=\"border-top:1px solid ")
                .append(LINE).append(";font-size:0;line-height:0;\">&nbsp;</td></tr></table>")
                .append("<p style=\"margin:20px 0 4px;font-family:").append(BODY).append(";font-size:13px;line-height:1.7;color:")
                .append(INK).append(";\"><a href=\"https://wa.me/").append(PHONE.replaceAll("[^0-9]", ""))
                .append("\" style=\"color:").append(EMBER).append(";text-decoration:none;font-weight:600;\">WhatsApp ")
                .append(PHONE).append("</a> &nbsp;·&nbsp; <a href=\"mailto:").append(EMAIL).append("\" style=\"color:").append(EMBER)
                .append(";text-decoration:none;font-weight:600;\">").append(EMAIL).append("</a></p>")
                .append("<p style=\"margin:0 0 14px;font-family:").append(BODY).append(";font-size:12px;line-height:1.7;color:")
                .append(MUTED).append(";\">Dunes Insolites · El Faouar 4264, Kébili, Tunisia · <a href=\"https://").append(SITE)
                .append("\" style=\"color:").append(MUTED).append(";\">").append(SITE).append("</a></p>");
        if (f.footerNote() != null && !f.footerNote().isBlank()) {
            h.append("<p style=\"margin:0;font-family:").append(BODY).append(";font-size:11px;line-height:1.6;color:")
                    .append(MUTED).append(";\">").append(esc(f.footerNote())).append("</p>");
        }
        h.append("</td></tr></table></td></tr></table></body></html>");
        return h.toString();
    }
}
