package com.camping.duneinsolite.dto.response.publicapi;

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
    private String accommodationSlug;
    private Integer accommodationQty;
    private String date;
    private Integer partySize;
    private List<String> rideSlugs;
    private String name;
    private String email;
    private String phone;
    private String notes;
    private String status;
    private Double total;
    private LocalDateTime createdAt;
}
