package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.CampingSettingsRequest;
import com.camping.duneinsolite.dto.response.CampingSettingsResponse;
import com.camping.duneinsolite.model.CampingSettings;
import com.camping.duneinsolite.repository.CampingSettingsRepository;
import com.camping.duneinsolite.service.CampingSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CampingSettingsServiceImpl implements CampingSettingsService {

    private static final Long SETTINGS_ID = 1L;

    private final CampingSettingsRepository campingSettingsRepository;

    @Override
    @Transactional(readOnly = true)
    public CampingSettingsResponse getSettings() {
        return campingSettingsRepository.findById(SETTINGS_ID)
                .map(this::toResponse)
                .orElseGet(() -> {
                    CampingSettingsResponse response = new CampingSettingsResponse();
                    response.setConfigured(false);
                    return response;
                });
    }

    @Override
    @Transactional
    public CampingSettingsResponse updateSettings(CampingSettingsRequest request) {
        CampingSettings settings = campingSettingsRepository.findById(SETTINGS_ID)
                .orElseGet(() -> CampingSettings.builder().id(SETTINGS_ID).build());

        settings.setMaxCapacity(request.getMaxCapacity());

        return toResponse(campingSettingsRepository.save(settings));
    }

    private CampingSettingsResponse toResponse(CampingSettings settings) {
        CampingSettingsResponse response = new CampingSettingsResponse();
        response.setMaxCapacity(settings.getMaxCapacity());
        response.setConfigured(true);
        response.setUpdatedAt(settings.getUpdatedAt());
        return response;
    }
}
