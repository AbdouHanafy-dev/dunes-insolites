package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.AccommodationSelectionRequest;
import com.camping.duneinsolite.dto.request.ReservationExtraRequest;
import com.camping.duneinsolite.dto.request.ReservationRequest;
import com.camping.duneinsolite.dto.request.TourSelectionRequest;
import com.camping.duneinsolite.dto.request.TourTypeSelectionRequest;
import com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest;
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
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.security.CallerContext;
import com.camping.duneinsolite.service.AccountActionService;
import com.camping.duneinsolite.service.AccommodationAvailabilityService;
import com.camping.duneinsolite.service.AccommodationPricingService;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.PublicBookingService;
import com.camping.duneinsolite.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
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
    private final AccountActionService accountActionService;
    private final UserRepository userRepository;
    private final CallerContext callerContext;
    private final ReservationService reservationService;
    private final Clock clock;

    @Value("${app.reservation.hold-duration-minutes:1440}")
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
        if (replay.isPresent()) {
            List<String> replayRides = request.getRideSlugs() == null ? List.of() : request.getRideSlugs();
            return toActivityResponse(replay.get(), request, replayRides);
        }

        Extra extra = extraRepository.findBySlugAndIsActiveTrue(request.getActivitySlug())
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found: " + request.getActivitySlug()));

        if (request.getArrivalMode() != null
                && !"OWN_VEHICLE".equals(request.getArrivalMode())
                && !"TRANSPORT".equals(request.getArrivalMode())) {
            throw new ReservationValidationException(
                    "Please tell us how you'll join the activity.");
        }

        ResolvedBookingUser resolvedUser = resolveBookingUser(
                request.getName(), request.getEmail(), request.getPhone());
        User user = resolvedUser.user();
        Source source = vitrineSource();

        int children = request.getNumberOfChildren() != null ? request.getNumberOfChildren() : 0;
        int totalHeadcount = request.getNumberOfAdults() + children;

        ReservationRequest reservationRequest = new ReservationRequest();
        reservationRequest.setUserId(user.getUserId());
        reservationRequest.setSourceId(source.getSourceId());
        reservationRequest.setReservationType(ReservationType.EXTRAS);
        reservationRequest.setServiceDate(request.getDate());
        reservationRequest.setNumberOfAdults(request.getNumberOfAdults());
        reservationRequest.setNumberOfChildren(children);
        reservationRequest.setHoldExpiresAt(holdExpiry());
        reservationRequest.setIdempotencyKey(request.getIdempotencyKey());
        reservationRequest.setDemandeSpecial(demandeSpecial(request.getNotes(), timeSlotNote(request.getTimeSlot())));
        reservationRequest.setArrivalMode(request.getArrivalMode() == null ? null
                : com.camping.duneinsolite.model.enums.ArrivalMode.valueOf(request.getArrivalMode()));
        reservationRequest.setDepartureCity(request.getDepartureCity() == null ? null
                : com.camping.duneinsolite.model.enums.DepartureCity.valueOf(request.getDepartureCity()));
        reservationRequest.setReturnCity(request.getReturnCity() == null ? null
                : com.camping.duneinsolite.model.enums.DepartureCity.valueOf(request.getReturnCity()));
        reservationRequest.setPreferredLanguageIds(parseLanguageIds(request.getPreferredLanguageIds()));
        reservationRequest.setOtherLanguageRequested(
                request.getOtherLanguageRequested() != null && !request.getOtherLanguageRequested().isBlank()
                        ? request.getOtherLanguageRequested().trim() : null);

        ReservationExtraRequest extraRequest = new ReservationExtraRequest();
        extraRequest.setExtraId(extra.getExtraId());
        // Quantity is the unit the extra is priced/held by (a seat/spot) -
        // total headcount regardless of the adult/child split, since
        // Extra.unitPrice doesn't differentiate by age (unlike TourType).
        extraRequest.setQuantity(totalHeadcount);
        extraRequest.setActivityDate(request.getDate());

        List<String> rideSlugs = request.getRideSlugs() == null ? List.of() : request.getRideSlugs();
        List<ReservationExtraRequest> selectedExtras = new java.util.ArrayList<>();
        selectedExtras.add(extraRequest);
        if (!rideSlugs.isEmpty()) {
            selectedExtras.addAll(rideSlugs.stream()
                    .filter(slug -> !slug.equals(request.getActivitySlug()))
                    .map(slug -> resolveRide(slug, request.getDate()))
                    .toList());
        }
        reservationRequest.setExtras(selectedExtras);

        ReservationResponse reservation = createIdempotent(reservationRequest, request.getIdempotencyKey());
        inviteNewGuest(resolvedUser);
        availabilityMetrics.holdCreated();
        return toActivityResponse(reservation, request, rideSlugs);
    }

    private PublicBookingResponse toActivityResponse(
            ReservationResponse reservation, PublicActivityBookingRequest request, List<String> rideSlugs) {
        PublicBookingResponse response = new PublicBookingResponse();
        response.setId(reservation.getReservationId().toString());
        response.setActivitySlug(request.getActivitySlug());
        response.setDate(request.getDate().toString());
        response.setTimeSlot(request.getTimeSlot());
        response.setNumberOfAdults(request.getNumberOfAdults());
        response.setNumberOfChildren(request.getNumberOfChildren() != null ? request.getNumberOfChildren() : 0);
        response.setRideSlugs(rideSlugs);
        response.setArrivalMode(request.getArrivalMode());
        response.setDepartureCity(request.getDepartureCity());
        response.setReturnCity(request.getReturnCity());
        response.setPreferredLanguageIds(request.getPreferredLanguageIds());
        response.setOtherLanguageRequested(request.getOtherLanguageRequested());
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
        if (replay.isPresent()) {
            List<String> rides = request.getRideSlugs() == null ? List.of() : request.getRideSlugs();
            return toTourResponse(replay.get(), request, rides);
        }

        Tour tour = tourRepository.findBySlugAndIsActiveTrue(request.getTourSlug())
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found: " + request.getTourSlug()));

        if (request.getArrivalMode() != null
                && !"OWN_VEHICLE".equals(request.getArrivalMode())
                && !"TRANSPORT".equals(request.getArrivalMode())) {
            throw new ReservationValidationException(
                    "Please tell us how you'll join the tour.");
        }

        // Same mutual-exclusion rule as createStayBooking: resolve and
        // validate before any side effect (guest-account creation, the
        // reservation itself).
        List<ResolvedServiceOption> resolvedServiceOptions = request.getServiceOptions() == null
                ? List.of()
                : request.getServiceOptions().stream()
                        .map(sel -> resolveServiceOption(sel, request.getDate(),
                                request.getNumberOfAdults() + orZero(request.getNumberOfChildren()), 1))
                        .toList();
        boolean hasTransport = resolvedServiceOptions.stream()
                .anyMatch(resolved -> resolved.catalog().getCategory() == ExtraCategory.TRANSPORT);
        // TRANSPORT is a request for staff assignment, not a requirement for
        // the guest to choose a priced vehicle. The admin assigns a chauffeur
        // after reviewing the request. A catalogue transport option remains
        // optional for flows that deliberately sell a specific pickup.
        if ("OWN_VEHICLE".equals(request.getArrivalMode()) && hasTransport) {
            throw new ReservationValidationException(
                    "Transportation can't be selected when joining with your own vehicle.");
        }

        // Resolve (and fail closed on) the camp accommodation tiers BEFORE
        // any side effect, exactly like createStayBooking — a bad slug or
        // an unpriced/inactive/undersized tier must not reach guest-account
        // creation. A circuit only offers accommodation when its Tour was
        // explicitly configured to overnight at the Sabria camp; anything
        // else is a client error, not something to silently ignore.
        List<PublicAccommodationSelectionRequest> requestedTourAccommodations =
                request.getAccommodations() == null ? List.of() : request.getAccommodations();
        if (Boolean.TRUE.equals(tour.getOvernightsAtCamp()) && requestedTourAccommodations.isEmpty()) {
            throw new ReservationValidationException(
                    "Choose at least one accommodation for the night at the Sabria camp.");
        }
        if (!requestedTourAccommodations.isEmpty() && !Boolean.TRUE.equals(tour.getOvernightsAtCamp())) {
            throw new ReservationValidationException(
                    "\"" + tour.getName() + "\" doesn't include a night at the camp — no accommodation to choose.");
        }
        record ResolvedCampTier(AccommodationType accommodation, int units) {}
        List<ResolvedCampTier> resolvedCampTiers = new java.util.ArrayList<>();
        UUID campTourTypeId = null;
        if (!requestedTourAccommodations.isEmpty()) {
            List<UUID> tourTypeIdsWithTiers = accommodationTypeRepository.findDistinctTourTypeIds();
            if (tourTypeIdsWithTiers.size() != 1) {
                throw new ResourceNotFoundException(
                        "The camp's accommodation catalogue isn't configured correctly — expected exactly one "
                                + "nuitée with tiers, found " + tourTypeIdsWithTiers.size() + ".");
            }
            campTourTypeId = tourTypeIdsWithTiers.get(0);
            for (PublicAccommodationSelectionRequest sel : requestedTourAccommodations) {
                AccommodationType accommodation = accommodationTypeRepository
                        .findByTourTypeAndSlug(campTourTypeId, sel.getAccommodationSlug())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Accommodation not found for the camp: " + sel.getAccommodationSlug()));
                int units = sel.getQuantity() != null && sel.getQuantity() > 0 ? sel.getQuantity() : 1;
                int party = request.getNumberOfAdults() + orZero(request.getNumberOfChildren());
                accommodationPricingService.resolveById(accommodation.getId(), units, 1, party, request.getDate());
                var pre = accommodationAvailabilityService.status(
                        accommodation, request.getDate(), request.getDate().plusDays(1));
                if (pre.status() == AccommodationAvailabilityService.Status.UNAVAILABLE) {
                    throw new com.camping.duneinsolite.exception.AccommodationUnavailableException(
                            "\"" + accommodation.getName() + "\" is fully booked for that date.");
                }
                resolvedCampTiers.add(new ResolvedCampTier(accommodation, units));
            }
        }

        ResolvedBookingUser resolvedUser = resolveBookingUser(
                request.getName(), request.getEmail(), request.getPhone());
        User user = resolvedUser.user();
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
        reservationRequest.setArrivalMode(request.getArrivalMode() == null ? null
                : com.camping.duneinsolite.model.enums.ArrivalMode.valueOf(request.getArrivalMode()));
        reservationRequest.setDepartureCity(request.getDepartureCity() == null ? null
                : com.camping.duneinsolite.model.enums.DepartureCity.valueOf(request.getDepartureCity()));
        reservationRequest.setReturnCity(request.getReturnCity() == null ? null
                : com.camping.duneinsolite.model.enums.DepartureCity.valueOf(request.getReturnCity()));
        reservationRequest.setPreferredLanguageIds(parseLanguageIds(request.getPreferredLanguageIds()));
        reservationRequest.setOtherLanguageRequested(
                request.getOtherLanguageRequested() != null && !request.getOtherLanguageRequested().isBlank()
                        ? request.getOtherLanguageRequested().trim() : null);

        TourSelectionRequest selection = new TourSelectionRequest();
        selection.setTourId(tour.getTourId());
        if (!resolvedCampTiers.isEmpty()) {
            com.camping.duneinsolite.dto.request.TourHebergementRequest hebergement =
                    new com.camping.duneinsolite.dto.request.TourHebergementRequest();
            hebergement.setTourTypeId(campTourTypeId);
            hebergement.setActivityDate(request.getDate());
            // Single night — matches the current circuit catalogue's own
            // durations (1-2 days), same provisional-until-confirmed
            // approach as accommodation quantity elsewhere in this API.
            hebergement.setNumberOfNights(1);
            hebergement.setNumberOfAdults(request.getNumberOfAdults());
            hebergement.setNumberOfChildren(orZero(request.getNumberOfChildren()));
            hebergement.setAccommodations(resolvedCampTiers.stream().map(tier -> {
                AccommodationSelectionRequest sel = new AccommodationSelectionRequest();
                sel.setAccommodationTypeId(tier.accommodation().getId());
                sel.setAccommodationUnits(tier.units());
                return sel;
            }).toList());
            selection.setHebergements(List.of(hebergement));
        }
        reservationRequest.setTours(List.of(selection));

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
        inviteNewGuest(resolvedUser);
        availabilityMetrics.holdCreated();
        return toTourResponse(reservation, request, rideSlugs);
    }

    private static int orZero(Integer value) {
        return value == null ? 0 : value;
    }

    // Public callers send SpokenLanguage ids as strings (JSON has no UUID
    // type) - a malformed one is a bad request, not a 500.
    private static java.util.Set<UUID> parseLanguageIds(List<String> ids) {
        if (ids == null || ids.isEmpty()) return java.util.Set.of();
        try {
            return ids.stream().map(UUID::fromString).collect(java.util.stream.Collectors.toSet());
        } catch (IllegalArgumentException e) {
            throw new ReservationValidationException("Invalid language id");
        }
    }

    private PublicTourBookingResponse toTourResponse(
            ReservationResponse reservation, PublicTourBookingRequest request, List<String> rideSlugs) {
        PublicTourBookingResponse response = new PublicTourBookingResponse();
        response.setId(reservation.getReservationId().toString());
        response.setTourSlug(request.getTourSlug());
        response.setDate(request.getDate().toString());
        response.setNumberOfAdults(request.getNumberOfAdults());
        response.setNumberOfChildren(request.getNumberOfChildren() != null ? request.getNumberOfChildren() : 0);
        response.setRideSlugs(rideSlugs);
        response.setAccommodations(request.getAccommodations());
        response.setArrivalMode(request.getArrivalMode());
        response.setDepartureCity(request.getDepartureCity());
        response.setReturnCity(request.getReturnCity());
        response.setPreferredLanguageIds(request.getPreferredLanguageIds());
        response.setOtherLanguageRequested(request.getOtherLanguageRequested());
        response.setName(request.getName());
        response.setEmail(request.getEmail());
        response.setPhone(request.getPhone());
        response.setNotes(request.getNotes());
        response.setStatus("pending");
        response.setTotal(com.camping.duneinsolite.money.Money.add(
                reservation.getTotalAmount(), reservation.getTotalExtrasAmount()));
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

        int nights = request.getNights() != null ? request.getNights() : 1;
        int maxNights = tourType.getMaxNights() != null ? tourType.getMaxNights() : 1;
        if (nights > maxNights) {
            throw new ReservationValidationException(
                    "\"" + tourType.getName() + "\" can be booked for at most " + maxNights
                            + (maxNights == 1 ? " night." : " nights."));
        }

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
                        .map(sel -> resolveServiceOption(sel, request.getDate(), request.getPartySize(), nights))
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

        // Resolve (and fail closed on) every selected accommodation tier
        // BEFORE any side effect — a bad slug, an inactive or unpriced tier,
        // or a party that won't fit must not reach guest-account creation or
        // the reservation. A guest may select several tiers at once (e.g. 2
        // Suites + 3 Tentes together).
        List<PublicAccommodationSelectionRequest> requestedAccommodations =
                request.getAccommodations() == null ? List.of() : request.getAccommodations();
        record ResolvedTier(AccommodationType accommodation, int units) {}
        List<ResolvedTier> resolvedTiers = new java.util.ArrayList<>();
        for (PublicAccommodationSelectionRequest sel : requestedAccommodations) {
            AccommodationType accommodation = accommodationTypeRepository
                    .findByTourTypeAndSlug(tourType.getTourTypeId(), sel.getAccommodationSlug())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Accommodation not found for this stay: " + sel.getAccommodationSlug()));
            int units = sel.getQuantity() != null && sel.getQuantity() > 0 ? sel.getQuantity() : 1;
            // Reuses the pricing service's fail-closed rules (unpriced / inactive
            // / not enough beds) — throws before any side effect.
            accommodationPricingService.resolveById(
                    accommodation.getId(), units, nights, request.getPartySize(), request.getDate());

            // Phase 2 — advisory pre-check: reject an obviously sold-out tier
            // before creating a guest account. NOT authoritative (no lock) —
            // ReservationService re-checks under a row lock. It only reduces
            // wasted user creation for the common "clearly full" case.
            var pre = accommodationAvailabilityService.status(
                    accommodation, request.getDate(), request.getDate().plusDays(nights));
            if (pre.status() == AccommodationAvailabilityService.Status.UNAVAILABLE) {
                throw new com.camping.duneinsolite.exception.AccommodationUnavailableException(
                        "\"" + accommodation.getName() + "\" is fully booked for that date.");
            }
            resolvedTiers.add(new ResolvedTier(accommodation, units));
        }

        ResolvedBookingUser resolvedUser = resolveBookingUser(
                request.getName(), request.getEmail(), request.getPhone());
        User user = resolvedUser.user();
        Source source = vitrineSource();

        ReservationRequest reservationRequest = new ReservationRequest();
        reservationRequest.setUserId(user.getUserId());
        reservationRequest.setSourceId(source.getSourceId());
        reservationRequest.setReservationType(ReservationType.HEBERGEMENT);
        reservationRequest.setCheckInDate(request.getDate());
        // Nights defaults to 1 for a fixed single-night stay (TourType.maxNights
        // == 1); a multi-night stay carries the guest's real arrival+departure
        // range via the client-computed `nights` count, validated above.
        reservationRequest.setCheckOutDate(request.getDate().plusDays(nights));
        reservationRequest.setNumberOfAdults(request.getPartySize());
        reservationRequest.setNumberOfChildren(0);
        reservationRequest.setHoldExpiresAt(holdExpiry());
        reservationRequest.setIdempotencyKey(request.getIdempotencyKey());
        reservationRequest.setDemandeSpecial(demandeSpecial(request.getNotes(),
                accommodationNote(requestedAccommodations)));
        reservationRequest.setArrivalMode(request.getArrivalMode() == null ? null
                : com.camping.duneinsolite.model.enums.ArrivalMode.valueOf(request.getArrivalMode()));
        reservationRequest.setDepartureCity(request.getDepartureCity() == null ? null
                : com.camping.duneinsolite.model.enums.DepartureCity.valueOf(request.getDepartureCity()));
        reservationRequest.setReturnCity(request.getReturnCity() == null ? null
                : com.camping.duneinsolite.model.enums.DepartureCity.valueOf(request.getReturnCity()));

        TourTypeSelectionRequest selection = new TourTypeSelectionRequest();
        selection.setTourTypeId(tourType.getTourTypeId());
        selection.setNumberOfAdults(request.getPartySize());
        selection.setNumberOfChildren(0);
        selection.setActivityDate(request.getDate());

        // Phase 1: ReservationService re-resolves the price and snapshots it
        // onto the stay line (per unit, per night) — see buildTourTypeSnapshot.
        // One entry per selected tier — a booking may hold several at once.
        if (!resolvedTiers.isEmpty()) {
            selection.setAccommodationSelections(resolvedTiers.stream().map(tier -> {
                AccommodationSelectionRequest sel = new AccommodationSelectionRequest();
                sel.setAccommodationTypeId(tier.accommodation().getId());
                sel.setAccommodationUnits(tier.units());
                return sel;
            }).toList());
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
        inviteNewGuest(resolvedUser);
        availabilityMetrics.holdCreated();
        return toStayResponse(reservation, request, rideSlugs);
    }

    private PublicStayBookingResponse toStayResponse(ReservationResponse reservation,
                                                     PublicStayBookingRequest request, List<String> rideSlugs) {
        PublicStayBookingResponse response = new PublicStayBookingResponse();
        response.setId(reservation.getReservationId().toString());
        response.setStaySlug(request.getStaySlug());
        response.setAccommodations(request.getAccommodations());
        response.setDate(request.getDate().toString());
        response.setNights(request.getNights() != null ? request.getNights() : 1);
        response.setPartySize(request.getPartySize());
        response.setRideSlugs(rideSlugs);
        response.setArrivalMode(request.getArrivalMode());
        response.setDepartureCity(request.getDepartureCity());
        response.setReturnCity(request.getReturnCity());
        response.setName(request.getName());
        response.setEmail(request.getEmail());
        response.setPhone(request.getPhone());
        response.setNotes(request.getNotes());
        response.setStatus("pending");
        response.setTotal(com.camping.duneinsolite.money.Money.add(
                reservation.getTotalAmount(), reservation.getTotalExtrasAmount()));
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
            int partySize,
            int nights) {
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
            // A PER_DAY guide/transport option scales with how many nights
            // the stay covers (a Tour always passes nights=1 - it has no
            // multi-night concept). PER_BOOKING stays a flat one-off fee
            // regardless of length.
            case PER_DAY -> Math.max(nights, 1);
            case PER_BOOKING -> 1;
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

    private record ResolvedBookingUser(User user, boolean newlyCreated) {}

    private ResolvedBookingUser resolveBookingUser(String name, String email, String phone) {
        String normalizedEmail = email.trim().toLowerCase(java.util.Locale.ROOT);
        if (callerContext.isAuthenticatedUser()) {
            User user = userRepository.findById(callerContext.requireUserId())
                    .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException(
                            "Authenticated account not found."));
            if (user.getRole() != com.camping.duneinsolite.model.enums.UserRole.CLIENT) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Only client accounts can place public bookings.");
            }
            if (!user.getEmail().equalsIgnoreCase(normalizedEmail)) {
                throw new ReservationValidationException(
                        "Use the email address of your signed-in account.");
            }
            return new ResolvedBookingUser(user, false);
        }

        return new ResolvedBookingUser(
                keycloakUserSyncService.createInvitedGuestUser(
                        name.trim(), normalizedEmail, phone.trim()), true);
    }

    private void inviteNewGuest(ResolvedBookingUser resolvedUser) {
        if (!resolvedUser.newlyCreated()) return;
        try {
            accountActionService.sendGuestPasswordSetupInvitation(resolvedUser.user());
        } catch (RuntimeException invitationFailure) {
            // The reservation is authoritative and must not become a 500 after
            // it has been committed. The normal forgot-password path remains
            // available if mail/token creation is temporarily unavailable.
            log.error("Booking created but account invitation failed for user {}: {}",
                    resolvedUser.user().getUserId(), invitationFailure.getMessage());
        }
    }

    private Source vitrineSource() {
        return sourceRepository.findByName(VITRINE_SOURCE_NAME)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Source not seeded: " + VITRINE_SOURCE_NAME));
    }

    private static String timeSlotNote(String timeSlot) {
        return (timeSlot == null || timeSlot.isBlank()) ? null : "Time preference: " + timeSlot;
    }

    private static String accommodationNote(List<PublicAccommodationSelectionRequest> accommodations) {
        if (accommodations == null || accommodations.isEmpty()) return null;
        return "Accommodation requested: " + accommodations.stream()
                .map(sel -> sel.getAccommodationSlug() + (sel.getQuantity() != null ? " x" + sel.getQuantity() : ""))
                .collect(Collectors.joining(", "));
    }

    private static String demandeSpecial(String notes, String extra) {
        return Stream.of(notes, extra)
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining(" | "));
    }
}
