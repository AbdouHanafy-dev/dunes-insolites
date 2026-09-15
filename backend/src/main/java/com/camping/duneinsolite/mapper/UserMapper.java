package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.response.UserProductRemiseResponse;
import com.camping.duneinsolite.dto.response.UserResponse;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.UserProductRemise;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface UserMapper {

    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "name", source = "name")
    @Mapping(target = "email", source = "email")
    @Mapping(target = "phone", source = "phone")
    @Mapping(target = "role", source = "role")
    @Mapping(target = "customRoleName", source = "customRoleName")
    @Mapping(target = "termsAcceptedAt", source = "termsAcceptedAt")
    @Mapping(target = "loyaltyPoints", source = "loyaltyPoints")
    @Mapping(target = "loyaltyTier", source = "loyaltyTier")
    @Mapping(target = "matriculeFiscal", source = "matriculeFiscal")
    @Mapping(target = "agencyAddress", source = "agencyAddress")
    @Mapping(target = "hasSpecialRemise", source = "hasSpecialRemise")
    @Mapping(target = "remises", source = "remises")
    UserResponse toResponse(User user);

    @Mapping(target = "id", source = "id")
    @Mapping(target = "productId", source = "productId")
    @Mapping(target = "productType", source = "productType")
    @Mapping(target = "productName", source = "productName")
    @Mapping(target = "adultRemise", source = "adultRemise")
    @Mapping(target = "childRemise", source = "childRemise")
    @Mapping(target = "unitRemise", source = "unitRemise")
    UserProductRemiseResponse toRemiseResponse(UserProductRemise remise);
}