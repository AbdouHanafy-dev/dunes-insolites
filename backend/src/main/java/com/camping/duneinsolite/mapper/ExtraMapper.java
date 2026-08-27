package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.ExtraRequest;
import com.camping.duneinsolite.dto.response.ExtraResponse;
import com.camping.duneinsolite.model.Extra;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ExtraMapper {
    ExtraResponse toResponse(Extra extra);

    // Translations are entities owning their own FK back to the Extra, which
    // MapStruct can't wire up from a flat DTO - synced explicitly in
    // ExtraServiceImpl instead (see syncTranslations).
    @Mapping(target = "translations", ignore = true)
    Extra toEntity(ExtraRequest request);

    @Mapping(target = "translations", ignore = true)
    void updateEntity(ExtraRequest request, @MappingTarget Extra extra);
}