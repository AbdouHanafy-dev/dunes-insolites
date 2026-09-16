package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.SiteSettingsRequest;
import com.camping.duneinsolite.dto.response.SiteSettingsResponse;

public interface SiteSettingsService {
    SiteSettingsResponse getSettings();

    SiteSettingsResponse updateSettings(SiteSettingsRequest request);
}
