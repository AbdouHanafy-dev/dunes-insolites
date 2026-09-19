package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.response.SpokenLanguageResponse;
import com.camping.duneinsolite.model.SpokenLanguage;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SpokenLanguageMapper {
    SpokenLanguageResponse toResponse(SpokenLanguage language);
}
