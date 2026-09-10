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
    private java.math.BigDecimal priceFrom;
    private String groupSize;
    private List<String> included;
    private List<String> notIncluded;
    private List<String> practicalInfo;
    private String arrivalTime;
    private String departureTime;
    private List<ItineraryStep> itinerary;
    // Phase 1: real AccommodationType rows, but ONLY those that are active AND
    // priced — the vitrine never shows an option it can't quote. Empty for the
    // bivouac nuitée and for any nuitée whose tiers are still unpriced.
    private List<Accommodation> accommodations;

    @Data
    public static class ItineraryStep {
        private String time;
        private String title;
        private String description;
    }

    /** Field-for-field match of packages/api-types' Accommodation. */
    @Data
    public static class Accommodation {
        private String slug;
        private String title;
        private String tagline;
        private String description;
        private String image;
        private java.math.BigDecimal priceFrom;
        private String sleeps;
        private List<String> features;
    }
}
