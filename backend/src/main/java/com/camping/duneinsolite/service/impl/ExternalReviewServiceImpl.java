package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ExternalReviewRequest;
import com.camping.duneinsolite.dto.response.ExternalReviewResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicReviewResponse;
import com.camping.duneinsolite.exception.InvalidReviewPlatformException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.ExternalReviewMapper;
import com.camping.duneinsolite.model.ExternalReview;
import com.camping.duneinsolite.model.ReviewPlatform;
import com.camping.duneinsolite.repository.ExternalReviewRepository;
import com.camping.duneinsolite.repository.ReviewPlatformRepository;
import com.camping.duneinsolite.service.ExternalReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ExternalReviewServiceImpl implements ExternalReviewService {

    private final ExternalReviewRepository repository;
    private final ReviewPlatformRepository platformRepository;
    private final ExternalReviewMapper mapper;

    @Override
    public ExternalReviewResponse create(ExternalReviewRequest request) {
        ExternalReview review = mapper.toEntity(request);
        review.setPublished(request.getPublished() == null || request.getPublished());
        review.setPlatform(resolvePlatform(request));
        normalise(review);
        return mapper.toResponse(repository.save(review));
    }

    @Override
    public ExternalReviewResponse update(UUID externalReviewId, ExternalReviewRequest request) {
        ExternalReview review = findOrThrow(externalReviewId);
        mapper.updateEntity(request, review);
        if (request.getPublished() != null) {
            review.setPublished(request.getPublished());
        }
        review.setPlatform(resolvePlatform(request));
        normalise(review);
        return mapper.toResponse(repository.save(review));
    }

    @Override
    public void delete(UUID externalReviewId) {
        repository.delete(findOrThrow(externalReviewId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExternalReviewResponse> getAll() {
        return repository.findAllByOrderByReviewDateDescCreatedAtDesc().stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicReviewResponse> getPublished() {
        return repository.findByPublishedTrueOrderByReviewDateDescCreatedAtDesc().stream()
                .map(mapper::toPublicResponse)
                .toList();
    }

    /** The chosen platform, or — for one not in the list yet — the existing
     *  platform of that name, or a newly created one. */
    private ReviewPlatform resolvePlatform(ExternalReviewRequest request) {
        if (request.getPlatformId() != null) {
            return platformRepository.findById(request.getPlatformId())
                    .orElseThrow(() -> new InvalidReviewPlatformException("Plateforme introuvable"));
        }
        String name = blankToNull(request.getNewPlatformName() == null ? null : request.getNewPlatformName().trim());
        if (name == null) {
            throw new InvalidReviewPlatformException("Choisissez une plateforme ou saisissez le nom d'une nouvelle");
        }
        return platformRepository.findByNameIgnoreCase(name).orElseGet(() -> platformRepository.save(
                ReviewPlatform.builder()
                        .name(name)
                        .color(request.getNewPlatformColor() != null
                                ? request.getNewPlatformColor()
                                : ReviewPlatform.DEFAULT_COLOR)
                        .build()));
    }

    private ExternalReview findOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("External review not found: " + id));
    }

    // Blank optional fields are stored as null, never as empty strings;
    // the review text itself is left exactly as entered.
    private static void normalise(ExternalReview review) {
        review.setCountry(blankToNull(review.getCountry()));
        review.setTitle(blankToNull(review.getTitle()));
        review.setSourceUrl(blankToNull(review.getSourceUrl()));
        review.setTripType(blankToNull(review.getTripType()));
        review.setOwnerReply(blankToNull(review.getOwnerReply()));
        if (review.getOwnerReply() == null) {
            review.setOwnerReplyDate(null);
        }
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}
