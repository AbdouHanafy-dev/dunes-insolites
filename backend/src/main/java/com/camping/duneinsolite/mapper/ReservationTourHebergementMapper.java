package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.response.TourHebergementResponseDto;
import com.camping.duneinsolite.model.ReservationTourHebergement;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ReservationTourHebergementMapper {
    TourHebergementResponseDto toResponse(ReservationTourHebergement hebergement);
}
