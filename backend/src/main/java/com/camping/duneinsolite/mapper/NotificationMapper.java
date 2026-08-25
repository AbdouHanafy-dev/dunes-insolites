package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.response.NotificationResponse;
import com.camping.duneinsolite.model.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    @Mapping(source = "user.userId", target = "userId")
    @Mapping(source = "user.name", target = "userName")
    NotificationResponse toResponse(Notification notification);
}