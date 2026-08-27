package com.camping.duneinsolite.dto.response.publicapi;

import lombok.Data;

import java.util.List;

/**
 * Wire shape for GET /api/public/stays{,/{slug}}. Field-for-field match of
 * packages/api-types' Stay type - projected from TourType. See
 * PublicStayMapper for how fields the entity doesn't store (kicker, tagline,
 * longDescription, practicalInfo, arrivalTime/departureTime, itinerary) are
 * derived or defaulted.
 */
@Data
public class PublicStayResponse {
    private String slug;
    private String title;
    private String kicker;
    private String tagline;
    private String description;
    private List<String> longDescription;
    private String image;
    private List<String> gallery;
    private Double priceFrom;
    private String groupSize;
    private List<String> included;
    private List<String> notIncluded;
    private List<String> practicalInfo;
    private String arrivalTime;
    private String departureTime;
    private List<ItineraryStep> itinerary;
    // Accommodation (Desert Tent/Room/Dune Suite) isn't modeled on TourType
    // yet - always empty until that's built. An empty array satisfies the
    // contract's optional Accommodation[] just as well as an absent key.
    private List<Object> accommodations;

    @Data
    public static class ItineraryStep {
        private String time;
        private String title;
        private String description;
    }
}
