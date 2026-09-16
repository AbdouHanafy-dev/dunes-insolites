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

@Service
@RequiredArgsConstructor
public class SiteSettingsServiceImpl implements SiteSettingsService {

    // Always exactly one row, seeded by V11__site_settings.sql - unlike
    // CampingSettings there is no "not configured yet" state to report.
    private static final Long SETTINGS_ID = 1L;

    private final SiteSettingsRepository siteSettingsRepository;

    @Override
    @Transactional(readOnly = true)
    public SiteSettingsResponse getSettings() {
        return toResponse(findOrThrow());
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
        return toResponse(siteSettingsRepository.save(settings));
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
        response.setUpdatedAt(settings.getUpdatedAt());
        return response;
    }
}
