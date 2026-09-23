package com.camping.duneinsolite.dto.response.publicapi;

import com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response for POST /api/public/stay-bookings. Field-for-field match of
 * packages/api-types' StayBooking type.
 */
@Data
public class PublicStayBookingResponse {
    private String id;
    private String staySlug;
    private List<PublicAccommodationSelectionRequest> accommodations;
    private String date;
    private Integer nights;
    private Integer partySize;
    private List<String> rideSlugs;
    private String arrivalMode;
    private String departureCity;
    private String returnCity;
    private String name;
    private String email;
    private String phone;
    private String notes;
    private String status;
    private java.math.BigDecimal total;
    private LocalDateTime createdAt;
}
