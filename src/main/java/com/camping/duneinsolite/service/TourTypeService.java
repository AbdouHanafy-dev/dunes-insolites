package com.camping.duneinsolite.service;


import com.camping.duneinsolite.dto.request.TourTypeRequest;
import com.camping.duneinsolite.dto.response.TourTypeResponse;
import java.util.List;
import java.util.UUID;

public interface TourTypeService {
    TourTypeResponse createTourType(TourTypeRequest request);
    TourTypeResponse getTourTypeById(UUID tourTypeId);
    List<TourTypeResponse> getAllTourTypes();
    TourTypeResponse updateTourType(UUID tourTypeId, TourTypeRequest request);
    void deleteTourType(UUID tourTypeId);
    TourTypeResponse deactivateTourType(UUID tourTypeId);
}
