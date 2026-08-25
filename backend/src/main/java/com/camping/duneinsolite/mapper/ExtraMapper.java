package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.ExtraRequest;
import com.camping.duneinsolite.dto.response.ExtraResponse;
import com.camping.duneinsolite.model.Extra;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ExtraMapper {
    ExtraResponse toResponse(Extra extra);
    Extra toEntity(ExtraRequest request);
    void updateEntity(ExtraRequest request, @MappingTarget Extra extra);
}