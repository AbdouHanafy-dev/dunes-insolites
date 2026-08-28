package com.camping.duneinsolite.model.enums;

/**
 * Full-page content locale — unlike ContentLocale (catalogue translations,
 * where French lives on the base entity as the fallback), a Page's content
 * and SEO differ completely per language with no fallback: each locale is
 * its own Page row, French included. Matches the 6 locales the public
 * vitrine (frontend/) already serves.
 */
public enum PageLocale {
    FR,
    EN,
    DE,
    IT,
    DA,
    AR
}
