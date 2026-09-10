package com.camping.duneinsolite.dto.response.publicapi;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response for POST /api/public/bookings. Field-for-field match of
 * packages/api-types' Booking type.
 */
@Data
public class PublicBookingResponse {
    private String id;
    private String activitySlug;
    private String date;
    private String timeSlot;
    private Integer partySize;
    private String name;
    private String email;
    private String phone;
    private String notes;
    private String status;
    private java.math.BigDecimal total;
    private LocalDateTime createdAt;
}
