package com.camping.duneinsolite.dto.request.publicapi;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * One guide/transport option chosen in the "Getting There & Guide" step of
 * the public stay-booking form. Slug, not an id - same public-facing
 * convention as {@code rideSlugs} for extras; resolved to the real
 * GUIDE/TRANSPORT-category {@link com.camping.duneinsolite.model.Extra} server-side.
 */
@Data
public class PublicServiceOptionSelectionRequest {

    @NotBlank(message = "Service option slug is required")
    private String serviceOptionSlug;

    /** Days / persons / vehicles depending on the option's pricing unit - defaults to 1. */
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    // Only meaningful when the chosen option requires pickup details.
    private String pickupHotelName;
    private String pickupAirport;
    private String pickupFlightNumber;
    private String pickupAddress;
    private String pickupArrivalTime;
    private String pickupInstructions;
}
