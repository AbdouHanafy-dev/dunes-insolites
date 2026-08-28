package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.ContentBlockRequest;
import com.camping.duneinsolite.dto.response.ContentBlockResponse;
import com.camping.duneinsolite.model.ContentBlock;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ContentBlockMapper {

    ContentBlockResponse toResponse(ContentBlock block);

    @Mapping(target = "blockId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    ContentBlock toEntity(ContentBlockRequest request);

    @Mapping(target = "blockId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(ContentBlockRequest request, @MappingTarget ContentBlock block);
}
