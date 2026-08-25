package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.TourRequest;
import com.camping.duneinsolite.dto.request.TourUpdateRequest;
import com.camping.duneinsolite.dto.response.TourResponse;
import com.camping.duneinsolite.mapper.TourMapper;
import com.camping.duneinsolite.model.Tour;
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
    private final UserProductRemiseRepository userProductRemiseRepository;
    private final ReviewRepository reviewRepository;

    @Override
    public TourResponse createTour(TourRequest request) {
        if (tourRepository.existsByName(request.getName())) {
            throw new RuntimeException("A tour with the name '" + request.getName() + "' already exists");
        }
        Tour tour = tourMapper.toEntity(request);
        if (tour.getIsActive() == null) {
            tour.setIsActive(true);
        }
        return tourMapper.toResponse(tourRepository.save(tour));
    }

    @Override
    public TourResponse updateTour(UUID tourId, TourUpdateRequest request) {
        Tour tour = findById(tourId);
        tourMapper.updateEntity(request, tour);
        return tourMapper.toResponse(tourRepository.save(tour));
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
                .orElseThrow(() -> new RuntimeException("Tour not found: " + tourId));
    }
}