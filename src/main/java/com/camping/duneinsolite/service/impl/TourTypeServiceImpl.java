package com.camping.duneinsolite.service.impl;


import com.camping.duneinsolite.dto.request.TourTypeRequest;
import com.camping.duneinsolite.dto.response.TourTypeResponse;
import com.camping.duneinsolite.mapper.TourTypeMapper;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.enums.ProductType;
import com.camping.duneinsolite.repository.ReviewRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.repository.UserProductRemiseRepository;
import com.camping.duneinsolite.service.TourTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TourTypeServiceImpl implements TourTypeService {

    private final TourTypeRepository tourTypeRepository;
    private final TourTypeMapper tourTypeMapper;
    private final UserProductRemiseRepository userProductRemiseRepository;
    private final ReviewRepository reviewRepository;

    @Override
    public TourTypeResponse createTourType(TourTypeRequest request) {
        if (tourTypeRepository.existsByName(request.getName())) {
            throw new RuntimeException("Tour type already exists: " + request.getName());
        }
        TourType tourType = tourTypeMapper.toEntity(request);
        if (tourType.getIsActive() == null) {
            tourType.setIsActive(true);
        }
        return tourTypeMapper.toResponse(tourTypeRepository.save(tourType));
    }

    @Override
    @Transactional(readOnly = true)
    public TourTypeResponse getTourTypeById(UUID tourTypeId) {
        return tourTypeMapper.toResponse(findById(tourTypeId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TourTypeResponse> getAllTourTypes() {
        return tourTypeRepository.findAll().stream()
                .map(tourTypeMapper::toResponse).toList();
    }

    @Override
    public TourTypeResponse updateTourType(UUID tourTypeId, TourTypeRequest request) {
        TourType tourType = findById(tourTypeId);
        tourTypeMapper.updateEntity(request, tourType);
        return tourTypeMapper.toResponse(tourTypeRepository.save(tourType));
    }

    @Override
    public TourTypeResponse deactivateTourType(UUID tourTypeId) {
        TourType tourType = findById(tourTypeId);
        tourType.setIsActive(false);
        return tourTypeMapper.toResponse(tourTypeRepository.save(tourType));
    }

    @Override
    public void deleteTourType(UUID tourTypeId) {
        userProductRemiseRepository.deleteAllByProductId(tourTypeId);
        reviewRepository.deleteAllByProductIdAndProductType(tourTypeId, ProductType.TOURTYPE);
        tourTypeRepository.delete(findById(tourTypeId));
    }

    private TourType findById(UUID tourTypeId) {
        return tourTypeRepository.findById(tourTypeId)
                .orElseThrow(() -> new RuntimeException("TourType not found: " + tourTypeId));
    }
}
