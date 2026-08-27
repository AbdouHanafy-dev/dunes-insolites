package com.camping.duneinsolite.model.enums;

/**
 * A locale the vitrine's marketing copy (name/description/highlights/...) can
 * be translated into. French is deliberately absent: TourType/Extra's own
 * columns already hold the French text, so it's the fallback rather than a
 * translation row - see PublicCatalogTranslation.
 */
public enum ContentLocale {
    EN,
    DE,
    IT,
    DA,
    AR
}
