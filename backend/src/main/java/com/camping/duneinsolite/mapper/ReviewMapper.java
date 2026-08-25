package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.ReviewUpdateRequest;
import com.camping.duneinsolite.dto.response.ReviewResponse;
import com.camping.duneinsolite.model.Review;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ReviewMapper {

    @Mapping(source = "user.userId", target = "userId")
    @Mapping(source = "user.name", target = "userName")
    ReviewResponse toResponse(Review review);

    void updateEntity(ReviewUpdateRequest request, @MappingTarget Review review);
}
