package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ReservationServiceOptionRequest {

    // Client picks this from GET /api/public/service-options (the catalog list)
    @NotNull(message = "Service option ID is required")
    private UUID serviceOptionId;

    /**
     * Days / persons / vehicles depending on the option's pricing unit -
     * ignored server-side (forced to 1) when the option is PER_BOOKING,
     * never trusted for that case.
     */
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    private LocalDate serviceDate;

    // Only meaningful (and required by the backend) when the chosen option
    // has requiresPickupLocation = true. Which of these matter depends on
    // the option's type (hotel name for a hotel pickup, flight number for
    // an airport pickup) - the backend doesn't demand all of them, just at
    // least one non-blank field.
    private String pickupHotelName;
    private String pickupAirport;
    private String pickupFlightNumber;
    private String pickupAddress;
    private String pickupArrivalTime;
    private String pickupInstructions;
}
