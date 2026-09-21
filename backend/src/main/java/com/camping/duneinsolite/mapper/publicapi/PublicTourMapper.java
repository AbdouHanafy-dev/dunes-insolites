package com.camping.duneinsolite.mapper.publicapi;

import com.camping.duneinsolite.dto.response.publicapi.PublicTourResponse;
import com.camping.duneinsolite.model.CancellationPolicy;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.model.TourTranslation;
import com.camping.duneinsolite.model.enums.ContentLocale;
import org.springframework.stereotype.Component;

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
public class PublicTourMapper {

    /** @param locale e.g. "de"; null/"fr"/unknown all resolve to Tour's own (French) fields. */
    public PublicTourResponse toResponse(Tour tour, String locale) {
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
        // convention as PublicStayMapper/PublicActivityMapper.
        response.setPriceFrom(tour.getPassengerAdultPrice());
        response.setPassengerAdultPrice(tour.getPassengerAdultPrice());
        response.setPassengerChildPrice(tour.getPassengerChildPrice());
        response.setAverageRating(tour.getAverageRating());
        response.setReviewCount(tour.getReviewCount());

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
