package com.camping.duneinsolite.dto.response.publicapi;

import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.enums.PricingUnit;
import com.camping.duneinsolite.model.enums.ExtraCategory;
import com.camping.duneinsolite.model.enums.PickupField;

import java.math.BigDecimal;
import java.util.Set;

/** Only what the "Getting There & Guide" step needs to render and price an option — no capacity internals. */
public record PublicServiceOptionResponse(
        String slug,
        String name,
        String description,
        ExtraCategory category,
        String type,
        PricingUnit pricingUnit,
        BigDecimal priceTtc,
        boolean requiresPickupLocation,
        boolean requiresCustomerVehicle,
        Set<PickupField> pickupFields,
        Set<PickupField> requiredPickupFields
) {
    public static PublicServiceOptionResponse from(Extra o) {
        return new PublicServiceOptionResponse(
                o.getSlug(), o.getName(), o.getDescription(),
                o.getCategory(), o.getServiceType(),
                o.getPricingUnit(), o.getUnitPrice(), !o.getPickupFields().isEmpty(),
                o.isRequiresCustomerVehicle(), o.getPickupFields(), o.getRequiredPickupFields());
    }
}
