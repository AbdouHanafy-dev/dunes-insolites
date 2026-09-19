package com.camping.duneinsolite.service.impl;


import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.dto.request.TourTypeRequest;
import com.camping.duneinsolite.dto.response.TourTypeResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicStayResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.TourTypeMapper;
import com.camping.duneinsolite.mapper.publicapi.PublicStayMapper;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.TourTypeTranslation;
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
    private final PublicStayMapper publicStayMapper;
    private final UserProductRemiseRepository userProductRemiseRepository;
    private final ReviewRepository reviewRepository;
    private final SpokenLanguageResolver spokenLanguageResolver;

    @Override
    public TourTypeResponse createTourType(TourTypeRequest request) {
        if (tourTypeRepository.existsByName(request.getName())) {
            throw new ConflictException("Tour type already exists: " + request.getName());
        }
        TourType tourType = tourTypeMapper.toEntity(request);
        tourType.setLanguages(spokenLanguageResolver.resolve(request.getLanguageIds()));
        if (tourType.getIsActive() == null) {
            tourType.setIsActive(true);
        }
        // Same bug class as isActive above and as updateTourType's own fix
        // below - guide_required is NOT NULL in Postgres but nullable
        // Boolean here, so a caller that simply omits it (the admin UI never
        // does, it always sends false - but a direct API call, found live,
        // does) 500s on the constraint instead of getting a sensible
        // default of "no guide required."
        if (tourType.getGuideRequired() == null) {
            tourType.setGuideRequired(false);
        }
        syncTranslations(tourType, request.getTranslations());
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

    // Same bug class as TourServiceImpl.updateTour and PageServiceImpl -
    // tourTypeMapper.updateEntity has no NullValuePropertyMappingStrategy.
    // IGNORE, so omitting isActive on a PUT nulled it and 400'd on
    // tour_types.is_active's NOT NULL constraint.
    @Override
    public TourTypeResponse updateTourType(UUID tourTypeId, TourTypeRequest request) {
        TourType tourType = findById(tourTypeId);
        Boolean previousIsActive = tourType.getIsActive();
        Boolean previousGuideRequired = tourType.getGuideRequired();
        tourTypeMapper.updateEntity(request, tourType);
        if (tourType.getIsActive() == null) {
            tourType.setIsActive(previousIsActive);
        }
        if (tourType.getGuideRequired() == null) {
            tourType.setGuideRequired(previousGuideRequired);
        }
        if (request.getLanguageIds() != null) {
            tourType.setLanguages(spokenLanguageResolver.resolve(request.getLanguageIds()));
        }
        syncTranslations(tourType, request.getTranslations());
        return tourTypeMapper.toResponse(tourTypeRepository.save(tourType));
    }

    // Replaces the whole translation set on every save rather than diffing -
    // the admin form always submits the complete per-locale list, and
    // orphanRemoval on TourType.translations cleans up the rows that drop out.
    //
    // saveAndFlush() right after clear() is load-bearing, not decoration:
    // without it, Hibernate batches the DELETEs for the orphaned old
    // translations and the INSERTs for the new ones into the same flush and
    // orders the INSERTs first, so updating a TourType that already has a
    // translation for a given locale 400s on
    // uk1djssv9jk474abp73mquxqyq7 (tour_type_id, locale) - the old row for
    // that locale hasn't actually been deleted yet when the new one tries to
    // insert. Found for real (not just reasoned about) fixing an existing
    // seeded row's price - see docs/ROADMAP.md's DI-012 note. Forcing the
    // flush here means the DELETE lands before any new translation exists to
    // collide with it. Harmless on create, where getTranslations() is
    // already empty and this flush has nothing to delete.
    private void syncTranslations(TourType tourType, List<CatalogTranslationDto> dtos) {
        tourType.getTranslations().clear();
        tourTypeRepository.saveAndFlush(tourType);
        if (dtos == null) return;
        for (CatalogTranslationDto dto : dtos) {
            TourTypeTranslation translation = new TourTypeTranslation();
            translation.setTourType(tourType);
            translation.setLocale(dto.getLocale());
            translation.setName(dto.getName());
            translation.setDescription(dto.getDescription());
            translation.setAboutText(dto.getAboutText());
            translation.setHighlights(dto.getHighlights());
            translation.setIncludedItems(dto.getIncludedItems());
            translation.setNotIncludedItems(dto.getNotIncludedItems());
            translation.setProgramSteps(dto.getProgramSteps());
            tourType.getTranslations().add(translation);
        }
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
                .orElseThrow(() -> new ResourceNotFoundException("TourType not found: " + tourTypeId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicStayResponse> getPublicStays(String locale) {
        return tourTypeRepository.findByIsActiveTrue().stream()
                .map(tourType -> publicStayMapper.toResponse(tourType, locale)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicStayResponse getPublicStayBySlug(String slug, String locale) {
        TourType tourType = tourTypeRepository.findBySlugAndIsActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Stay not found: " + slug));
        return publicStayMapper.toResponse(tourType, locale);
    }
}
