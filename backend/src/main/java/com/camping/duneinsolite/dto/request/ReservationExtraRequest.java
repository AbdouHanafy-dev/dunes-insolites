package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ReservationExtraRequest {

    // Optional — only needed when adding to an EXISTING reservation via POST /api/reservation-extras
    // Not sent when extras are included inside the reservation creation request
    private UUID reservationId;

    // Client picks this from GET /api/extras/active (the catalog dropdown)
    @NotNull(message = "Extra ID is required")
    private UUID extraId;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    private LocalDate activityDate;

    private String pickupHotelName;
    private String pickupAirport;
    private String pickupFlightNumber;
    private String pickupAddress;
    private String pickupArrivalTime;
    private String pickupInstructions;
}
