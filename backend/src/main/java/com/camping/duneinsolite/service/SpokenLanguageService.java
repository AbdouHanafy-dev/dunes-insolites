package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.SpokenLanguageRequest;
import com.camping.duneinsolite.dto.request.SpokenLanguageUpdateRequest;
import com.camping.duneinsolite.dto.response.SpokenLanguageResponse;
import java.util.List;
import java.util.UUID;

public interface SpokenLanguageService {
    SpokenLanguageResponse create(SpokenLanguageRequest request);
    List<SpokenLanguageResponse> getAll();
    List<SpokenLanguageResponse> getAllActive();
    SpokenLanguageResponse update(UUID id, SpokenLanguageUpdateRequest request);
}
