package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.response.publicapi.PublicActivityAvailabilityResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicAvailabilityResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicServiceOptionAvailabilityResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * Read-only public availability for a stay's accommodation tiers on a given
 * night, an activity on a given day, or a guide/transport option on a given
 * day. Advisory — the authoritative allocation check happens under a row
 * lock during booking (see {@link AccommodationAvailabilityService#allocate} /
 * {@link ExtraAvailabilityService#allocate}).
 */
@Service
@RequiredArgsConstructor
public class PublicAvailabilityService {

    private final TourTypeRepository tourTypeRepository;
    private final AccommodationTypeRepository accommodationTypeRepository;
    private final AccommodationAvailabilityService availabilityService;
    private final ExtraRepository extraRepository;
    private final ExtraAvailabilityService extraAvailabilityService;

    @Transactional(readOnly = true)
    public PublicAvailabilityResponse forStay(String staySlug, LocalDate date, Integer nights) {
        TourType stay = tourTypeRepository.findBySlugAndIsActiveTrue(staySlug)
                .orElseThrow(() -> new ResourceNotFoundException("Stay not found: " + staySlug));
        int resolvedNights = nights == null ? 1 : Math.max(1, nights);
        LocalDate checkIn = date;
        LocalDate checkOut = date.plusDays(resolvedNights);

        List<PublicAvailabilityResponse.TierAvailability> tiers = accommodationTypeRepository
                .findByTourType_TourTypeIdOrderByDisplayOrderAsc(stay.getTourTypeId())
                .stream()
                .filter(AccommodationType::isBookable) // active + priced only
                .map(acc -> {
                    var a = availabilityService.status(acc, checkIn, checkOut);
                    return new PublicAvailabilityResponse.TierAvailability(
                            acc.getSlug(), acc.getName(), a.status().name(), a.unitsAvailable());
                })
                .toList();

        return new PublicAvailabilityResponse(staySlug, date, resolvedNights, tiers);
    }

    @Transactional(readOnly = true)
    public PublicActivityAvailabilityResponse forActivity(String activitySlug, LocalDate date) {
        Extra extra = extraRepository.findBySlugAndIsActiveTrue(activitySlug)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found: " + activitySlug));
        var a = extraAvailabilityService.status(extra, date);
        return new PublicActivityAvailabilityResponse(activitySlug, date, a.status().name(), a.unitsAvailable());
    }

    @Transactional(readOnly = true)
    public PublicServiceOptionAvailabilityResponse forServiceOption(String serviceOptionSlug, LocalDate date) {
        Extra option = extraRepository.findBySlugAndIsActiveTrue(serviceOptionSlug)
                .orElseThrow(() -> new ResourceNotFoundException("Service option not found: " + serviceOptionSlug));
        var optionAvailability = extraAvailabilityService.status(option, date);
        boolean unavailable = optionAvailability.status() == ExtraAvailabilityService.Status.UNAVAILABLE;
        Integer availableSelections = optionAvailability.unitsAvailable();
        for (var requirement : option.getResourceRequirements()) {
            var resourceAvailability = extraAvailabilityService.status(requirement.getResource(), date);
            if (resourceAvailability.status() == ExtraAvailabilityService.Status.UNAVAILABLE) {
                unavailable = true;
            }
            if (resourceAvailability.unitsAvailable() != null) {
                int selections = resourceAvailability.unitsAvailable() / requirement.getQuantity();
                availableSelections = availableSelections == null
                        ? selections : Math.min(availableSelections, selections);
                if (selections == 0) unavailable = true;
            }
        }
        String status = unavailable ? ExtraAvailabilityService.Status.UNAVAILABLE.name()
                : availableSelections == null ? ExtraAvailabilityService.Status.UNKNOWN.name()
                : ExtraAvailabilityService.Status.AVAILABLE.name();
        // NOT `unavailable ? 0 : availableSelections` - a ternary mixing an
        // int literal with a boxed Integer forces the Integer branch to
        // unbox even when it's null (the UNKNOWN case, no capacity
        // configured), NPEing here every time. Keep both branches boxed.
        Integer unitsAvailable = unavailable ? Integer.valueOf(0) : availableSelections;
        return new PublicServiceOptionAvailabilityResponse(serviceOptionSlug, date, status, unitsAvailable);
    }

    /**
     * One entry per day of {@code month} - lets a date picker grey out full
     * days up front instead of the guest discovering it only after picking a
     * date. Same advisory guarantee as the single-date methods above; just
     * calls them once per day rather than adding a bulk query, since a month
     * is at most 31 trivial reads at this business's scale.
     */
    @Transactional(readOnly = true)
    public List<PublicAvailabilityResponse> forStayMonth(String staySlug, YearMonth month, Integer nights) {
        List<PublicAvailabilityResponse> days = new ArrayList<>();
        for (LocalDate date = month.atDay(1); !date.isAfter(month.atEndOfMonth()); date = date.plusDays(1)) {
            days.add(forStay(staySlug, date, nights));
        }
        return days;
    }

    @Transactional(readOnly = true)
    public List<PublicActivityAvailabilityResponse> forActivityMonth(String activitySlug, YearMonth month) {
        List<PublicActivityAvailabilityResponse> days = new ArrayList<>();
        for (LocalDate date = month.atDay(1); !date.isAfter(month.atEndOfMonth()); date = date.plusDays(1)) {
            days.add(forActivity(activitySlug, date));
        }
        return days;
    }

    @Transactional(readOnly = true)
    public List<PublicServiceOptionAvailabilityResponse> forServiceOptionMonth(String serviceOptionSlug, YearMonth month) {
        List<PublicServiceOptionAvailabilityResponse> days = new ArrayList<>();
        for (LocalDate date = month.atDay(1); !date.isAfter(month.atEndOfMonth()); date = date.plusDays(1)) {
            days.add(forServiceOption(serviceOptionSlug, date));
        }
        return days;
    }
}
