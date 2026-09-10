package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.GalleryImageRequest;
import com.camping.duneinsolite.dto.response.GalleryImageResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicGalleryItemResponse;

import java.util.List;
import java.util.UUID;

public interface GalleryService {

    GalleryImageResponse create(GalleryImageRequest request);

    GalleryImageResponse getById(UUID galleryItemId);

    List<GalleryImageResponse> getAll();

    GalleryImageResponse update(UUID galleryItemId, GalleryImageRequest request);

    void delete(UUID galleryItemId);

    /** Vitrine-facing: the DUNES_INSOLITES gallery, ordered for display. */
    List<PublicGalleryItemResponse> getPublicGallery();
}
