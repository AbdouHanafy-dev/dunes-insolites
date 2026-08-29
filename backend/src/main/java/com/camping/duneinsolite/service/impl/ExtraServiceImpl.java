package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.dto.request.ExtraRequest;
import com.camping.duneinsolite.dto.response.ExtraResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicActivityResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.ExtraMapper;
import com.camping.duneinsolite.mapper.publicapi.PublicActivityMapper;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.ExtraTranslation;
import com.camping.duneinsolite.model.enums.ProductType;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.ReviewRepository;
import com.camping.duneinsolite.repository.UserProductRemiseRepository;
import com.camping.duneinsolite.service.ExtraService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ExtraServiceImpl implements ExtraService {

    private final ExtraRepository extraRepository;
    private final ExtraMapper extraMapper;
    private final PublicActivityMapper publicActivityMapper;
    private final UserProductRemiseRepository userProductRemiseRepository;
    private final ReviewRepository reviewRepository;

    @Override
    public ExtraResponse createExtra(ExtraRequest request) {
        Extra extra = extraMapper.toEntity(request);
        syncTranslations(extra, request.getTranslations());
        return extraMapper.toResponse(extraRepository.save(extra));
    }

    @Override
    @Transactional(readOnly = true)
    public ExtraResponse getExtraById(UUID extraId) {
        return extraMapper.toResponse(findById(extraId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExtraResponse> getAllExtras() {
        return extraRepository.findAll().stream().map(extraMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExtraResponse> getActiveExtras() {
        return extraRepository.findByIsActiveTrue().stream().map(extraMapper::toResponse).toList();
    }

    @Override
    public ExtraResponse updateExtra(UUID extraId, ExtraRequest request) {
        Extra extra = findById(extraId);
        extraMapper.updateEntity(request, extra);
        syncTranslations(extra, request.getTranslations());
        return extraMapper.toResponse(extraRepository.save(extra));
    }

    // Replaces the whole translation set on every save rather than diffing -
    // the admin form always submits the complete per-locale list, and
    // orphanRemoval on Extra.translations cleans up the rows that drop out.
    //
    // saveAndFlush() right after clear() is load-bearing - see
    // TourTypeServiceImpl.syncTranslations()'s own comment for the exact
    // Hibernate insert-before-delete ordering bug this avoids (identical
    // structure here, same fix). Harmless on create, where
    // getTranslations() is already empty.
    private void syncTranslations(Extra extra, List<CatalogTranslationDto> dtos) {
        extra.getTranslations().clear();
        extraRepository.saveAndFlush(extra);
        if (dtos == null) return;
        for (CatalogTranslationDto dto : dtos) {
            ExtraTranslation translation = new ExtraTranslation();
            translation.setExtra(extra);
            translation.setLocale(dto.getLocale());
            translation.setName(dto.getName());
            translation.setDescription(dto.getDescription());
            translation.setAboutText(dto.getAboutText());
            translation.setHighlights(dto.getHighlights());
            translation.setIncludedItems(dto.getIncludedItems());
            translation.setNotIncludedItems(dto.getNotIncludedItems());
            translation.setProgramSteps(dto.getProgramSteps());
            extra.getTranslations().add(translation);
        }
    }

    @Override
    public ExtraResponse deactivateExtra(UUID extraId) {
        Extra extra = findById(extraId);
        extra.setIsActive(false);
        return extraMapper.toResponse(extraRepository.save(extra));
    }

    @Override
    public void deleteExtra(UUID extraId) {
        userProductRemiseRepository.deleteAllByProductId(extraId);
        reviewRepository.deleteAllByProductIdAndProductType(extraId, ProductType.EXTRA);
        extraRepository.delete(findById(extraId));
    }

    private Extra findById(UUID extraId) {
        return extraRepository.findById(extraId)
                .orElseThrow(() -> new ResourceNotFoundException("Extra not found: " + extraId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicActivityResponse> getPublicActivities(String locale) {
        return extraRepository.findByIsActiveTrue().stream()
                .map(extra -> publicActivityMapper.toResponse(extra, locale)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicActivityResponse getPublicActivityBySlug(String slug, String locale) {
        Extra extra = extraRepository.findBySlugAndIsActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found: " + slug));
        return publicActivityMapper.toResponse(extra, locale);
    }
}