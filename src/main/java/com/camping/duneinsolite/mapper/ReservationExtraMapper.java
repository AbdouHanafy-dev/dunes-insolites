package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.response.ReservationExtraResponse;
import com.camping.duneinsolite.model.ReservationExtra;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ReservationExtraMapper {

    @Mapping(source = "reservation.reservationId", target = "reservationId")
    @Mapping(source = "activityDate", target = "activityDate")
    ReservationExtraResponse toResponse(ReservationExtra extra);
}