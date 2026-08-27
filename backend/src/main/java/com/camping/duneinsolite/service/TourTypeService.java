package com.camping.duneinsolite.service;


import com.camping.duneinsolite.dto.request.TourTypeRequest;
import com.camping.duneinsolite.dto.response.TourTypeResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicStayResponse;
import java.util.List;
import java.util.UUID;

public interface TourTypeService {
    TourTypeResponse createTourType(TourTypeRequest request);
    TourTypeResponse getTourTypeById(UUID tourTypeId);
    List<TourTypeResponse> getAllTourTypes();
    TourTypeResponse updateTourType(UUID tourTypeId, TourTypeRequest request);
    void deleteTourType(UUID tourTypeId);
    TourTypeResponse deactivateTourType(UUID tourTypeId);

    // ── Public, vitrine-shaped reads (DI-012) ──────────────────────────
    List<PublicStayResponse> getPublicStays(String locale);
    PublicStayResponse getPublicStayBySlug(String slug, String locale);
}
