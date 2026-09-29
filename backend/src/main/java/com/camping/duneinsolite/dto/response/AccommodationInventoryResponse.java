package com.camping.duneinsolite.dto.response;

import java.util.List;
import java.util.UUID;

public record AccommodationInventoryResponse(
        UUID accommodationTypeId,
        String name,
        Integer maxUnits,
        int internalUnits,
        int externalUnits,
        Integer availableUnits,
        String status,
        List<ExternalAccommodationBookingResponse> externalBookings
) {}
