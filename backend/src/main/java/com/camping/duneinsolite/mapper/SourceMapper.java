package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.SourceRequest;
import com.camping.duneinsolite.dto.response.SourceResponse;
import com.camping.duneinsolite.model.Source;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SourceMapper {
    Source toEntity(SourceRequest request);
    SourceResponse toResponse(Source source);
    void updateEntity(SourceRequest request, @MappingTarget Source source);
}