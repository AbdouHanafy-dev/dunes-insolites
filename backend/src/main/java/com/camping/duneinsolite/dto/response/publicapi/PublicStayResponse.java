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
    // The stay's own per-person nightly rates, straight from the back office
    // (TourType.passengerAdultPrice / passengerChildPrice). They price the
    // booking when the stay has no accommodation types.
    private java.math.BigDecimal adultPrice;
    private java.math.BigDecimal childPrice;
    private java.math.BigDecimal infantPrice;
    private String groupSize;
    private List<String> included;
    private List<String> notIncluded;
    private List<String> practicalInfo;
    private String arrivalTime;
    private String departureTime;
    private List<ItineraryStep> itinerary;
    /** Enum names of the cities the guest can depart from / be dropped back to. */
    private List<String> departureCities;
    private List<String> returnCities;
    // Phase 1: real AccommodationType rows, but ONLY those that are active AND
    // priced — the vitrine never shows an option it can't quote. Empty for the
    // bivouac nuitée and for any nuitée whose tiers are still unpriced.
    private List<Accommodation> accommodations;
    // Whether this stay requires the guest to pick a GUIDE-category
    // service option before booking (TourType.guideRequired).
    private boolean guideRequired;
    // Maximum nights bookable in one reservation (TourType.maxNights). 1 =
    // fixed single-night stay, the booking flow only asks for an arrival
    // date. >1 = the guest picks an arrival+departure range, capped here.
    private Integer maxNights;

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
        private List<String> gallery;
        // Per person per night, one price per guest type. priceFrom = the adult price.
        private java.math.BigDecimal priceFrom;
        private java.math.BigDecimal adultPrice;
        private java.math.BigDecimal childPrice;
        private java.math.BigDecimal infantPrice;
        private Integer capacity;
        private String sleeps;
        // The two amenity facts that actually differ per tier - see
        // AccommodationType.airConditioned/privateBathroom.
        private boolean airConditioned;
        private boolean privateBathroom;
        private List<String> features;
        // AccommodationType.maxUnits - null means inventory isn't configured
        // (no ceiling to enforce, same UNKNOWN semantics as availability).
        private Integer maxUnits;
    }
}
