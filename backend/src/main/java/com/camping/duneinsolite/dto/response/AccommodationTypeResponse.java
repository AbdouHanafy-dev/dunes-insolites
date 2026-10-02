package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.enums.Currency;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record AccommodationTypeResponse(
        UUID id,
        UUID tourTypeId,
        String tourTypeName,
        String slug,
        String name,
        String description,
        String imageUrl,
        List<String> gallery,
        int capacity,
        Integer maxUnits,
        BigDecimal adultPriceTtc,
        BigDecimal childPriceTtc,
        BigDecimal infantPriceTtc,
        BigDecimal tvaRate,
        Currency currency,
        int displayOrder,
        boolean active,
        boolean bookable,
        boolean airConditioned,
        boolean privateBathroom,
        List<String> features,
        List<com.camping.duneinsolite.dto.CatalogTranslationDto> translations
) {
    public static AccommodationTypeResponse from(AccommodationType a) {
        return new AccommodationTypeResponse(
                a.getId(),
                a.getTourType().getTourTypeId(),
                a.getTourType().getName(),
                a.getSlug(),
                a.getName(),
                a.getDescription(),
                a.getImageUrl(),
                List.copyOf(a.getGallery()),
                a.getCapacity(),
                a.getMaxUnits(),
                a.getAdultPriceTtc(),
                a.getChildPriceTtc(),
                a.getInfantPriceTtc(),
                a.getTvaRate(),
                a.getCurrency(),
                a.getDisplayOrder(),
                a.isActive(),
                a.isBookable(),
                a.isAirConditioned(),
                a.isPrivateBathroom(),
                List.copyOf(a.getFeatures()),
                a.getTranslations().stream().map(AccommodationTypeResponse::translationDto).toList());
    }

    /** The feature list travels as {@code highlights}, the field the shared translation panel already edits. */
    private static com.camping.duneinsolite.dto.CatalogTranslationDto translationDto(
            com.camping.duneinsolite.model.AccommodationTypeTranslation t) {
        var dto = new com.camping.duneinsolite.dto.CatalogTranslationDto();
        dto.setLocale(t.getLocale());
        dto.setName(t.getName());
        dto.setDescription(t.getDescription());
        dto.setHighlights(List.copyOf(t.getFeatures()));
        dto.setReviewStatus(t.getReviewStatus());
        dto.setSourceHash(t.getSourceHash());
        return dto;
    }
}
