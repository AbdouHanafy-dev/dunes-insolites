package com.camping.duneinsolite.dto.response.publicapi;

import java.time.LocalDate;

public record PublicServiceOptionAvailabilityResponse(
        String serviceOptionSlug,
        LocalDate date,
        String status,
        Integer unitsAvailable
) {}
