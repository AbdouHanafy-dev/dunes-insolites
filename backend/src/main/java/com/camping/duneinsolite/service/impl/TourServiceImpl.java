package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.dto.request.TourRequest;
import com.camping.duneinsolite.dto.request.TourUpdateRequest;
import com.camping.duneinsolite.dto.response.TourResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicTourResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.TourMapper;
import com.camping.duneinsolite.mapper.publicapi.PublicTourMapper;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.model.TourTranslation;
import com.camping.duneinsolite.model.enums.ProductType;
import com.camping.duneinsolite.repository.ReviewRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.UserProductRemiseRepository;
import com.camping.duneinsolite.service.TourService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TourServiceImpl implements TourService {

    private final TourRepository tourRepository;
    private final TourMapper tourMapper;
    private final PublicTourMapper publicTourMapper;
    private final UserProductRemiseRepository userProductRemiseRepository;
    private final ReviewRepository reviewRepository;
    private final SpokenLanguageResolver spokenLanguageResolver;

    @Override
    public TourResponse createTour(TourRequest request) {
        if (tourRepository.existsByName(request.getName())) {
            throw new ConflictException("A tour with the name '" + request.getName() + "' already exists");
        }
        Tour tour = tourMapper.toEntity(request);
        if (tour.getIsActive() == null) {
            tour.setIsActive(true);
        }
        tour.setLanguages(spokenLanguageResolver.resolve(request.getLanguageIds()));
        syncTranslations(tour, request.getTranslations());
        return tourMapper.toResponse(tourRepository.save(tour));
    }

    // Found live (CRUD audit): TourMapper.updateEntity has no
    // NullValuePropertyMappingStrategy.IGNORE, so a PUT that omits isActive
    // (legitimately optional in TourUpdateRequest) overwrote it with null -
    // which tours.is_active's NOT NULL constraint then rejected with a raw
    // SQL-error 400 instead of a clean update. Same bug class, same fix
    // shape as PageServiceImpl's noIndex/noFollow/status: "unspecified
    // means unchanged" is also the correct semantic here - a PUT that
    // doesn't mention isActive must not silently reactivate/deactivate a
    // product.
    @Override
    public TourResponse updateTour(UUID tourId, TourUpdateRequest request) {
        Tour tour = findById(tourId);
        Boolean previousIsActive = tour.getIsActive();
        tourMapper.updateEntity(request, tour);
        if (tour.getIsActive() == null) {
            tour.setIsActive(previousIsActive);
        }
        if (request.getLanguageIds() != null) {
            tour.setLanguages(spokenLanguageResolver.resolve(request.getLanguageIds()));
        }
        syncTranslations(tour, request.getTranslations());
        return tourMapper.toResponse(tourRepository.save(tour));
    }

    // Replaces the whole translation set on every save rather than diffing -
    // the admin wizard always submits the complete per-locale list, and
    // orphanRemoval on Tour.translations cleans up the rows that drop out.
    //
    // saveAndFlush() right after clear() is load-bearing, not decoration -
    // exact same reasoning as TourTypeServiceImpl.syncTranslations (see its
    // own comment): without it, Hibernate can batch the DELETEs for the
    // orphaned old translations and the INSERTs for the new ones into the
    // same flush with the INSERTs ordered first, 400ing on
    // (tour_id, locale)'s unique constraint when updating a Tour that
    // already has a translation for that locale. Harmless on create, where
    // getTranslations() is already empty and this flush has nothing to
    // delete.
    private void syncTranslations(Tour tour, List<CatalogTranslationDto> dtos) {
        tour.getTranslations().clear();
        tourRepository.saveAndFlush(tour);
        if (dtos == null) return;
        for (CatalogTranslationDto dto : dtos) {
            TourTranslation translation = new TourTranslation();
            translation.setTour(tour);
            translation.setLocale(dto.getLocale());
            translation.setName(dto.getName());
            translation.setDescription(dto.getDescription());
            translation.setAboutText(dto.getAboutText());
            translation.setHighlights(dto.getHighlights());
            translation.setIncludedItems(dto.getIncludedItems());
            translation.setNotIncludedItems(dto.getNotIncludedItems());
            translation.setProgramSteps(dto.getProgramSteps());
            tour.getTranslations().add(translation);
        }
    }

    @Override
    public void deleteTour(UUID tourId) {
        userProductRemiseRepository.deleteAllByProductId(tourId);
        reviewRepository.deleteAllByProductIdAndProductType(tourId, ProductType.TOUR);
        tourRepository.delete(findById(tourId));
    }

    @Override
    public TourResponse deactivateTour(UUID tourId) {
        Tour tour = findById(tourId);
        tour.setIsActive(false);
        return tourMapper.toResponse(tourRepository.save(tour));
    }

    @Override
    @Transactional(readOnly = true)
    public TourResponse getTourById(UUID tourId) {
        return tourMapper.toResponse(findById(tourId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TourResponse> getAllTours() {
        return tourRepository.findAll().stream()
                .map(tourMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TourResponse> getActiveTours() {
        return tourRepository.findByIsActiveTrue().stream()
                .map(tourMapper::toResponse)
                .toList();
    }

    private Tour findById(UUID tourId) {
        return tourRepository.findById(tourId)
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found: " + tourId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicTourResponse> getPublicTours(String locale) {
        return tourRepository.findByIsActiveTrue().stream()
                .filter(tour -> tour.getSlug() != null && !tour.getSlug().isBlank())
                .map(tour -> publicTourMapper.toResponse(tour, locale))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicTourResponse getPublicTourBySlug(String slug, String locale) {
        Tour tour = tourRepository.findBySlugAndIsActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found: " + slug));
        return publicTourMapper.toResponse(tour, locale);
    }
}