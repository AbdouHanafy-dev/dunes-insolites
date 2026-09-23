package com.camping.duneinsolite.model.enums;

import java.util.Locale;

/**
 * The language a client's reservation emails are written in - the language
 * they were browsing the site in when they booked (the vitrine's six locales).
 * French is the fallback for anything unknown or missing, matching the
 * vitrine's own default locale.
 */
public enum MailLocale {
    FR("fr", false),
    EN("en", false),
    DE("de", false),
    IT("it", false),
    DA("da", false),
    AR("ar", true);

    private final String tag;
    private final boolean rtl;

    MailLocale(String tag, boolean rtl) {
        this.tag = tag;
        this.rtl = rtl;
    }

    /** Lower-case language tag, as stored on the reservation ("fr", "en", ...). */
    public String tag() {
        return tag;
    }

    public boolean isRtl() {
        return rtl;
    }

    public Locale javaLocale() {
        return Locale.forLanguageTag(tag);
    }

    /** Lenient: accepts "fr", "FR", "en-GB", "de_DE"; anything unknown or blank is French. */
    public static MailLocale from(String raw) {
        if (raw == null || raw.isBlank()) return FR;
        String lang = raw.trim().toLowerCase(Locale.ROOT).replace('_', '-');
        int dash = lang.indexOf('-');
        if (dash > 0) lang = lang.substring(0, dash);
        for (MailLocale l : values()) {
            if (l.tag.equals(lang)) return l;
        }
        return FR;
    }
}
