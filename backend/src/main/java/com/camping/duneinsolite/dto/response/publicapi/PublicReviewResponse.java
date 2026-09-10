package com.camping.duneinsolite.dto.response.publicapi;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Wire shape matches packages/api-types' Review type exactly - id, name,
 * rating, date (YYYY-MM-DD), body, activitySlug/staySlug (whichever applies,
 * both null for a review on a Route Insolite Tour, which the Dunes vitrine
 * never renders), source. `country` and `title` are intentionally omitted
 * (left null): this schema's Review entity has no country field, and no
 * headline field - inventing either would be exactly the fabrication
 * CLAUDE.md forbids. The frontend Review type already documents both as
 * optional for this reason ("Not every platform gives a review a
 * headline... Omit rather than invent one").
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicReviewResponse {
    private String id;
    private String name;
    private Integer rating;
    private String date;
    private String body;
    private String activitySlug;
    private String staySlug;
    /** Always "direct" - the only source this in-app review system ever
     *  produces. A future import from GetYourGuide/TripAdvisor/Google would
     *  need its own real ingestion path, not this one relabeled. */
    private String source;
}
