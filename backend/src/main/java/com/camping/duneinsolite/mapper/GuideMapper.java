package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.GuideRequest;
import com.camping.duneinsolite.dto.request.GuideUpdateRequest;
import com.camping.duneinsolite.dto.response.GuideResponse;
import com.camping.duneinsolite.model.Guide;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface GuideMapper {

    @Mapping(target = "reservation", ignore = true)
    Guide toEntity(GuideRequest request);

    @Mapping(source = "reservation.reservationId", target = "reservationId")
    GuideResponse toResponse(Guide guide);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "reservation", ignore = true)
    void updateEntity(GuideUpdateRequest request, @MappingTarget Guide guide);
}