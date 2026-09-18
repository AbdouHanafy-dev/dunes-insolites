package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ReservationExtraRequest;
import com.camping.duneinsolite.dto.request.ReservationRequest;
import com.camping.duneinsolite.dto.request.TourSelectionRequest;
import com.camping.duneinsolite.dto.request.TourTypeSelectionRequest;
import com.camping.duneinsolite.dto.request.publicapi.PublicActivityBookingRequest;
import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.dto.request.publicapi.PublicTourBookingRequest;
import com.camping.duneinsolite.dto.response.ReservationResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicBookingResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicStayBookingResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicTourBookingResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.exception.ReservationValidationException;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.Source;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.ReservationType;
import com.camping.duneinsolite.model.enums.ExtraCategory;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.SourceRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.service.AccommodationAvailabilityService;
import com.camping.duneinsolite.service.AccommodationPricingService;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.PublicBookingService;
import com.camping.duneinsolite.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
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
    private final TourRepository tourRepository;
    private final ExtraRepository extraRepository;
    private final SourceRepository sourceRepository;
    private final AccommodationTypeRepository accommodationTypeRepository;
    private final AccommodationPricingService accommodationPricingService;
    private final AccommodationAvailabilityService accommodationAvailabilityService;
    private final com.camping.duneinsolite.observability.AvailabilityMetrics availabilityMetrics;
    private final KeycloakUserSyncService keycloakUserSyncService;
    private final ReservationService reservationService;
    private final Clock clock;

    @Value("${app.reservation.hold-duration-minutes:4320}")
    private long holdDurationMinutes;

    private LocalDateTime holdExpiry() {
        return LocalDateTime.now(clock).plusMinutes(holdDurationMinutes);
    }

    /** The reservation an earlier request with this key already created, if any. */
    private java.util.Optional<ReservationResponse> replayOf(String key) {
        return (key == null || key.isBlank())
                ? java.util.Optional.empty()
                : reservationService.findByIdempotencyKey(key);
    }

    /**
     * Create the reservation, honouring the idempotency key: a retry with the
     * same key returns the reservation the first call created, and a concurrent
     * double-submit (unique-index race) re-reads by key instead of erroring.
     */
    private ReservationResponse createIdempotent(ReservationRequest reservationRequest, String key) {
        try {
            return reservationService.createReservation(reservationRequest);
        } catch (org.springframework.dao.DataIntegrityViolationException race) {
            if (key != null && !key.isBlank()) {
                return reservationService.findByIdempotencyKey(key).orElseThrow(() -> race);
            }
            throw race;
        }
    }

    @Override
    public PublicBookingResponse createActivityBooking(PublicActivityBookingRequest request) {
        // Idempotency short-circuit BEFORE any pre-check — a retry of a booking
        // that succeeded must return that booking even if the activity has since
        // filled up or the slug was deactivated.
        var replay = replayOf(request.getIdempotencyKey());
        if (replay.isPresent()) return toActivityResponse(replay.get(), request);

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
        reservationRequest.setHoldExpiresAt(holdExpiry());
        reservationRequest.setIdempotencyKey(request.getIdempotencyKey());
        reservationRequest.setDemandeSpecial(demandeSpecial(request.getNotes(), timeSlotNote(request.getTimeSlot())));

        ReservationExtraRequest extraRequest = new ReservationExtraRequest();
        extraRequest.setExtraId(extra.getExtraId());
        extraRequest.setQuantity(request.getPartySize());
        extraRequest.setActivityDate(request.getDate());
        reservationRequest.setExtras(List.of(extraRequest));

        ReservationResponse reservation = createIdempotent(reservationRequest, request.getIdempotencyKey());
        availabilityMetrics.holdCreated();
        return toActivityResponse(reservation, request);
    }

    private PublicBookingResponse toActivityResponse(ReservationResponse reservation, PublicActivityBookingRequest request) {
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
    public PublicTourBookingResponse createTourBooking(PublicTourBookingRequest request) {
        var replay = replayOf(request.getIdempotencyKey());
        if (replay.isPresent()) return toTourResponse(replay.get(), request);

        Tour tour = tourRepository.findBySlugAndIsActiveTrue(request.getTourSlug())
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found: " + request.getTourSlug()));
        User user = findOrCreateUser(request.getName(), request.getEmail(), request.getPhone());
        Source source = vitrineSource();

        ReservationRequest reservationRequest = new ReservationRequest();
        reservationRequest.setUserId(user.getUserId());
        reservationRequest.setSourceId(source.getSourceId());
        reservationRequest.setReservationType(ReservationType.TOURS);
        reservationRequest.setServiceDate(request.getDate());
        reservationRequest.setNumberOfAdults(request.getNumberOfAdults());
        reservationRequest.setNumberOfChildren(
                request.getNumberOfChildren() != null ? request.getNumberOfChildren() : 0);
        reservationRequest.setHoldExpiresAt(holdExpiry());
        reservationRequest.setIdempotencyKey(request.getIdempotencyKey());
        reservationRequest.setDemandeSpecial(demandeSpecial(request.getNotes(), null));

        TourSelectionRequest selection = new TourSelectionRequest();
        selection.setTourId(tour.getTourId());
        reservationRequest.setTours(List.of(selection));

        ReservationResponse reservation = createIdempotent(reservationRequest, request.getIdempotencyKey());
        availabilityMetrics.holdCreated();
        return toTourResponse(reservation, request);
    }

    private PublicTourBookingResponse toTourResponse(ReservationResponse reservation, PublicTourBookingRequest request) {
        PublicTourBookingResponse response = new PublicTourBookingResponse();
        response.setId(reservation.getReservationId().toString());
        response.setTourSlug(request.getTourSlug());
        response.setDate(request.getDate().toString());
        response.setNumberOfAdults(request.getNumberOfAdults());
        response.setNumberOfChildren(request.getNumberOfChildren() != null ? request.getNumberOfChildren() : 0);
        response.setName(request.getName());
        response.setEmail(request.getEmail());
        response.setPhone(request.getPhone());
        response.setNotes(request.getNotes());
        response.setStatus("pending");
        response.setTotal(reservation.getTotalAmount());
        response.setCreatedAt(reservation.getCreatedAt());
        return response;
    }

    @Override
    public PublicStayBookingResponse createStayBooking(PublicStayBookingRequest request) {
        var replay = replayOf(request.getIdempotencyKey());
        if (replay.isPresent()) {
            List<String> rides = request.getRideSlugs() == null ? List.of() : request.getRideSlugs();
            return toStayResponse(replay.get(), request, rides);
        }

        TourType tourType = tourTypeRepository.findBySlugAndIsActiveTrue(request.getStaySlug())
                .orElseThrow(() -> new ResourceNotFoundException("Stay not found: " + request.getStaySlug()));

        if (request.getArrivalMode() != null
                && !"OWN_VEHICLE".equals(request.getArrivalMode())
                && !"TRANSPORT".equals(request.getArrivalMode())) {
            throw new ReservationValidationException(
                    "Please tell us how you'll join the experience.");
        }

        // Resolve and validate public slugs before guest-account creation. The
        // mode is explicit because an empty option list alone cannot tell the
        // server whether the guest has a vehicle or forgot transportation.
        List<ResolvedServiceOption> resolvedServiceOptions = request.getServiceOptions() == null
                ? List.of()
                : request.getServiceOptions().stream()
                        .map(sel -> resolveServiceOption(sel, request.getDate(), request.getPartySize()))
                        .toList();
        boolean hasTransport = resolvedServiceOptions.stream()
                .anyMatch(resolved -> resolved.catalog().getCategory() == ExtraCategory.TRANSPORT);
        if ("TRANSPORT".equals(request.getArrivalMode()) && !hasTransport) {
            throw new ReservationValidationException(
                    "Please choose transportation to reach the experience.");
        }
        if ("OWN_VEHICLE".equals(request.getArrivalMode()) && hasTransport) {
            throw new ReservationValidationException(
                    "Transportation can't be selected when joining with your own vehicle.");
        }

        // Resolve (and fail closed on) the accommodation BEFORE any side effect
        // — a bad slug, an inactive or unpriced tier, or a party that won't fit
        // must not reach guest-account creation or the reservation.
        AccommodationType accommodation = null;
        int accommodationUnits = 1;
        if (request.getAccommodationSlug() != null && !request.getAccommodationSlug().isBlank()) {
            accommodation = accommodationTypeRepository
                    .findByTourTypeAndSlug(tourType.getTourTypeId(), request.getAccommodationSlug())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Accommodation not found for this stay: " + request.getAccommodationSlug()));
            accommodationUnits = request.getAccommodationQty() != null && request.getAccommodationQty() > 0
                    ? request.getAccommodationQty() : 1;
            // Reuses the pricing service's fail-closed rules (unpriced / inactive
            // / not enough beds) — throws before any side effect.
            accommodationPricingService.resolveById(
                    accommodation.getId(), accommodationUnits, 1, request.getPartySize(), request.getDate());

            // Phase 2 — advisory pre-check: reject an obviously sold-out tier
            // before creating a guest account. NOT authoritative (no lock) —
            // ReservationService re-checks under a row lock. It only reduces
            // wasted user creation for the common "clearly full" case.
            var pre = accommodationAvailabilityService.status(
                    accommodation, request.getDate(), request.getDate().plusDays(1));
            if (pre.status() == AccommodationAvailabilityService.Status.UNAVAILABLE) {
                throw new com.camping.duneinsolite.exception.AccommodationUnavailableException(
                        "\"" + accommodation.getName() + "\" is fully booked for that date.");
            }
        }

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
        reservationRequest.setHoldExpiresAt(holdExpiry());
        reservationRequest.setIdempotencyKey(request.getIdempotencyKey());
        reservationRequest.setDemandeSpecial(demandeSpecial(request.getNotes(),
                accommodationNote(request.getAccommodationSlug(), request.getAccommodationQty())));

        TourTypeSelectionRequest selection = new TourTypeSelectionRequest();
        selection.setTourTypeId(tourType.getTourTypeId());
        selection.setNumberOfAdults(request.getPartySize());
        selection.setNumberOfChildren(0);
        selection.setActivityDate(request.getDate());

        // Phase 1: ReservationService re-resolves the price and snapshots it
        // onto the stay line (per unit, per night) — see buildTourTypeSnapshot.
        if (accommodation != null) {
            selection.setAccommodationTypeId(accommodation.getId());
            selection.setAccommodationUnits(accommodationUnits);
        }

        reservationRequest.setTourTypes(List.of(selection));

        List<String> rideSlugs = request.getRideSlugs() == null ? List.of() : request.getRideSlugs();
        List<ReservationExtraRequest> selectedExtras = new java.util.ArrayList<>();
        if (!rideSlugs.isEmpty()) {
            selectedExtras.addAll(rideSlugs.stream()
                    .map(slug -> resolveRide(slug, request.getDate()))
                    .toList());
        }

        if (!resolvedServiceOptions.isEmpty()) {
            selectedExtras.addAll(resolvedServiceOptions.stream()
                    .map(ResolvedServiceOption::request)
                    .toList());
        }
        if (!selectedExtras.isEmpty()) reservationRequest.setExtras(selectedExtras);

        ReservationResponse reservation = createIdempotent(reservationRequest, request.getIdempotencyKey());
        availabilityMetrics.holdCreated();
        return toStayResponse(reservation, request, rideSlugs);
    }

    private PublicStayBookingResponse toStayResponse(ReservationResponse reservation,
                                                     PublicStayBookingRequest request, List<String> rideSlugs) {
        PublicStayBookingResponse response = new PublicStayBookingResponse();
        response.setId(reservation.getReservationId().toString());
        response.setStaySlug(request.getStaySlug());
        response.setAccommodationSlug(request.getAccommodationSlug());
        response.setAccommodationQty(request.getAccommodationQty());
        response.setDate(request.getDate().toString());
        response.setPartySize(request.getPartySize());
        response.setRideSlugs(rideSlugs);
        response.setArrivalMode(request.getArrivalMode());
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

    private record ResolvedServiceOption(Extra catalog, ReservationExtraRequest request) {}

    private ResolvedServiceOption resolveServiceOption(
            com.camping.duneinsolite.dto.request.publicapi.PublicServiceOptionSelectionRequest sel,
            java.time.LocalDate date,
            int partySize) {
        Extra option = extraRepository.findBySlugAndIsActiveTrue(sel.getServiceOptionSlug())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Service option not found: " + sel.getServiceOptionSlug()));
        if (option.getCategory() != ExtraCategory.GUIDE && option.getCategory() != ExtraCategory.TRANSPORT) {
            throw new ReservationValidationException("Not a guide or transportation option: " + option.getName());
        }
        ReservationExtraRequest req = new ReservationExtraRequest();
        req.setExtraId(option.getExtraId());
        int quantity = switch (option.getPricingUnit()) {
            case PER_PERSON -> Math.max(partySize, 1);
            case PER_DAY, PER_BOOKING -> 1; // Public stays are exactly one night/day.
            case PER_VEHICLE, PER_UNIT -> sel.getQuantity() != null ? Math.max(sel.getQuantity(), 1) : 1;
        };
        req.setQuantity(quantity);
        req.setActivityDate(date);
        req.setPickupHotelName(sel.getPickupHotelName());
        req.setPickupAirport(sel.getPickupAirport());
        req.setPickupFlightNumber(sel.getPickupFlightNumber());
        req.setPickupAddress(sel.getPickupAddress());
        req.setPickupArrivalTime(sel.getPickupArrivalTime());
        req.setPickupInstructions(sel.getPickupInstructions());
        return new ResolvedServiceOption(option, req);
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
