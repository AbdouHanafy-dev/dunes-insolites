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
        BigDecimal unitPriceTtc,
        BigDecimal tvaRate,
        Currency currency,
        int displayOrder,
        boolean active,
        boolean bookable,
        List<String> features
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
                a.getUnitPriceTtc(),
                a.getTvaRate(),
                a.getCurrency(),
                a.getDisplayOrder(),
                a.isActive(),
                a.isBookable(),
                List.copyOf(a.getFeatures()));
    }
}
