package com.camping.duneinsolite.mapper.publicapi;

import com.camping.duneinsolite.dto.response.publicapi.PublicStayResponse;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.AccommodationTypeTranslation;
import com.camping.duneinsolite.model.enums.ContentLocale;

import java.util.List;
import java.util.Optional;

/**
 * Puts an accommodation tier in the visitor's language: translated name, description and features
 * where the tier has them, the French original for anything left empty, and the "sleeps up to N" line
 * in the right language (it used to be French for everyone).
 */
final class PublicAccommodationTranslation {

    private PublicAccommodationTranslation() {
    }

    static void apply(PublicStayResponse.Accommodation dto, AccommodationType tier, Optional<ContentLocale> locale) {
        AccommodationTypeTranslation t = locale
                .flatMap(l -> tier.getTranslations().stream().filter(x -> x.getLocale() == l).findFirst())
                .orElse(null);
        dto.setTitle(t == null ? tier.getName() : PublicCatalogTranslation.text(tier.getName(), t.getName()));
        dto.setDescription(t == null ? tier.getDescription()
                : PublicCatalogTranslation.text(tier.getDescription(), t.getDescription()));
        List<String> features = t == null ? tier.getFeatures()
                : PublicCatalogTranslation.list(tier.getFeatures(), t.getFeatures());
        dto.setFeatures(List.copyOf(features));
        dto.setSleeps(sleeps(tier.getCapacity(), locale.orElse(null)));
    }

    /** "Up to N guests" in the visitor's language; French (the site default) when there is no locale. */
    static String sleeps(int capacity, ContentLocale locale) {
        if (locale == null) {
            return "Jusqu'à " + capacity + (capacity > 1 ? " personnes" : " personne");
        }
        return switch (locale) {
            case EN -> "Up to " + capacity + (capacity > 1 ? " guests" : " guest");
            case DE -> "Bis zu " + capacity + (capacity > 1 ? " Gäste" : " Gast");
            case IT -> "Fino a " + capacity + (capacity > 1 ? " ospiti" : " ospite");
            case DA -> "Op til " + capacity + (capacity > 1 ? " gæster" : " gæst");
            case AR -> "حتى " + capacity + " ضيف";
        };
    }
}
