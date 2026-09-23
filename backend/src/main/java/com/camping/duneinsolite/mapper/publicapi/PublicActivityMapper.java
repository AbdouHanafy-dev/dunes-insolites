package com.camping.duneinsolite.mapper.publicapi;

import com.camping.duneinsolite.dto.response.publicapi.PublicActivityResponse;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.ExtraTranslation;
import com.camping.duneinsolite.model.enums.ContentLocale;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Maps Extra (the backend's on-site add-on/activity entity) to the vitrine's
 * public Activity shape. See PublicCatalogText for how the marketing-only
 * fields Extra doesn't store are derived, PublicCatalogTranslation for how
 * the requested locale resolves against Extra's translations, and
 * PublicActivityResponse for why this isn't a MapStruct interface.
 */
@Component
public class PublicActivityMapper {

    /** @param locale e.g. "de"; null/"fr"/unknown all resolve to Extra's own (French) fields. */
    public PublicActivityResponse toResponse(Extra extra, String locale) {
        Optional<ContentLocale> contentLocale = PublicCatalogTranslation.parseLocale(locale);
        ExtraTranslation t = contentLocale
                .flatMap(l -> PublicCatalogTranslation.find(extra.getTranslations(), l))
                .orElse(null);

        String name = t == null ? extra.getName() : PublicCatalogTranslation.text(extra.getName(), t.getName());
        String description = t == null ? extra.getDescription()
                : PublicCatalogTranslation.text(extra.getDescription(), t.getDescription());
        String aboutText = t == null ? extra.getAboutText()
                : PublicCatalogTranslation.text(extra.getAboutText(), t.getAboutText());
        List<String> included = t == null ? extra.getIncludedItems()
                : PublicCatalogTranslation.list(extra.getIncludedItems(), t.getIncludedItems());
        List<String> notIncluded = t == null ? extra.getNotIncludedItems()
                : PublicCatalogTranslation.list(extra.getNotIncludedItems(), t.getNotIncludedItems());

        PublicActivityResponse response = new PublicActivityResponse();
        response.setSlug(extra.getSlug());
        response.setTitle(name);
        response.setKicker(PublicCatalogText.kicker(extra.getLocation()));
        response.setTagline(PublicCatalogText.tagline(description));
        response.setDescription(description);
        response.setLongDescription(PublicCatalogText.longDescription(aboutText));
        response.setHeroImage(extra.getCoverPhotoUrl());
        response.setCardImage(extra.getCoverPhotoUrl());
        response.setGallery(PublicCatalogText.gallery(extra.getPhotos()));
        response.setPriceFrom(extra.getUnitPrice());
        response.setPricingUnit(extra.getPricingUnit() == null ? null : extra.getPricingUnit().name());
        response.setDurationMins(PublicCatalogText.parseDurationMinutes(extra.getDuration()));
        // No difficulty rating exists on Extra today - neutral default until modeled.
        response.setDifficulty("Moderate");
        response.setGroupSize(PublicCatalogText.groupSize(extra.getGroupSizeType()));
        response.setIncluded(included);
        response.setNotIncluded(notIncluded);
        response.setMeetingPoint(extra.getMeetingPoint());
        // CLAUDE.md: Dunes has no time-of-day picker - the camp confirms the
        // hour on arrival. Slots stay empty rather than invented.
        response.setSlots(List.of());
        return response;
    }
}
