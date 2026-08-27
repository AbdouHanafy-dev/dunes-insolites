package com.camping.duneinsolite.mapper.publicapi;

import com.camping.duneinsolite.model.CatalogTranslation;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.ContentLocale;

import java.util.List;
import java.util.Optional;

/**
 * Resolves the right-language text for a TourType/Extra: French lives on the
 * entity itself (see ContentLocale), every other locale in a
 * TourTypeTranslation/ExtraTranslation row. A requested locale with no
 * matching row, or a row with a blank/empty field, falls back to the French
 * base rather than rendering empty - a partial translation is still useful.
 */
final class PublicCatalogTranslation {

    private PublicCatalogTranslation() {
    }

    /** Parses a request locale like "de" into ContentLocale.DE; French/unknown/absent -> empty (use the base entity). */
    static Optional<ContentLocale> parseLocale(String raw) {
        if (raw == null || raw.isBlank() || raw.equalsIgnoreCase("fr")) return Optional.empty();
        try {
            return Optional.of(ContentLocale.valueOf(raw.trim().toUpperCase()));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    static <T extends CatalogTranslation> Optional<T> find(List<T> translations, ContentLocale locale) {
        if (translations == null) return Optional.empty();
        return translations.stream().filter(t -> t.getLocale() == locale).findFirst();
    }

    static String text(String base, String translated) {
        return (translated == null || translated.isBlank()) ? base : translated;
    }

    static List<String> list(List<String> base, List<String> translated) {
        return (translated == null || translated.isEmpty()) ? base : translated;
    }

    static List<ProgramStep> steps(List<ProgramStep> base, List<ProgramStep> translated) {
        return (translated == null || translated.isEmpty()) ? base : translated;
    }
}
