package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.ServiceOption;
import com.camping.duneinsolite.model.enums.PricingUnit;
import com.camping.duneinsolite.model.enums.ServiceOptionCategory;

import java.math.BigDecimal;
import java.util.UUID;

public record ServiceOptionResponse(
        UUID id,
        String slug,
        String name,
        String description,
        ServiceOptionCategory category,
        String type,
        PricingUnit pricingUnit,
        BigDecimal unitPriceTtc,
        BigDecimal tvaRate,
        Integer maxUnitsPerDay,
        boolean requiresPickupLocation,
        boolean requiresCustomerVehicle,
        int displayOrder,
        boolean active,
        boolean bookable
) {
    public static ServiceOptionResponse from(ServiceOption o) {
        return new ServiceOptionResponse(
                o.getId(), o.getSlug(), o.getName(), o.getDescription(),
                o.getCategory(), o.getType(), o.getPricingUnit(),
                o.getUnitPriceTtc(), o.getTvaRate(), o.getMaxUnitsPerDay(),
                o.isRequiresPickupLocation(), o.isRequiresCustomerVehicle(),
                o.getDisplayOrder(), o.isActive(), o.isBookable());
    }
}
