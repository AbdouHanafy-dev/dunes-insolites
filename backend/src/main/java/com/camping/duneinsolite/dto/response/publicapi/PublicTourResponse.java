package com.camping.duneinsolite.dto.response.publicapi;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Wire shape for GET /api/public/tours{,/{slug}}. Projected from Tour —
 * unlike TourType/Extra, Tour already stores real itinerary/highlights/
 * meeting-point data, so this mapper (PublicTourMapper) does far less
 * derivation than PublicStayMapper/PublicActivityMapper need.
 */
@Data
public class PublicTourResponse {
    private String slug;
    private String title;
    private String description;
    private String aboutText;
    private String duration;
    private String location;
    private String meetingPoint;
    private String groupSize;
    private List<String> languages;
    private String coverImage;
    private List<String> gallery;
    private List<String> highlights;
    private List<String> included;
    private List<String> notIncluded;
    private List<ItineraryStep> itinerary;
    private CancellationPolicy cancellationPolicy;
    private BigDecimal priceFrom;
    private BigDecimal passengerAdultPrice;
    private BigDecimal passengerChildPrice;
    private Double averageRating;
    private Integer reviewCount;

    @Data
    public static class ItineraryStep {
        private String label;
        private String title;
        private String description;
    }

    @Data
    public static class CancellationPolicy {
        private Boolean freeCancellation;
        private Integer hoursBeforeDeadline;
    }
}
