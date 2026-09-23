package com.camping.duneinsolite.dto.response.publicapi;

import com.camping.duneinsolite.model.enums.GuideType;
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
    /** True when this circuit sleeps a night at the Sabria camp — the guest
     *  can then pick a priced accommodation tier the same catalogue the
     *  nuitée-campement offers (there's only one physical camp). */
    private Boolean overnightsAtCamp;
    /** Shared bookable Sabria tiers offered by circuit booking forms. */
    private List<PublicStayResponse.Accommodation> accommodations;
    /** Slug of the stay that is the circuit camp (availability is queried against it); null when none is set. */
    private String campStaySlug;
    private List<String> languages;
    private String coverImage;
    private List<String> gallery;
    private List<String> highlights;
    private List<String> included;
    private List<String> notIncluded;
    private List<ItineraryStep> itinerary;
    private CancellationPolicy cancellationPolicy;
    private BigDecimal priceFrom;
    // Only set when a real sale is running (salePriceAdult < passengerAdultPrice)
    // - the "was" price to render struck-through. Null means no discount.
    private BigDecimal originalPriceFrom;
    private BigDecimal passengerAdultPrice;
    private BigDecimal passengerChildPrice;
    private Double averageRating;
    private Integer reviewCount;
    // Real count of CONFIRMED/CHECKED_IN/COMPLETED bookings created
    // yesterday (server-local calendar day) - never fabricated, 0 when none.
    private long bookedYesterdayCount;

    private GuideType guideType;
    private Boolean foodIncluded;
    private List<Meal> meals;
    private Boolean drinksIncluded;
    private List<String> dietaryRestrictions;
    private Boolean transportIncluded;
    private List<String> transportModes;

    private List<String> notSuitableFor;
    private List<String> notAllowed;
    private Boolean animalsAccepted;
    private String petPolicyNote;
    private List<String> mustBring;
    private String goodToKnow;
    private String emergencyPhone;
    private String ticketInfo;

    @Data
    public static class ItineraryStep {
        private String label;
        private String title;
        private String description;
        private String segmentType;
        private Boolean optionalSegment;
        private Integer durationMinutes;
    }

    @Data
    public static class Meal {
        private String mealType;
        private String format;
    }

    @Data
    public static class CancellationPolicy {
        private Boolean freeCancellation;
        private Integer hoursBeforeDeadline;
    }
}
