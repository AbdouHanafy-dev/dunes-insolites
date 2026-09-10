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
    private Integer durationMins;
    private String difficulty;
    private String groupSize;
    private List<String> included;
    private List<String> notIncluded;
    private String meetingPoint;
    private List<String> slots;
}
