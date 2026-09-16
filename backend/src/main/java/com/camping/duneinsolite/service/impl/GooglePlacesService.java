package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.config.GooglePlacesProperties;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;

/**
 * The REAL Google Business rating for this camp — on request, 15 Sep
 * 2026: "the rating from Google, don't invent one, that's fake". Calls
 * Places API's Place Details endpoint for exactly two fields (rating,
 * user_ratings_total); never guesses, never falls back to a made-up
 * number. SiteSettingsServiceImpl caches whatever this returns rather
 * than calling Google on every visitor's page load.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GooglePlacesService {

    private final GooglePlacesProperties properties;
    private final RestTemplate restTemplate;

    public record Rating(BigDecimal value, Integer count) {
    }

    /** Null if not configured, the place has no rating yet, or the call fails - never a fabricated value. */
    public Rating fetchRating(String placeId) {
        if (!properties.isConfigured() || placeId == null || placeId.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(
                    "https://maps.googleapis.com/maps/api/place/details/json"
                            + "?place_id=" + placeId
                            + "&fields=rating,user_ratings_total"
                            + "&key=" + properties.getApiKey());
            JsonNode body = restTemplate.getForObject(uri, JsonNode.class);
            if (body == null || !"OK".equals(body.path("status").asText())) {
                log.warn("Google Places lookup for {} returned status: {}",
                        placeId, body == null ? "no body" : body.path("status").asText());
                return null;
            }
            JsonNode result = body.path("result");
            if (!result.hasNonNull("rating")) {
                return null;
            }
            BigDecimal rating = BigDecimal.valueOf(result.path("rating").asDouble())
                    .setScale(1, RoundingMode.HALF_UP);
            Integer count = result.hasNonNull("user_ratings_total")
                    ? result.path("user_ratings_total").asInt() : null;
            return new Rating(rating, count);
        } catch (Exception e) {
            log.warn("Google Places lookup for {} failed: {}", placeId, e.getMessage());
            return null;
        }
    }
}
