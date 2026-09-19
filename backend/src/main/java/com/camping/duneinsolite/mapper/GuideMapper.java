package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.GuideRequest;
import com.camping.duneinsolite.dto.request.GuideUpdateRequest;
import com.camping.duneinsolite.dto.response.GuideResponse;
import com.camping.duneinsolite.model.Guide;
import org.mapstruct.*;

@Mapper(componentModel = "spring", uses = SpokenLanguageMapper.class)
public interface GuideMapper {

    // languages resolved from languageIds by the service (needs a repository
    // lookup MapStruct can't do) - never set here.
    @Mapping(target = "reservation", ignore = true)
    @Mapping(target = "languages", ignore = true)
    Guide toEntity(GuideRequest request);

    @Mapping(source = "reservation.reservationId", target = "reservationId")
    @Mapping(source = "reservation.user.name", target = "clientName")
    @Mapping(source = "reservation.serviceDate", target = "tourDate")
    GuideResponse toResponse(Guide guide);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "reservation", ignore = true)
    @Mapping(target = "languages", ignore = true)
    void updateEntity(GuideUpdateRequest request, @MappingTarget Guide guide);
}