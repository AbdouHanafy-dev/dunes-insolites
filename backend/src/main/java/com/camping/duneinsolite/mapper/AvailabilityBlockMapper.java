package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.response.AvailabilityBlockResponse;
import com.camping.duneinsolite.model.AvailabilityBlock;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AvailabilityBlockMapper {

    @Mapping(target = "tourTypeId", source = "tourType.tourTypeId")
    @Mapping(target = "tourTypeName", source = "tourType.name")
    AvailabilityBlockResponse toResponse(AvailabilityBlock block);
}
