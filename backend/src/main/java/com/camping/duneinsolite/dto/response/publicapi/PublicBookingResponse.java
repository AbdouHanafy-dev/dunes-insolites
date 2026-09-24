package com.camping.duneinsolite.dto.response.publicapi;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

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
    private Integer numberOfAdults;
    private Integer numberOfChildren;
    private Integer numberOfInfants;
    private List<String> rideSlugs;
    private String arrivalMode;
    private String departureCity;
    private String returnCity;
    private List<String> preferredLanguageIds;
    private String otherLanguageRequested;
    private String name;
    private String email;
    private String phone;
    private String notes;
    private String status;
    private java.math.BigDecimal total;
    private LocalDateTime createdAt;
}
