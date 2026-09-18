package com.camping.duneinsolite.dto.response.publicapi;

import lombok.Data;

import java.time.LocalDateTime;

/** Response for POST /api/public/tour-bookings. */
@Data
public class PublicTourBookingResponse {
    private String id;
    private String tourSlug;
    private String date;
    private Integer numberOfAdults;
    private Integer numberOfChildren;
    private String name;
    private String email;
    private String phone;
    private String notes;
    private String status;
    private java.math.BigDecimal total;
    private LocalDateTime createdAt;
}
