package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.GuideRequest;
import com.camping.duneinsolite.dto.request.GuideUpdateRequest;
import com.camping.duneinsolite.dto.response.GuideResponse;
import java.util.List;
import java.util.UUID;

public interface GuideService {
    GuideResponse create(GuideRequest request);
    GuideResponse getById(UUID id);
    List<GuideResponse> getByReservation(UUID reservationId);
    GuideResponse update(UUID id, GuideUpdateRequest request);
    void delete(UUID id);
    void deleteAllByReservation(UUID reservationId);
}