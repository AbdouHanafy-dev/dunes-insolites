package com.camping.duneinsolite.mapper.publicapi;

import com.camping.duneinsolite.dto.response.publicapi.PublicStayResponse;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.TourTypeTranslation;
import com.camping.duneinsolite.model.enums.ContentLocale;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Maps TourType (the backend's nuitée entity - camp/bivouac) to the
 * vitrine's public Stay shape. See PublicCatalogText for how the
 * marketing-only fields TourType doesn't store are derived,
 * PublicCatalogTranslation for how the requested locale resolves against
 * TourType's translations, and PublicStayResponse for why this isn't a
 * MapStruct interface.
 */
@Component
@RequiredArgsConstructor
public class PublicStayMapper {

    private final AccommodationTypeRepository accommodationTypeRepository;

    /** @param locale e.g. "de"; null/"fr"/unknown all resolve to TourType's own (French) fields. */
    public PublicStayResponse toResponse(TourType tourType, String locale) {
        Optional<ContentLocale> contentLocale = PublicCatalogTranslation.parseLocale(locale);
        TourTypeTranslation t = contentLocale
                .flatMap(l -> PublicCatalogTranslation.find(tourType.getTranslations(), l))
                .orElse(null);

        String name = t == null ? tourType.getName() : PublicCatalogTranslation.text(tourType.getName(), t.getName());
        String description = t == null ? tourType.getDescription()
                : PublicCatalogTranslation.text(tourType.getDescription(), t.getDescription());
        String aboutText = t == null ? tourType.getAboutText()
                : PublicCatalogTranslation.text(tourType.getAboutText(), t.getAboutText());
        List<String> included = t == null ? tourType.getIncludedItems()
                : PublicCatalogTranslation.list(tourType.getIncludedItems(), t.getIncludedItems());
        List<String> notIncluded = t == null ? tourType.getNotIncludedItems()
                : PublicCatalogTranslation.list(tourType.getNotIncludedItems(), t.getNotIncludedItems());

        PublicStayResponse response = new PublicStayResponse();
        response.setSlug(tourType.getSlug());
        response.setTitle(name);
        response.setKicker(PublicCatalogText.kicker(tourType.getLocation()));
        response.setTagline(PublicCatalogText.tagline(description));
        response.setDescription(description);
        response.setLongDescription(PublicCatalogText.longDescription(aboutText));
        response.setImage(tourType.getCoverPhotoUrl());
        response.setGallery(PublicCatalogText.gallery(tourType.getPhotos()));
        // Headline price is the direct-passenger adult rate - the price a
        // guest booking on the vitrine (not a partner) actually pays.
        response.setPriceFrom(tourType.getPassengerAdultPrice());
        response.setAdultPrice(tourType.getPassengerAdultPrice());
        response.setChildPrice(tourType.getPassengerChildPrice());
        response.setInfantPrice(tourType.getPassengerInfantPrice());
        response.setGroupSize(PublicCatalogText.groupSize(tourType.getGroupSizeType()));
        response.setIncluded(included);
        response.setNotIncluded(notIncluded);
        // Not modeled on TourType yet - empty/blank rather than invented content.
        response.setPracticalInfo(List.of());
        response.setArrivalTime("");
        response.setDepartureTime("");
        response.setItinerary(List.of());
        response.setDepartureCities(com.camping.duneinsolite.service.PickupCities.names(tourType.getDepartureCities()));
        response.setReturnCities(com.camping.duneinsolite.service.PickupCities.names(tourType.getReturnCities()));
        response.setAccommodations(publicAccommodations(tourType));
        response.setGuideRequired(Boolean.TRUE.equals(tourType.getGuideRequired()));
        response.setMaxNights(tourType.getMaxNights() == null ? 1 : tourType.getMaxNights());
        return response;
    }

    /** Only active + priced tiers reach the vitrine — never an option we can't quote. */
    private List<PublicStayResponse.Accommodation> publicAccommodations(TourType tourType) {
        // The bivouac tent is descriptive content, not a selectable tier. It
        // therefore remains public even when it has no independent price.
        boolean informational = "bivouac-desert-tunisie".equals(tourType.getSlug());
        // Switched off in the back office: no bookable accommodation choices.
        // The descriptive bivouac tent is still returned for its information card.
        if (!informational && Boolean.FALSE.equals(tourType.getHasAccommodationTypes())) return List.of();
        return accommodationTypeRepository
                .findByTourType_TourTypeIdOrderByDisplayOrderAsc(tourType.getTourTypeId())
                .stream()
                .filter(a -> informational ? a.isActive() : a.isBookable())
                .map(a -> {
                    java.math.BigDecimal adultPrice = a.getAdultPriceTtc() != null
                            ? a.getAdultPriceTtc()
                            : tourType.getPassengerAdultPrice();
                    java.math.BigDecimal childPrice = a.getChildPriceTtc() != null
                            ? a.getChildPriceTtc()
                            : tourType.getPassengerChildPrice() != null
                                    ? tourType.getPassengerChildPrice()
                                    : adultPrice;
                    PublicStayResponse.Accommodation dto = new PublicStayResponse.Accommodation();
                    dto.setSlug(a.getSlug());
                    dto.setTitle(a.getName());
                    dto.setTagline("");
                    dto.setDescription(a.getDescription());
                    dto.setImage(a.getImageUrl());
                    dto.setGallery(List.copyOf(a.getGallery()));
                    // These fallback rates only keep the shared public DTO
                    // complete. The bivouac flow never submits this record.
                    dto.setPriceFrom(adultPrice);
                    dto.setAdultPrice(adultPrice);
                    dto.setChildPrice(childPrice);
                    dto.setInfantPrice(a.getInfantPriceTtc() != null ? a.getInfantPriceTtc() : java.math.BigDecimal.ZERO);
                    dto.setCapacity(a.getCapacity());
                    dto.setSleeps("Jusqu'à " + a.getCapacity()
                            + (a.getCapacity() > 1 ? " personnes" : " personne"));
                    dto.setFeatures(List.copyOf(a.getFeatures()));
                    dto.setMaxUnits(a.getMaxUnits());
                    return dto;
                })
                .toList();
    }
}
