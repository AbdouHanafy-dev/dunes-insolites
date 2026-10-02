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
        if (translated == null || translated.isEmpty()) return base;
        return translated;
    }

    private static String own(String translated, String fallback) {
        return translated != null && !translated.isBlank() ? translated : fallback;
    }

    static List<ProgramStep> steps(List<ProgramStep> base, List<ProgramStep> translated) {
        if (translated == null || translated.isEmpty()) return base;
        // Images do not depend on the language: a translated step without its own
        // keeps the images of the same step in the source language.
        // Copies, never the managed embeddables themselves: this is a read path.
        List<ProgramStep> merged = new java.util.ArrayList<>();
        for (int i = 0; i < translated.size(); i++) {
            ProgramStep t = translated.get(i);
            ProgramStep copy = new ProgramStep(t.getLabel(), t.getTitle(), t.getDescription());
            // Same step in the source language: its structure (type, optional, duration) is not
            // language-dependent, and a translation row only carries the defaults for it.
            ProgramStep source = base != null && i < base.size() ? base.get(i) : null;
            copy.setSegmentType(source != null ? source.getSegmentType() : t.getSegmentType());
            copy.setOptionalSegment(source != null ? source.getOptionalSegment() : t.getOptionalSegment());
            copy.setDurationMinutes(source != null ? source.getDurationMinutes() : t.getDurationMinutes());
            copy.setPickupPoint(own(t.getPickupPoint(), source == null ? null : source.getPickupPoint()));
            copy.setDropoffPoint(own(t.getDropoffPoint(), source == null ? null : source.getDropoffPoint()));
            copy.setAttraction(own(t.getAttraction(), source == null ? null : source.getAttraction()));
            boolean own = t.getImageUrls() != null && !t.getImageUrls().isEmpty();
            List<String> images = own ? t.getImageUrls()
                    : (base != null && i < base.size() && base.get(i).getImageUrls() != null ? base.get(i).getImageUrls() : List.of());
            copy.setImageUrls(new java.util.ArrayList<>(images));
            merged.add(copy);
        }
        return merged;
    }
}
