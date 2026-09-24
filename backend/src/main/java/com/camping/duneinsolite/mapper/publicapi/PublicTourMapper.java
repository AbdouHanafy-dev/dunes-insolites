package com.camping.duneinsolite.mapper.publicapi;

import com.camping.duneinsolite.dto.response.publicapi.PublicTourResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicStayResponse;
import com.camping.duneinsolite.model.CancellationPolicy;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.model.TourTranslation;
import com.camping.duneinsolite.model.enums.ContentLocale;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Optional;

/**
 * Maps Tour (Route Insolite's multi-day circuit) to the vitrine's public
 * shape. Unlike PublicStayMapper/PublicActivityMapper, Tour already stores
 * real itinerary/highlights/meeting-point/cancellation data directly — this
 * mapper mostly just resolves the requested locale, it doesn't derive
 * marketing copy the entity never stored.
 */
@Component
@RequiredArgsConstructor
public class PublicTourMapper {

    private final com.camping.duneinsolite.repository.AccommodationTypeRepository accommodationTypeRepository;
    private final com.camping.duneinsolite.repository.TourTypeRepository tourTypeRepository;

    /**
     * @param locale e.g. "de"; null/"fr"/unknown all resolve to Tour's own (French) fields.
     * @param bookedYesterdayCount real count from ReservationTourRepository - TourServiceImpl's
     *                             job to compute, this mapper stays a plain stateless field-mapper.
     */
    public PublicTourResponse toResponse(Tour tour, String locale, long bookedYesterdayCount) {
        Optional<ContentLocale> contentLocale = PublicCatalogTranslation.parseLocale(locale);
        TourTranslation t = contentLocale
                .flatMap(l -> PublicCatalogTranslation.find(tour.getTranslations(), l))
                .orElse(null);

        String name = t == null ? tour.getName() : PublicCatalogTranslation.text(tour.getName(), t.getName());
        String description = t == null ? tour.getDescription()
                : PublicCatalogTranslation.text(tour.getDescription(), t.getDescription());
        String aboutText = t == null ? tour.getAboutText()
                : PublicCatalogTranslation.text(tour.getAboutText(), t.getAboutText());
        List<String> highlights = t == null ? tour.getHighlights()
                : PublicCatalogTranslation.list(tour.getHighlights(), t.getHighlights());
        List<String> included = t == null ? tour.getIncludedItems()
                : PublicCatalogTranslation.list(tour.getIncludedItems(), t.getIncludedItems());
        List<String> notIncluded = t == null ? tour.getNotIncludedItems()
                : PublicCatalogTranslation.list(tour.getNotIncludedItems(), t.getNotIncludedItems());
        List<ProgramStep> programSteps = t == null ? tour.getProgramSteps()
                : PublicCatalogTranslation.steps(tour.getProgramSteps(), t.getProgramSteps());

        PublicTourResponse response = new PublicTourResponse();
        response.setSlug(tour.getSlug());
        response.setTitle(name);
        response.setDescription(description);
        response.setAboutText(aboutText);
        response.setDuration(tour.getDuration());
        response.setLocation(tour.getLocation());
        response.setMeetingPoint(tour.getMeetingPoint());
        response.setGroupSize(groupSize(tour.getGroupSizeType()));
        response.setOvernightsAtCamp(requiresCampAccommodation(tour));
        var camp = tourTypeRepository.findFirstByCircuitCampTrue();
        response.setAccommodations(camp.map(this::bookableCampAccommodations).orElse(List.of()));
        response.setCampStaySlug(camp.map(com.camping.duneinsolite.model.TourType::getSlug).orElse(null));
        response.setLanguages(tour.getLanguages() == null ? List.of()
                : tour.getLanguages().stream().map(com.camping.duneinsolite.model.SpokenLanguage::getName).sorted().toList());
        response.setCoverImage(tour.getCoverPhotoUrl());
        response.setGallery(gallery(tour.getPhotos()));
        response.setHighlights(highlights == null ? List.of() : highlights);
        response.setIncluded(included == null ? List.of() : included);
        response.setNotIncluded(notIncluded == null ? List.of() : notIncluded);
        response.setItinerary(itinerary(programSteps));
        response.setCancellationPolicy(cancellationPolicy(tour.getCancellationPolicy()));
        // Headline price is the direct-passenger adult rate - the price a
        // guest booking on the vitrine (not a partner) actually pays. Same
        // convention as PublicStayMapper/PublicActivityMapper. A real sale
        // price (admin-set, < the regular rate) becomes the headline price,
        // with the regular rate exposed as the struck-through "was" price -
        // never a fabricated discount.
        boolean saleActive = tour.getSalePriceAdult() != null
                && tour.getSalePriceAdult().compareTo(tour.getPassengerAdultPrice()) < 0;
        response.setPriceFrom(saleActive ? tour.getSalePriceAdult() : tour.getPassengerAdultPrice());
        response.setOriginalPriceFrom(saleActive ? tour.getPassengerAdultPrice() : null);
        response.setPassengerAdultPrice(tour.getPassengerAdultPrice());
        response.setPassengerChildPrice(tour.getPassengerChildPrice());
        response.setPassengerInfantPrice(tour.getPassengerInfantPrice());
        response.setAverageRating(tour.getAverageRating());
        response.setReviewCount(tour.getReviewCount());
        response.setBookedYesterdayCount(bookedYesterdayCount);

        response.setGuideType(tour.getGuideType());
        response.setFoodIncluded(tour.getFoodIncluded());
        response.setMeals(meals(tour.getMeals()));
        response.setDrinksIncluded(tour.getDrinksIncluded());
        response.setDietaryRestrictions(orEmpty(tour.getDietaryRestrictions()));
        response.setTransportIncluded(tour.getTransportIncluded());
        response.setTransportModes(orEmpty(tour.getTransportModes()));

        response.setNotSuitableFor(orEmpty(tour.getNotSuitableFor()));
        response.setNotAllowed(orEmpty(tour.getNotAllowed()));
        response.setAnimalsAccepted(tour.getAnimalsAccepted());
        response.setPetPolicyNote(tour.getPetPolicyNote());
        response.setMustBring(orEmpty(tour.getMustBring()));
        response.setGoodToKnow(tour.getGoodToKnow());
        response.setEmergencyPhone(tour.getEmergencyPhone());
        response.setTicketInfo(tour.getTicketInfo());
        return response;
    }

    // Tiers of the stay flagged circuit_camp - independent of that stay's own
    // hasAccommodationTypes, which only governs its own booking form.
    private List<PublicStayResponse.Accommodation> bookableCampAccommodations(
            com.camping.duneinsolite.model.TourType camp) {
        return accommodationTypeRepository
                .findByTourType_TourTypeIdOrderByDisplayOrderAsc(camp.getTourTypeId())
                .stream()
                .filter(com.camping.duneinsolite.model.AccommodationType::isBookable)
                .map(a -> {
                    PublicStayResponse.Accommodation dto = new PublicStayResponse.Accommodation();
                    dto.setSlug(a.getSlug());
                    dto.setTitle(a.getName());
                    dto.setTagline("");
                    dto.setDescription(a.getDescription());
                    dto.setImage(a.getImageUrl());
                    dto.setGallery(List.copyOf(a.getGallery()));
                    dto.setPriceFrom(a.getAdultPriceTtc());
                    dto.setAdultPrice(a.getAdultPriceTtc());
                    dto.setChildPrice(a.getChildPriceTtc() != null ? a.getChildPriceTtc() : a.getAdultPriceTtc());
                    dto.setInfantPrice(a.getInfantPriceTtc() != null ? a.getInfantPriceTtc() : java.math.BigDecimal.ZERO);
                    dto.setCapacity(a.getCapacity());
                    dto.setSleeps("Jusqu'\u00e0 " + a.getCapacity()
                            + (a.getCapacity() > 1 ? " personnes" : " personne"));
                    dto.setFeatures(List.copyOf(a.getFeatures()));
                    dto.setMaxUnits(a.getMaxUnits());
                    return dto;
                })
                .toList();
    }

    private static boolean requiresCampAccommodation(Tour tour) {
        if (Boolean.TRUE.equals(tour.getOvernightsAtCamp())) return true;
        if (tour.getDuration() == null) return false;
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("(\\d+)\\s*(?:jours?|days?)\\b", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(tour.getDuration());
        return matcher.find() && Integer.parseInt(matcher.group(1)) > 1;
    }

    private static List<String> orEmpty(List<String> list) {
        return list == null ? List.of() : list;
    }

    private static List<PublicTourResponse.Meal> meals(List<com.camping.duneinsolite.model.Meal> meals) {
        if (meals == null) return List.of();
        return meals.stream().map(m -> {
            PublicTourResponse.Meal dto = new PublicTourResponse.Meal();
            dto.setMealType(m.getMealType() == null ? null : m.getMealType().name());
            dto.setFormat(m.getFormat() == null ? null : m.getFormat().name());
            return dto;
        }).toList();
    }

    private static List<String> gallery(List<Photo> photos) {
        return photos == null ? List.of() : photos.stream().map(Photo::getUrl).toList();
    }

    private static List<PublicTourResponse.ItineraryStep> itinerary(List<ProgramStep> steps) {
        if (steps == null) return List.of();
        return steps.stream().map(s -> {
            PublicTourResponse.ItineraryStep step = new PublicTourResponse.ItineraryStep();
            step.setLabel(s.getLabel());
            step.setTitle(s.getTitle());
            step.setDescription(s.getDescription());
            step.setSegmentType(s.getSegmentType() == null ? null : s.getSegmentType().name());
            step.setOptionalSegment(s.getOptionalSegment());
            step.setDurationMinutes(s.getDurationMinutes());
            return step;
        }).toList();
    }

    private static PublicTourResponse.CancellationPolicy cancellationPolicy(CancellationPolicy policy) {
        if (policy == null) return null;
        PublicTourResponse.CancellationPolicy dto = new PublicTourResponse.CancellationPolicy();
        dto.setFreeCancellation(policy.getFreeCancellation());
        dto.setHoursBeforeDeadline(policy.getHoursBeforeDeadline());
        return dto;
    }

    private static String groupSize(com.camping.duneinsolite.model.enums.GroupSizeType type) {
        if (type == null) return "";
        return switch (type) {
            case PETIT_GROUPE -> "Small group";
            case GROUPE_MOYEN -> "Medium group";
            case TOUTES_TAILLES -> "Any group size";
            case PRIVATIF -> "Private";
        };
    }
}
