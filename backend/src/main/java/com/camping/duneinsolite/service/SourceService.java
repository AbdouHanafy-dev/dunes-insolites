package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.SourceRequest;
import com.camping.duneinsolite.dto.response.SourceResponse;
import java.util.List;
import java.util.UUID;

public interface SourceService {
    SourceResponse create(SourceRequest request);
    SourceResponse getById(UUID id);
    List<SourceResponse> getAll();
    SourceResponse update(UUID id, SourceRequest request);
    void delete(UUID id);
}