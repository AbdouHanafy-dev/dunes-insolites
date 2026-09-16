package com.camping.duneinsolite.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Google Places API key for the real, live business rating (on request,
 * 15 Sep 2026 — never compute or invent this, only ever show Google's own
 * number). Empty by default, same "not configured" convention as
 * GoogleSeoProperties — GooglePlacesService simply skips the fetch and
 * leaves SiteSettings.googleRating null until this is set.
 */
@Component
@Getter
public class GooglePlacesProperties {

    @Value("${google.places.api-key:}")
    private String apiKey;

    public boolean isConfigured() {
        return !apiKey.isBlank();
    }
}
