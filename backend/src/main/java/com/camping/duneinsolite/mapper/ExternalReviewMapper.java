package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.ExternalReviewRequest;
import com.camping.duneinsolite.dto.response.ExternalReviewResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicReviewResponse;
import com.camping.duneinsolite.model.ExternalReview;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ExternalReviewMapper {

    @Mapping(target = "platformId", source = "platform.platformId")
    @Mapping(target = "platformName", source = "platform.name")
    @Mapping(target = "platformColor", source = "platform.color")
    ExternalReviewResponse toResponse(ExternalReview review);

    // published is nullable on the request and is set by the service
    // (default true); ignoring it here avoids unboxing a null Boolean.
    @Mapping(target = "externalReviewId", ignore = true)
    @Mapping(target = "published", ignore = true)
    @Mapping(target = "platform", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    ExternalReview toEntity(ExternalReviewRequest request);

    @Mapping(target = "externalReviewId", ignore = true)
    @Mapping(target = "published", ignore = true)
    @Mapping(target = "platform", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(ExternalReviewRequest request, @MappingTarget ExternalReview review);

    @Mapping(target = "id", expression = "java(review.getExternalReviewId().toString())")
    @Mapping(target = "name", source = "authorName")
    @Mapping(target = "date", expression = "java(review.getReviewDate().toString())")
    @Mapping(target = "source",
            expression = "java(review.getPlatform().getSourceKey() == null ? \"other\" : review.getPlatform().getSourceKey())")
    @Mapping(target = "platformName", source = "platform.name")
    @Mapping(target = "platformColor", source = "platform.color")
    @Mapping(target = "ownerReplyDate",
            expression = "java(review.getOwnerReplyDate() == null ? null : review.getOwnerReplyDate().toString())")
    @Mapping(target = "activitySlug", ignore = true)
    @Mapping(target = "staySlug", ignore = true)
    @Mapping(target = "tourSlug", ignore = true)
    PublicReviewResponse toPublicResponse(ExternalReview review);
}
