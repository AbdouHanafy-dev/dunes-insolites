package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ReviewPlatformRequest;
import com.camping.duneinsolite.dto.response.ReviewPlatformResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.ReviewPlatform;
import com.camping.duneinsolite.repository.ExternalReviewRepository;
import com.camping.duneinsolite.repository.ReviewPlatformRepository;
import com.camping.duneinsolite.service.ReviewPlatformService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewPlatformServiceImpl implements ReviewPlatformService {

    private final ReviewPlatformRepository platformRepository;
    private final ExternalReviewRepository externalReviewRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ReviewPlatformResponse> getAll() {
        return platformRepository.findAllByOrderByNameAsc().stream().map(this::toResponse).toList();
    }

    @Override
    public ReviewPlatformResponse create(ReviewPlatformRequest request) {
        String name = request.getName().trim();
        if (platformRepository.findByNameIgnoreCase(name).isPresent()) {
            throw new ConflictException("Une plateforme nommée « " + name + " » existe déjà");
        }
        ReviewPlatform platform = ReviewPlatform.builder().name(name).color(request.getColor()).build();
        return toResponse(platformRepository.save(platform));
    }

    @Override
    public ReviewPlatformResponse update(UUID platformId, ReviewPlatformRequest request) {
        ReviewPlatform platform = findOrThrow(platformId);
        String name = request.getName().trim();
        platformRepository.findByNameIgnoreCase(name)
                .filter(other -> !other.getPlatformId().equals(platformId))
                .ifPresent(other -> {
                    throw new ConflictException("Une plateforme nommée « " + name + " » existe déjà");
                });
        platform.setName(name);
        platform.setColor(request.getColor());
        return toResponse(platformRepository.save(platform));
    }

    @Override
    public void delete(UUID platformId) {
        ReviewPlatform platform = findOrThrow(platformId);
        if (externalReviewRepository.countByPlatform_PlatformId(platformId) > 0) {
            throw new ConflictException(
                    "Cette plateforme est utilisée par des avis — supprimez ou déplacez-les d'abord");
        }
        platformRepository.delete(platform);
    }

    private ReviewPlatform findOrThrow(UUID platformId) {
        return platformRepository.findById(platformId)
                .orElseThrow(() -> new ResourceNotFoundException("Review platform not found: " + platformId));
    }

    private ReviewPlatformResponse toResponse(ReviewPlatform platform) {
        return ReviewPlatformResponse.builder()
                .platformId(platform.getPlatformId())
                .name(platform.getName())
                .color(platform.getColor())
                .builtIn(platform.getSourceKey() != null)
                .reviewCount(externalReviewRepository.countByPlatform_PlatformId(platform.getPlatformId()))
                .build();
    }
}
