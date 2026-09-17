package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.response.publicapi.PublicActivityAvailabilityResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicAvailabilityResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicServiceOptionAvailabilityResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.ServiceOption;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.ServiceOptionRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Read-only public availability for a stay's accommodation tiers on a given
 * night, an activity on a given day, or a guide/transport option on a given
 * day. Advisory — the authoritative allocation check happens under a row
 * lock during booking (see {@link AccommodationAvailabilityService#allocate} /
 * {@link ExtraAvailabilityService#allocate} / {@link ServiceOptionAvailabilityService#allocate}).
 */
@Service
@RequiredArgsConstructor
public class PublicAvailabilityService {

    private final TourTypeRepository tourTypeRepository;
    private final AccommodationTypeRepository accommodationTypeRepository;
    private final AccommodationAvailabilityService availabilityService;
    private final ExtraRepository extraRepository;
    private final ExtraAvailabilityService extraAvailabilityService;
    private final ServiceOptionRepository serviceOptionRepository;
    private final ServiceOptionAvailabilityService serviceOptionAvailabilityService;

    @Transactional(readOnly = true)
    public PublicAvailabilityResponse forStay(String staySlug, LocalDate date) {
        TourType stay = tourTypeRepository.findBySlugAndIsActiveTrue(staySlug)
                .orElseThrow(() -> new ResourceNotFoundException("Stay not found: " + staySlug));
        LocalDate checkIn = date;
        LocalDate checkOut = date.plusDays(1);

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

        return new PublicAvailabilityResponse(staySlug, date, tiers);
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
        ServiceOption option = serviceOptionRepository.findBySlugAndActiveTrue(serviceOptionSlug)
                .orElseThrow(() -> new ResourceNotFoundException("Service option not found: " + serviceOptionSlug));
        var a = serviceOptionAvailabilityService.status(option, date);
        return new PublicServiceOptionAvailabilityResponse(serviceOptionSlug, date, a.status().name(), a.unitsAvailable());
    }
}
