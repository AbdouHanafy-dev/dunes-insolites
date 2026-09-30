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
                List.copyOf(a.getFeatures()));
    }
}
