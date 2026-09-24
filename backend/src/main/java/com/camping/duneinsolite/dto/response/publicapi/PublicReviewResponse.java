package com.camping.duneinsolite.dto.response.publicapi;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Wire shape matches packages/api-types' Review type exactly - id, name,
 * rating, date (YYYY-MM-DD), body, activitySlug/staySlug/tourSlug (whichever
 * applies, the other two null), source. `country` and `title` are
 * intentionally omitted (left null): this schema's Review entity has no
 * country field, and no headline field - inventing either would be exactly
 * the fabrication CLAUDE.md forbids. The frontend Review type already
 * documents both as optional for this reason ("Not every platform gives a
 * review a headline... Omit rather than invent one").
 *
 * tourSlug added 18 Sep 2026 alongside PublicTourController - the Dunes
 * vitrine now does render Tour-scoped content (see CLAUDE.md's "multi-day
 * touring" note), so a Tour review needs to actually reach its detail page.
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
    private String tourSlug;
    /** "direct" for this app's own in-app reviews; otherwise the platform an
     *  ExternalReview was copied from (google, tripadvisor, ...). */
    private String source;

    // Only set for reviews copied from another platform (ExternalReview);
    // null for in-app reviews, which have none of these.
    private String platformName;
    private String platformColor;
    private String country;
    private String title;
    private String tripType;
    private String sourceUrl;
    private String ownerReply;
    private String ownerReplyDate;
}
