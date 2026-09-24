package com.camping.duneinsolite.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class SiteSettingsResponse {
    private String email;
    private String phone;
    private String whatsapp;
    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String instagramUrl;
    private String facebookUrl;
    private String tiktokUrl;
    private String guestsGuided;
    private String yearsRunning;
    private String googlePlaceId;
    // Null until a real placeId is set and the first fetch succeeds -
    // never a fabricated value. See GooglePlacesService.
    private BigDecimal googleRating;
    private Integer googleRatingCount;
    // The hand-entered values, exposed so the admin form can edit them;
    // googleRating/googleRatingCount above already fall back to these.
    private BigDecimal manualGoogleRating;
    private Integer manualGoogleRatingCount;
    private LocalDateTime updatedAt;
}
