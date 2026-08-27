package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ReservationExtraRequest;
import com.camping.duneinsolite.dto.request.ReservationRequest;
import com.camping.duneinsolite.dto.request.TourTypeSelectionRequest;
import com.camping.duneinsolite.dto.request.publicapi.PublicActivityBookingRequest;
import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.dto.response.ReservationResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicBookingResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicStayBookingResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.Source;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.ReservationType;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.SourceRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.PublicBookingService;
import com.camping.duneinsolite.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class PublicBookingServiceImpl implements PublicBookingService {

    // Every vitrine booking is attributed to this seeded Source
    // (config/Seed.java's seedSources()).
    private static final String VITRINE_SOURCE_NAME = "Site web";

    private final TourTypeRepository tourTypeRepository;
    private final ExtraRepository extraRepository;
    private final SourceRepository sourceRepository;
    private final KeycloakUserSyncService keycloakUserSyncService;
    private final ReservationService reservationService;

    @Override
    public PublicBookingResponse createActivityBooking(PublicActivityBookingRequest request) {
        Extra extra = extraRepository.findBySlugAndIsActiveTrue(request.getActivitySlug())
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found: " + request.getActivitySlug()));
        User user = findOrCreateUser(request.getName(), request.getEmail(), request.getPhone());
        Source source = vitrineSource();

        ReservationRequest reservationRequest = new ReservationRequest();
        reservationRequest.setUserId(user.getUserId());
        reservationRequest.setSourceId(source.getSourceId());
        reservationRequest.setReservationType(ReservationType.EXTRAS);
        reservationRequest.setServiceDate(request.getDate());
        reservationRequest.setNumberOfAdults(request.getPartySize());
        reservationRequest.setNumberOfChildren(0);
        reservationRequest.setDemandeSpecial(demandeSpecial(request.getNotes(), timeSlotNote(request.getTimeSlot())));

        ReservationExtraRequest extraRequest = new ReservationExtraRequest();
        extraRequest.setExtraId(extra.getExtraId());
        extraRequest.setQuantity(request.getPartySize());
        extraRequest.setActivityDate(request.getDate());
        reservationRequest.setExtras(List.of(extraRequest));

        ReservationResponse reservation = reservationService.createReservation(reservationRequest);

        PublicBookingResponse response = new PublicBookingResponse();
        response.setId(reservation.getReservationId().toString());
        response.setActivitySlug(request.getActivitySlug());
        response.setDate(request.getDate().toString());
        response.setTimeSlot(request.getTimeSlot());
        response.setPartySize(request.getPartySize());
        response.setName(request.getName());
        response.setEmail(request.getEmail());
        response.setPhone(request.getPhone());
        response.setNotes(request.getNotes());
        response.setStatus("pending");
        // totalAmount is explicitly null for a pure EXTRAS reservation - the
        // real price lives in totalExtrasAmount for this reservation type.
        response.setTotal(reservation.getTotalExtrasAmount());
        response.setCreatedAt(reservation.getCreatedAt());
        return response;
    }

    @Override
    public PublicStayBookingResponse createStayBooking(PublicStayBookingRequest request) {
        TourType tourType = tourTypeRepository.findBySlugAndIsActiveTrue(request.getStaySlug())
                .orElseThrow(() -> new ResourceNotFoundException("Stay not found: " + request.getStaySlug()));
        User user = findOrCreateUser(request.getName(), request.getEmail(), request.getPhone());
        Source source = vitrineSource();

        ReservationRequest reservationRequest = new ReservationRequest();
        reservationRequest.setUserId(user.getUserId());
        reservationRequest.setSourceId(source.getSourceId());
        reservationRequest.setReservationType(ReservationType.HEBERGEMENT);
        reservationRequest.setCheckInDate(request.getDate());
        // A nuitée is one night - the contract only carries a single date.
        reservationRequest.setCheckOutDate(request.getDate().plusDays(1));
        reservationRequest.setNumberOfAdults(request.getPartySize());
        reservationRequest.setNumberOfChildren(0);
        reservationRequest.setDemandeSpecial(demandeSpecial(request.getNotes(),
                accommodationNote(request.getAccommodationSlug(), request.getAccommodationQty())));

        TourTypeSelectionRequest selection = new TourTypeSelectionRequest();
        selection.setTourTypeId(tourType.getTourTypeId());
        selection.setNumberOfAdults(request.getPartySize());
        selection.setNumberOfChildren(0);
        selection.setActivityDate(request.getDate());
        reservationRequest.setTourTypes(List.of(selection));

        List<String> rideSlugs = request.getRideSlugs() == null ? List.of() : request.getRideSlugs();
        if (!rideSlugs.isEmpty()) {
            reservationRequest.setExtras(rideSlugs.stream()
                    .map(slug -> resolveRide(slug, request.getDate()))
                    .toList());
        }

        ReservationResponse reservation = reservationService.createReservation(reservationRequest);

        PublicStayBookingResponse response = new PublicStayBookingResponse();
        response.setId(reservation.getReservationId().toString());
        response.setStaySlug(request.getStaySlug());
        response.setAccommodationSlug(request.getAccommodationSlug());
        response.setAccommodationQty(request.getAccommodationQty());
        response.setDate(request.getDate().toString());
        response.setPartySize(request.getPartySize());
        response.setRideSlugs(rideSlugs);
        response.setName(request.getName());
        response.setEmail(request.getEmail());
        response.setPhone(request.getPhone());
        response.setNotes(request.getNotes());
        response.setStatus("pending");
        // Rides attached to a stay booking are priced in totalExtrasAmount
        // but deliberately excluded from "total" here - API_CONTRACT.md
        // already documents this as intentional, not a bug.
        response.setTotal(reservation.getTotalAmount());
        response.setCreatedAt(reservation.getCreatedAt());
        return response;
    }

    private ReservationExtraRequest resolveRide(String slug, java.time.LocalDate date) {
        Extra extra = extraRepository.findBySlugAndIsActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found: " + slug));
        ReservationExtraRequest extraRequest = new ReservationExtraRequest();
        extraRequest.setExtraId(extra.getExtraId());
        extraRequest.setQuantity(1);
        extraRequest.setActivityDate(date);
        return extraRequest;
    }

    private User findOrCreateUser(String name, String email, String phone) {
        return keycloakUserSyncService.findOrCreateGuestUser(name, email, phone);
    }

    private Source vitrineSource() {
        return sourceRepository.findByName(VITRINE_SOURCE_NAME)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Source not seeded: " + VITRINE_SOURCE_NAME));
    }

    private static String timeSlotNote(String timeSlot) {
        return (timeSlot == null || timeSlot.isBlank()) ? null : "Time preference: " + timeSlot;
    }

    private static String accommodationNote(String accommodationSlug, Integer accommodationQty) {
        if (accommodationSlug == null || accommodationSlug.isBlank()) return null;
        return "Accommodation requested: " + accommodationSlug
                + (accommodationQty != null ? " x" + accommodationQty : "");
    }

    private static String demandeSpecial(String notes, String extra) {
        return Stream.of(notes, extra)
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining(" | "));
    }
}
