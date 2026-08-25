package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.TourRequest;
import com.camping.duneinsolite.dto.request.TourUpdateRequest;
import com.camping.duneinsolite.dto.response.TourResponse;
import com.camping.duneinsolite.model.Tour;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TourMapper {

    TourResponse toResponse(Tour tour);

    Tour toEntity(TourRequest request);

    void updateEntity(TourUpdateRequest request, @MappingTarget Tour tour);
}