package com.camping.duneinsolite.dto.response.publicapi;

import java.time.LocalDate;
import java.util.List;

/**
 * Truthful accommodation availability for one stay across [{@code date},
 * {@code date + nights}). Exposes only what a booking form needs — a status
 * and (when known) a free-unit count. No reservation ids, no customer data,
 * no prices (Phase 1 owns pricing).
 *
 * <p>{@code status} per tier: AVAILABLE / UNAVAILABLE / UNKNOWN
 * (UNKNOWN = the tier has no unit inventory configured yet).
 */
public record PublicAvailabilityResponse(
        String staySlug,
        LocalDate date,
        int nights,
        List<TierAvailability> accommodations
) {
    public record TierAvailability(
            String slug,
            String name,
            String status,
            Integer unitsAvailable
    ) {}
}
