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
        // The admin form only ever lets requiredPickupFields be a subset of
        // pickupFields (ExtrasCrud.tsx's serviceRequest()), but checking
        // both here rather than just pickupFields means a booking can never
        // be authoritatively rejected in ReservationServiceImpl#validatePickup
        // for a field the guest was never shown a way to fill in - the
        // frontend gate and the backend gate must agree even if that
        // invariant were ever violated another way.
        boolean requiresPickupLocation = !o.getPickupFields().isEmpty() || !o.getRequiredPickupFields().isEmpty();
        return new PublicServiceOptionResponse(
                o.getSlug(), o.getName(), o.getDescription(),
                o.getCategory(), o.getServiceType(),
                o.getPricingUnit(), o.getUnitPrice(), requiresPickupLocation,
                o.isRequiresCustomerVehicle(), o.getPickupFields(), o.getRequiredPickupFields());
    }
}
