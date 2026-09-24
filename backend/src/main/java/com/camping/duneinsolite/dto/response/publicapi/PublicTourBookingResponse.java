package com.camping.duneinsolite.dto.response.publicapi;

import com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** Response for POST /api/public/tour-bookings. */
@Data
public class PublicTourBookingResponse {
    private String id;
    private String tourSlug;
    private String date;
    private Integer numberOfAdults;
    private Integer numberOfChildren;
    private Integer numberOfInfants;
    private List<String> rideSlugs;
    private List<PublicAccommodationSelectionRequest> accommodations;
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
