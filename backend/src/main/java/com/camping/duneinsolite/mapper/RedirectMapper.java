package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.RedirectRequest;
import com.camping.duneinsolite.dto.response.RedirectResponse;
import com.camping.duneinsolite.model.Redirect;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface RedirectMapper {

    RedirectResponse toResponse(Redirect redirect);

    @Mapping(target = "redirectId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Redirect toEntity(RedirectRequest request);

    @Mapping(target = "redirectId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(RedirectRequest request, @MappingTarget Redirect redirect);
}
