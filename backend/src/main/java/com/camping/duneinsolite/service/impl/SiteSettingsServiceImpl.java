package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.SiteSettingsRequest;
import com.camping.duneinsolite.dto.response.SiteSettingsResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.SiteSettings;
import com.camping.duneinsolite.repository.SiteSettingsRepository;
import com.camping.duneinsolite.service.SiteSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SiteSettingsServiceImpl implements SiteSettingsService {

    // Always exactly one row, seeded by V11__site_settings.sql - unlike
    // CampingSettings there is no "not configured yet" state to report.
    private static final Long SETTINGS_ID = 1L;

    // Every visitor's page load calls this (GET /api/public/site-settings)
    // - calling Google on every one of those would be wasteful and risks
    // the API's quota/cost. A real business rating doesn't move fast
    // enough to need fresher than this.
    private static final Duration GOOGLE_RATING_TTL = Duration.ofHours(24);

    private final SiteSettingsRepository siteSettingsRepository;
    private final GooglePlacesService googlePlacesService;

    @Override
    @Transactional
    public SiteSettingsResponse getSettings() {
        SiteSettings settings = findOrThrow();
        refreshGoogleRatingIfStale(settings);
        return toResponse(settings);
    }

    @Override
    @Transactional
    public SiteSettingsResponse updateSettings(SiteSettingsRequest request) {
        SiteSettings settings = findOrThrow();
        settings.setEmail(request.getEmail());
        settings.setPhone(request.getPhone());
        settings.setWhatsapp(request.getWhatsapp());
        settings.setAddress(request.getAddress());
        settings.setLatitude(request.getLatitude());
        settings.setLongitude(request.getLongitude());
        settings.setInstagramUrl(blankToNull(request.getInstagramUrl()));
        settings.setFacebookUrl(blankToNull(request.getFacebookUrl()));
        settings.setTiktokUrl(blankToNull(request.getTiktokUrl()));
        settings.setGuestsGuided(request.getGuestsGuided());
        settings.setYearsRunning(request.getYearsRunning());
        if (!java.util.Objects.equals(settings.getGooglePlaceId(), blankToNull(request.getGooglePlaceId()))) {
            // Place changed (or cleared) - the cached rating belongs to
            // the OLD place, so it must not survive as if it were the
            // new one's real number.
            settings.setGoogleRating(null);
            settings.setGoogleRatingCount(null);
            settings.setGoogleRatingFetchedAt(null);
        }
        settings.setGooglePlaceId(blankToNull(request.getGooglePlaceId()));
        SiteSettings saved = siteSettingsRepository.save(settings);
        refreshGoogleRatingIfStale(saved);
        return toResponse(saved);
    }

    private void refreshGoogleRatingIfStale(SiteSettings settings) {
        if (settings.getGooglePlaceId() == null) return;
        boolean stale = settings.getGoogleRatingFetchedAt() == null
                || settings.getGoogleRatingFetchedAt().isBefore(LocalDateTime.now().minus(GOOGLE_RATING_TTL));
        if (!stale) return;

        GooglePlacesService.Rating rating = googlePlacesService.fetchRating(settings.getGooglePlaceId());
        settings.setGoogleRatingFetchedAt(LocalDateTime.now());
        if (rating != null) {
            settings.setGoogleRating(rating.value());
            settings.setGoogleRatingCount(rating.count());
        }
        // A failed fetch still stamps fetchedAt - so a persistently broken
        // key/placeId retries once per TTL window, not on every request.
        siteSettingsRepository.save(settings);
    }

    private SiteSettings findOrThrow() {
        return siteSettingsRepository.findById(SETTINGS_ID)
                .orElseThrow(() -> new ResourceNotFoundException("Site settings row is missing"));
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    private SiteSettingsResponse toResponse(SiteSettings settings) {
        SiteSettingsResponse response = new SiteSettingsResponse();
        response.setEmail(settings.getEmail());
        response.setPhone(settings.getPhone());
        response.setWhatsapp(settings.getWhatsapp());
        response.setAddress(settings.getAddress());
        response.setLatitude(settings.getLatitude());
        response.setLongitude(settings.getLongitude());
        response.setInstagramUrl(settings.getInstagramUrl());
        response.setFacebookUrl(settings.getFacebookUrl());
        response.setTiktokUrl(settings.getTiktokUrl());
        response.setGuestsGuided(settings.getGuestsGuided());
        response.setYearsRunning(settings.getYearsRunning());
        response.setGooglePlaceId(settings.getGooglePlaceId());
        response.setGoogleRating(settings.getGoogleRating());
        response.setGoogleRatingCount(settings.getGoogleRatingCount());
        response.setUpdatedAt(settings.getUpdatedAt());
        return response;
    }
}
