package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.request.GalleryImageRequest;
import com.camping.duneinsolite.dto.response.GalleryImageResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicGalleryItemResponse;
import com.camping.duneinsolite.model.GalleryImage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface GalleryImageMapper {

    GalleryImageResponse toResponse(GalleryImage image);

    @Mapping(target = "src", source = "imageUrl")
    PublicGalleryItemResponse toPublicResponse(GalleryImage image);

    // tall / position / companyType are nullable on the request and are set
    // explicitly by the service (with defaults) after this runs — ignoring them
    // here also avoids a null-unboxing NPE on the primitive `tall`.
    @Mapping(target = "galleryItemId", ignore = true)
    @Mapping(target = "tall", ignore = true)
    @Mapping(target = "position", ignore = true)
    @Mapping(target = "companyType", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    GalleryImage toEntity(GalleryImageRequest request);

    @Mapping(target = "galleryItemId", ignore = true)
    @Mapping(target = "tall", ignore = true)
    @Mapping(target = "position", ignore = true)
    @Mapping(target = "companyType", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(GalleryImageRequest request, @MappingTarget GalleryImage image);
}
