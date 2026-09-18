package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.TourRequest;
import com.camping.duneinsolite.dto.request.TourUpdateRequest;
import com.camping.duneinsolite.dto.response.TourResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicTourResponse;
import java.util.List;
import java.util.UUID;

public interface TourService {
    TourResponse createTour(TourRequest request);
    TourResponse updateTour(UUID tourId, TourUpdateRequest request);
    void deleteTour(UUID tourId);
    TourResponse getTourById(UUID tourId);
    List<TourResponse> getAllTours();
    List<TourResponse> getActiveTours();
    TourResponse deactivateTour(UUID tourId);
    List<PublicTourResponse> getPublicTours(String locale);
    PublicTourResponse getPublicTourBySlug(String slug, String locale);
}