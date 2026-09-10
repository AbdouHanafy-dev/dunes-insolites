package com.camping.duneinsolite.dto.response;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class ReservationTourResponse {
    private UUID reservationTourId;
    private UUID catalogTourId;
    private String name;
    private String description;
    private String duration;
    private java.math.BigDecimal adultPrice;
    private java.math.BigDecimal childPrice;
    private Integer numberOfAdults;
    private Integer numberOfChildren;
    private LocalDate departureDate;
    private java.math.BigDecimal totalPrice;
    private java.math.BigDecimal tva;
    private List<TourHebergementResponseDto> hebergements;
}