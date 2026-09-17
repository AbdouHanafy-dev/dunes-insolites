package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.TourRequest;
import com.camping.duneinsolite.dto.request.TourUpdateRequest;
import com.camping.duneinsolite.dto.response.TourResponse;
import com.camping.duneinsolite.model.Tour;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TourMapper {

    TourResponse toResponse(Tour tour);

    // Translations are entities owning their own FK back to the Tour, which
    // MapStruct can't wire up from a flat DTO - synced explicitly in
    // TourServiceImpl instead (see syncTranslations), same as TourType/Extra.
    @Mapping(target = "translations", ignore = true)
    Tour toEntity(TourRequest request);

    @Mapping(target = "translations", ignore = true)
    void updateEntity(TourUpdateRequest request, @MappingTarget Tour tour);
}