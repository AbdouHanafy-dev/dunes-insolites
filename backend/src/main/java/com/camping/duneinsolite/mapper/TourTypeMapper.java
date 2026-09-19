package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.TourTypeRequest;
import com.camping.duneinsolite.dto.response.TourTypeResponse;
import com.camping.duneinsolite.model.TourType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring", uses = SpokenLanguageMapper.class)
public interface TourTypeMapper {
    TourTypeResponse toResponse(TourType tourType);

    // Translations are entities owning their own FK back to the TourType,
    // which MapStruct can't wire up from a flat DTO - synced explicitly in
    // TourTypeServiceImpl instead (see syncTranslations). languages is
    // resolved from languageIds by TourTypeServiceImpl (needs a repository
    // lookup MapStruct can't do) - never set here.
    @Mapping(target = "translations", ignore = true)
    @Mapping(target = "languages", ignore = true)
    TourType toEntity(TourTypeRequest request);

    @Mapping(target = "translations", ignore = true)
    @Mapping(target = "languages", ignore = true)
    void updateEntity(TourTypeRequest request, @MappingTarget TourType tourType);
}