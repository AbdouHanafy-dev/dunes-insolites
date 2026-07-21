package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.CampingSettingsRequest;
import com.camping.duneinsolite.dto.response.CampingSettingsResponse;

public interface CampingSettingsService {
    CampingSettingsResponse getSettings();
    CampingSettingsResponse updateSettings(CampingSettingsRequest request);
}
