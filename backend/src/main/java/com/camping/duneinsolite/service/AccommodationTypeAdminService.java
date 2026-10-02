package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.dto.request.AccommodationTypeRequest;
import com.camping.duneinsolite.dto.response.AccommodationTypeResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.AccommodationTypeTranslation;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.enums.Currency;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AccommodationTypeAdminService {

    private final AccommodationTypeRepository repository;
    private final TourTypeRepository tourTypeRepository;

    @Transactional(readOnly = true)
    public List<AccommodationTypeResponse> list(UUID tourTypeId) {
        List<AccommodationType> rows = tourTypeId != null
                ? repository.findByTourType_TourTypeIdOrderByDisplayOrderAsc(tourTypeId)
                : repository.findAll();
        return rows.stream().map(AccommodationTypeResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AccommodationTypeResponse get(UUID id) {
        return AccommodationTypeResponse.from(find(id));
    }

    public AccommodationTypeResponse create(AccommodationTypeRequest req) {
        TourType tourType = tourTypeRepository.findById(req.getTourTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("TourType not found: " + req.getTourTypeId()));
        repository.findByTourTypeAndSlug(tourType.getTourTypeId(), req.getSlug()).ifPresent(x -> {
            throw new ConflictException("An accommodation with slug '" + req.getSlug() + "' already exists on this stay.");
        });
        AccommodationType a = AccommodationType.builder()
                .tourType(tourType)
                .slug(req.getSlug())
                .name(req.getName())
                .description(req.getDescription())
                .imageUrl(req.getImageUrl())
                .gallery(req.getGallery() != null ? new ArrayList<>(req.getGallery()) : new ArrayList<>())
                .capacity(req.getCapacity())
                .maxUnits(req.getMaxUnits())
                .adultPriceTtc(Money.round(req.getAdultPriceTtc()))
                .childPriceTtc(childPrice(req))
                .infantPriceTtc(Money.round(req.getInfantPriceTtc()))
                .tvaRate(req.getTvaRate())
                .currency(req.getCurrency() != null ? req.getCurrency() : Currency.EUR)
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 0)
                .active(req.getActive() == null || req.getActive())
                .airConditioned(Boolean.TRUE.equals(req.getAirConditioned()))
                .privateBathroom(Boolean.TRUE.equals(req.getPrivateBathroom()))
                .features(req.getFeatures() != null ? new ArrayList<>(req.getFeatures()) : new ArrayList<>())
                .build();
        syncTranslations(a, req.getTranslations());
        return AccommodationTypeResponse.from(repository.save(a));
    }

    public AccommodationTypeResponse update(UUID id, AccommodationTypeRequest req) {
        AccommodationType a = find(id);
        if (!a.getSlug().equals(req.getSlug())) {
            repository.findByTourTypeAndSlug(a.getTourType().getTourTypeId(), req.getSlug()).ifPresent(x -> {
                throw new ConflictException("An accommodation with slug '" + req.getSlug() + "' already exists on this stay.");
            });
            a.setSlug(req.getSlug());
        }
        a.setName(req.getName());
        a.setDescription(req.getDescription());
        a.setImageUrl(req.getImageUrl());
        if (req.getGallery() != null) {
            a.getGallery().clear();
            a.getGallery().addAll(req.getGallery());
        }
        a.setCapacity(req.getCapacity());
        a.setMaxUnits(req.getMaxUnits());
        a.setAdultPriceTtc(Money.round(req.getAdultPriceTtc()));
        a.setChildPriceTtc(childPrice(req));
        a.setInfantPriceTtc(Money.round(req.getInfantPriceTtc()));
        a.setTvaRate(req.getTvaRate());
        if (req.getCurrency() != null) a.setCurrency(req.getCurrency());
        if (req.getDisplayOrder() != null) a.setDisplayOrder(req.getDisplayOrder());
        if (req.getActive() != null) a.setActive(req.getActive());
        if (req.getAirConditioned() != null) a.setAirConditioned(req.getAirConditioned());
        if (req.getPrivateBathroom() != null) a.setPrivateBathroom(req.getPrivateBathroom());
        if (req.getFeatures() != null) {
            a.getFeatures().clear();
            a.getFeatures().addAll(req.getFeatures());
        }
        syncTranslations(a, req.getTranslations());
        return AccommodationTypeResponse.from(a);
    }

    /**
     * Brings the saved translations in line with the request, language by language: an existing
     * language is updated in place, a new one is added, a language absent from the list is removed.
     * A null list changes nothing. Updating in place (rather than delete-and-reinsert) also keeps
     * the unique (tier, language) constraint out of Hibernate's insert-before-delete ordering.
     */
    private void syncTranslations(AccommodationType a, List<CatalogTranslationDto> dtos) {
        if (dtos == null) return;
        a.getTranslations().removeIf(t -> dtos.stream().noneMatch(d -> d.getLocale() == t.getLocale()));
        for (CatalogTranslationDto dto : dtos) {
            AccommodationTypeTranslation t = a.getTranslations().stream()
                    .filter(x -> x.getLocale() == dto.getLocale()).findFirst().orElse(null);
            if (t == null) {
                t = new AccommodationTypeTranslation();
                t.setAccommodationType(a);
                t.setLocale(dto.getLocale());
                a.getTranslations().add(t);
            }
            t.setName(dto.getName());
            t.setDescription(dto.getDescription());
            t.getFeatures().clear();
            if (dto.getHighlights() != null) t.getFeatures().addAll(dto.getHighlights());
        }
    }

    public void delete(UUID id) {
        repository.delete(find(id));
    }

    /** A blank child price means "same as an adult" - never silently free. */
    private static java.math.BigDecimal childPrice(AccommodationTypeRequest req) {
        return Money.round(req.getChildPriceTtc() != null ? req.getChildPriceTtc() : req.getAdultPriceTtc());
    }

    private AccommodationType find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation not found: " + id));
    }
}
