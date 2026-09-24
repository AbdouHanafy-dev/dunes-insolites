package com.camping.duneinsolite.dto.request.publicapi;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * One accommodation tier + how many units of it, within a public stay
 * booking. Field-for-field match of packages/api-types'
 * AccommodationSelection. A booking may carry several of these at once
 * (e.g. 2 Suites + 3 Tentes together).
 */
@Data
public class PublicAccommodationSelectionRequest {
    @NotBlank(message = "Accommodation slug is required")
    private String accommodationSlug;

    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    // Who sleeps in this tier - see AccommodationSelectionRequest. Optional for a single tier.
    @Min(value = 0, message = "Adults cannot be negative")
    private Integer adults;

    @Min(value = 0, message = "Children cannot be negative")
    private Integer children;

    @Min(value = 0, message = "Infants cannot be negative")
    private Integer infants;
}
