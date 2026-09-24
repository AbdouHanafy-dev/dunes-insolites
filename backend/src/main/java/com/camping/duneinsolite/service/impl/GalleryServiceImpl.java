package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.GalleryImageRequest;
import com.camping.duneinsolite.dto.response.GalleryImageResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicGalleryItemResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.GalleryImageMapper;
import com.camping.duneinsolite.model.GalleryImage;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.repository.GalleryImageRepository;
import com.camping.duneinsolite.service.GalleryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class GalleryServiceImpl implements GalleryService {

    private final GalleryImageRepository galleryImageRepository;
    private final GalleryImageMapper galleryImageMapper;

    @Override
    public GalleryImageResponse create(GalleryImageRequest request) {
        GalleryImage image = galleryImageMapper.toEntity(request);
        applyDefaults(image, request);
        return galleryImageMapper.toResponse(galleryImageRepository.save(image));
    }

    @Override
    @Transactional(readOnly = true)
    public GalleryImageResponse getById(UUID galleryItemId) {
        return galleryImageMapper.toResponse(findById(galleryItemId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<GalleryImageResponse> getAll() {
        return galleryImageRepository.findAllByOrderByPositionAscCreatedAtAsc().stream()
                .map(galleryImageMapper::toResponse).toList();
    }

    @Override
    public GalleryImageResponse update(UUID galleryItemId, GalleryImageRequest request) {
        GalleryImage image = findById(galleryItemId);
        galleryImageMapper.updateEntity(request, image);
        applyDefaults(image, request);
        return galleryImageMapper.toResponse(galleryImageRepository.save(image));
    }

    @Override
    public void reorder(List<UUID> ids) {
        Map<UUID, GalleryImage> byId = galleryImageRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(GalleryImage::getGalleryItemId, g -> g));
        int position = 1;
        for (UUID id : ids) {
            GalleryImage image = byId.get(id);
            if (image != null) image.setPosition(position++);
        }
    }

    @Override
    public void delete(UUID galleryItemId) {
        galleryImageRepository.delete(findById(galleryItemId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicGalleryItemResponse> getPublicGallery() {
        return galleryImageRepository
                .findAllByCompanyTypeOrderByPositionAscCreatedAtAsc(CompanyType.DUNES_INSOLITES)
                .stream().map(galleryImageMapper::toPublicResponse).toList();
    }

    // tall / position / companyType are nullable on the request (the mapper
    // ignores them) — fill them here so a minimal create still lands a valid row.
    private void applyDefaults(GalleryImage image, GalleryImageRequest request) {
        image.setTall(Boolean.TRUE.equals(request.getTall()));
        image.setPosition(request.getPosition() != null ? request.getPosition() : 0);
        image.setCompanyType(request.getCompanyType() != null
                ? request.getCompanyType() : CompanyType.DUNES_INSOLITES);
    }

    private GalleryImage findById(UUID galleryItemId) {
        return galleryImageRepository.findById(galleryItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Gallery image not found: " + galleryItemId));
    }
}
