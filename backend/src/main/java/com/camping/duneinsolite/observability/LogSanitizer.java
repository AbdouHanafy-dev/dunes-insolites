package com.camping.duneinsolite.observability;

/**
 * Redacts direct identifiers before they reach a log line.
 *
 * <p>GDPR data-minimisation for logs: an email address is personal data, and
 * routine operational logs ("email sent to …", "user … registered") do not need
 * the full address to be useful — a masked form plus the opaque {@code userId}
 * (a UUID, not personal data on its own) is enough to trace a request. Incident
 * response can still correlate by user id.
 *
 * <p>Not a security boundary — a determined reader with DB access sees the real
 * values. It keeps casual log exposure (aggregation tools, screenshots, shared
 * terminals) from turning every INFO line into a PII disclosure.
 *
 * <p>See {@code docs/runbooks/privacy-and-data-rights.md} — "PII logging rules".
 */
public final class LogSanitizer {

    private LogSanitizer() {}

    /**
     * {@code jane.doe@example.com} → {@code j***e@example.com};
     * {@code a@x.com} → {@code *@x.com}. Null / blank / not-an-email is
     * returned as {@code "<redacted>"} rather than echoed.
     */
    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) return "<redacted>";
        int at = email.indexOf('@');
        if (at < 1) return "<redacted>";
        String local = email.substring(0, at);
        String domain = email.substring(at); // includes '@'
        String maskedLocal = switch (local.length()) {
            case 1 -> "*";
            case 2 -> local.charAt(0) + "*";
            default -> local.charAt(0) + "***" + local.charAt(local.length() - 1);
        };
        return maskedLocal + domain;
    }

    /** A free-text phone number → last two digits only, e.g. {@code ****89}. */
    public static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) return "<redacted>";
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() < 2) return "****";
        return "****" + digits.substring(digits.length() - 2);
    }
}
