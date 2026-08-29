package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.MaintenanceWindowRequest;
import com.camping.duneinsolite.dto.response.MaintenanceWindowResponse;
import com.camping.duneinsolite.model.MaintenanceWindow;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface MaintenanceWindowMapper {

    MaintenanceWindowResponse toResponse(MaintenanceWindow window);

    @Mapping(target = "maintenanceId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    MaintenanceWindow toEntity(MaintenanceWindowRequest request);

    @Mapping(target = "maintenanceId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(MaintenanceWindowRequest request, @MappingTarget MaintenanceWindow window);
}
