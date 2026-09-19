package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.ChauffeurRequest;
import com.camping.duneinsolite.dto.request.ChauffeurUpdateRequest;
import com.camping.duneinsolite.dto.response.ChauffeurResponse;
import com.camping.duneinsolite.model.Chauffeur;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface ChauffeurMapper {

    @Mapping(target = "reservation", ignore = true)
    @Mapping(target = "driverUser", ignore = true)
    @Mapping(target = "driverProfile", ignore = true)
    Chauffeur toEntity(ChauffeurRequest request);

    @Mapping(source = "reservation.reservationId", target = "reservationId")
    @Mapping(source = "driverProfile.driverProfileId", target = "driverProfileId")
    @Mapping(source = "driverUser.userId", target = "driverUserId")
    @Mapping(source = "driverUser.email", target = "driverUserEmail")
    @Mapping(source = "reservation.user.name", target = "clientName")
    @Mapping(source = "reservation.serviceDate", target = "tourDate")
    ChauffeurResponse toResponse(Chauffeur chauffeur);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "reservation", ignore = true)
    @Mapping(target = "driverUser", ignore = true)
    @Mapping(target = "driverProfile", ignore = true)
    void updateEntity(ChauffeurUpdateRequest request, @MappingTarget Chauffeur chauffeur);
}
