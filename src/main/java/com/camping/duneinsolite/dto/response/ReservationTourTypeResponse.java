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
    private Double adultPrice;
    private Double childPrice;
    private Integer numberOfAdults;
    private Integer numberOfChildren;
    private Double totalPrice;
    private Integer numberOfNights;
    private LocalDate activityDate;
    private Double tva;
}