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
    private Double adultPrice;
    private Double childPrice;
    private Integer numberOfAdults;
    private Integer numberOfChildren;
    private LocalDate departureDate;
    private Double totalPrice;
    private Double tva;
    private List<TourHebergementResponseDto> hebergements;
}