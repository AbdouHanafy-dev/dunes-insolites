package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.NavigationItemRequest;
import com.camping.duneinsolite.dto.response.NavigationItemResponse;
import com.camping.duneinsolite.model.NavigationItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface NavigationItemMapper {

    NavigationItemResponse toResponse(NavigationItem item);

    @Mapping(target = "navItemId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    NavigationItem toEntity(NavigationItemRequest request);

    @Mapping(target = "navItemId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(NavigationItemRequest request, @MappingTarget NavigationItem item);
}
