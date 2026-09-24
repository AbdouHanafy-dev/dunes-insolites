package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

/**
 * One accommodation tier + how many units of it, within a single stay line.
 * A {@link TourTypeSelectionRequest} may carry several of these at once —
 * a guest booking 2 Suites and 3 Tentes together sends two entries here.
 */
@Data
public class AccommodationSelectionRequest {
    @NotNull(message = "Accommodation type ID is required")
    private UUID accommodationTypeId;

    @Min(value = 1, message = "Accommodation units must be at least 1")
    private Integer accommodationUnits;

    // Who sleeps in this tier. Optional when the booking picks a single tier (the
    // whole party goes there); required per tier when several are picked, and the
    // tiers together must add up to the party.
    @Min(value = 0, message = "Adults cannot be negative")
    private Integer adults;

    @Min(value = 0, message = "Children cannot be negative")
    private Integer children;

    @Min(value = 0, message = "Infants cannot be negative")
    private Integer infants;
}
