package com.camping.duneinsolite.dto.response;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ReservationTourTypeResponse {
    private UUID reservationTourTypeId;
    private UUID catalogTourTypeId;
    private String name;
    private String description;
    private String duration;
    private java.math.BigDecimal adultPrice;
    private java.math.BigDecimal childPrice;
    private java.math.BigDecimal infantPrice;
    private Integer numberOfAdults;
    private Integer numberOfChildren;
    private Integer numberOfInfants;
    private java.math.BigDecimal totalPrice;
    private Integer numberOfNights;
    private LocalDate activityDate;
    private java.math.BigDecimal tva;
    /** The tiers booked on this stay: what the back office shows as "Tente x 1", "Suite x 2". */
    private java.util.List<ReservationAccommodationResponse> accommodations;
}