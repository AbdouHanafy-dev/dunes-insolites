package com.camping.duneinsolite.dto.response.publicapi;

import com.camping.duneinsolite.model.ServiceOption;
import com.camping.duneinsolite.model.enums.PricingUnit;
import com.camping.duneinsolite.model.enums.ServiceOptionCategory;

import java.math.BigDecimal;

/** Only what the "Getting There & Guide" step needs to render and price an option — no capacity internals. */
public record PublicServiceOptionResponse(
        String slug,
        String name,
        String description,
        ServiceOptionCategory category,
        String type,
        PricingUnit pricingUnit,
        BigDecimal priceTtc,
        boolean requiresPickupLocation,
        boolean requiresCustomerVehicle
) {
    public static PublicServiceOptionResponse from(ServiceOption o) {
        return new PublicServiceOptionResponse(
                o.getSlug(), o.getName(), o.getDescription(), o.getCategory(), o.getType(),
                o.getPricingUnit(), o.getUnitPriceTtc(), o.isRequiresPickupLocation(), o.isRequiresCustomerVehicle());
    }
}
