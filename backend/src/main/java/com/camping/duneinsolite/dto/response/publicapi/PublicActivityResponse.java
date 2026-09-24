package com.camping.duneinsolite.dto.response.publicapi;

import lombok.Data;

import java.util.List;

/**
 * Wire shape for GET /api/public/activities{,/{slug}}. Field-for-field match
 * of packages/api-types' Activity type - projected from Extra. See
 * PublicActivityMapper for how fields the entity doesn't store (kicker,
 * tagline, longDescription, difficulty) are derived.
 */
@Data
public class PublicActivityResponse {
    private String slug;
    private String title;
    private String kicker;
    private String tagline;
    private String description;
    private List<String> longDescription;
    private String heroImage;
    private String cardImage;
    private List<String> gallery;
    private java.math.BigDecimal priceFrom;
    /** Back-office pricing unit (PER_UNIT, PER_PERSON, PER_DAY, PER_BOOKING, PER_VEHICLE) - lets the site estimate the same total the server charges. */
    private String pricingUnit;
    private Integer durationMins;
    /** Back-office timing, all in minutes: price is for one base duration; the guest may add steps up to the maximum. */
    private Integer baseDurationMinutes;
    private Integer durationStepMinutes;
    private Integer maxDurationMinutes;
    private String difficulty;
    private String groupSize;
    private List<String> included;
    private List<String> notIncluded;
    private String meetingPoint;
    private List<String> slots;
}
