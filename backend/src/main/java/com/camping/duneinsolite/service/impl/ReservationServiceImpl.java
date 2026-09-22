package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.config.CurrencyConfig;
import com.camping.duneinsolite.config.RabbitMQConfig;
import com.camping.duneinsolite.dto.message.NotificationMessage;
import com.camping.duneinsolite.dto.request.*;
import com.camping.duneinsolite.dto.response.CampingStatsResponse;
import com.camping.duneinsolite.dto.response.InvoiceResponse;
import com.camping.duneinsolite.dto.response.PaymentSummary;
import com.camping.duneinsolite.dto.response.ReservationResponse;
import com.camping.duneinsolite.dto.response.TransactionResponse;
import com.camping.duneinsolite.exception.ReservationStatusException;
import com.camping.duneinsolite.exception.ReservationValidationException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.exception.UserNotFoundException;
import com.camping.duneinsolite.mapper.ReservationMapper;
import com.camping.duneinsolite.mapper.TransactionMapper;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.repository.specification.ReservationSpecification;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.service.AccommodationAvailabilityService;
import com.camping.duneinsolite.service.AccommodationPricingService;
import com.camping.duneinsolite.service.InvoiceService;
import com.camping.duneinsolite.service.NotificationPublisher;
import com.camping.duneinsolite.service.PaymentService;
import com.camping.duneinsolite.service.ReservationService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository      reservationRepository;
    private final UserRepository             userRepository;
    private final TourTypeRepository         tourTypeRepository;
    private final ExtraRepository            extraRepository;
    private final TourRepository             tourRepository;
    private final SourceRepository           sourceRepository;
    private final ReservationMapper          reservationMapper;
    private final NotificationPublisher      notificationPublisher;
    private final PaymentService             paymentService;
    private final TransactionMapper          transactionMapper;
    private final TransactionRepository      transactionRepository;
    private final InvoiceRepository           invoiceRepository;
    private final InvoiceService              invoiceService;
    private final ReservationCapacityValidator reservationCapacityValidator;
    private final CurrencyConfig              currencyConfig;
    private final EmailService                emailService;
    private final WhatsAppNotificationService whatsAppNotificationService;
    private final AccommodationPricingService accommodationPricingService;
    private final AccommodationAvailabilityService accommodationAvailabilityService;
    private final com.camping.duneinsolite.service.ExtraAvailabilityService extraAvailabilityService;
    private final com.camping.duneinsolite.service.ExtraPricingService extraPricingService;
    private final com.camping.duneinsolite.security.CallerContext caller;
    private final com.camping.duneinsolite.service.ReservationStateMachine stateMachine;
    private final com.camping.duneinsolite.service.ReservationInvoiceService reservationInvoiceService;
    private final SpokenLanguageRepository    spokenLanguageRepository;
    private final GuideRepository              guideRepository;
    private final com.camping.duneinsolite.service.GuideProfileService guideProfileService;
    private final ChauffeurRepository          chauffeurRepository;
    private final com.camping.duneinsolite.service.DriverProfileService driverProfileService;

    @PersistenceContext
    private EntityManager entityManager;

    // ─────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public java.util.Optional<ReservationResponse> findByIdempotencyKey(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) return java.util.Optional.empty();
        return reservationRepository.findByIdempotencyKey(idempotencyKey).map(this::toEnrichedResponse);
    }

    @Override
    public ReservationResponse createReservation(ReservationRequest request) {

        // Public booking idempotency (V7): a network retry with the same key
        // returns the reservation the first request created — no duplicate, no
        // duplicate hold. The partial unique index on idempotency_key is the
        // atomic guarantee for a concurrent double-submit (the loser's INSERT
        // fails; PublicBookingServiceImpl catches it and re-reads by key).
        String idem = request.getIdempotencyKey();
        if (idem != null && !idem.isBlank()) {
            var existing = reservationRepository.findByIdempotencyKey(idem);
            if (existing.isPresent()) {
                return toEnrichedResponse(existing.get());
            }
        }

        // A non-staff caller can only create a reservation for THEMSELVES — the
        // request's userId is otherwise a mass-assignment hole (a CLIENT could
        // attribute bookings to any other account). Staff (ADMIN/CAMPING) and the
        // server-side public-booking path may set it to anyone.
        if (caller.isAuthenticatedUser() && !caller.isStaff()) {
            request.setUserId(caller.requireUserId());
        }

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new UserNotFoundException(request.getUserId()));

        Source source = sourceRepository.findById(request.getSourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Source not found: " + request.getSourceId()));

        boolean isPartner = user.getRole() == UserRole.PARTENAIRE;

        int globalAdults   = request.getNumberOfAdults()   != null ? request.getNumberOfAdults()   : 0;
        int globalChildren = request.getNumberOfChildren() != null ? request.getNumberOfChildren() : 0;

        ReservationType type = request.getReservationType();

        validateReservationByType(request, type);

        Reservation reservation = buildBaseReservation(request, user, source, type, globalAdults, globalChildren);

        applyReservationItems(request, reservation, type, globalAdults, globalChildren, isPartner, user);

        if (request.getInitialPayment() != null
                && request.getInitialPayment().getCurrency() != null
                && request.getInitialPayment().getCurrency() != Currency.TND) {
            applyReservationCurrencyConversion(reservation, request.getInitialPayment().getCurrency());
        }

        enforceAccommodationAvailability(reservation, null);
        enforceExtraAvailability(reservation, null);
        reservationCapacityValidator.validate(reservation, null);

        Reservation savedReservation = reservationRepository.save(reservation);

        publishCreationNotification(savedReservation);

        handleInitialPayment(request, savedReservation);

        return toEnrichedResponse(savedReservation);
    }

    // ── Validation ────────────────────────────────────────────────────────────────

    private void validateReservationByType(ReservationRequest request, ReservationType type) {
        switch (type) {
            case HEBERGEMENT -> validateHebergement(request);
            case TOURS       -> validateTours(request);
            case EXTRAS      -> validateExtras(request);
        }
    }

    private void validateHebergement(ReservationRequest request) {
        if (request.getCheckInDate() == null || request.getCheckOutDate() == null) {
            throw new ReservationValidationException("Check-in and check-out dates are required for HEBERGEMENT reservations");
        }
        if (request.getTourTypes() == null || request.getTourTypes().isEmpty()) {
            throw new ReservationValidationException("At least one tour type is required for HEBERGEMENT reservations");
        }
    }

    private void validateTours(ReservationRequest request) {
        if (request.getTours() == null || request.getTours().isEmpty()) {
            throw new ReservationValidationException("A tour selection is required for TOURS reservations");
        }
        if (request.getTours().size() > 1) {
            throw new ReservationValidationException("Only one tour can be selected per reservation");
        }
        if (request.getServiceDate() == null) {
            throw new ReservationValidationException("Departure date (serviceDate) is required for TOURS reservations");
        }
    }

    private void validateExtras(ReservationRequest request) {
        // A standalone booking needs at least one activity OR one guide/
        // transport option - "just a hotel pickup with no activity" is a
        // legitimate booking on its own, so this isn't "extras only" anymore.
        boolean hasExtras = request.getExtras() != null && !request.getExtras().isEmpty();
        if (!hasExtras) {
            throw new ReservationValidationException(
                    "At least one extra is required for EXTRAS reservations");
        }
        if (request.getServiceDate() == null) {
            throw new ReservationValidationException("Service date is required for EXTRAS reservations");
        }
    }


    // ── Base reservation builder ──────────────────────────────────────────────────

    private Reservation buildBaseReservation(ReservationRequest request, User user,
                                             Source source, ReservationType type,
                                             int globalAdults, int globalChildren) {
        return Reservation.builder()
                .user(user)
                .sourceRef(source)
                .reservationType(type)
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .serviceDate(request.getServiceDate())
                .groupName(request.getGroupName())
                .groupLeaderName(request.getGroupLeaderName())
                .demandeSpecial(request.getDemandeSpecial())
                .arrivalMode(request.getArrivalMode())
                .departureCity(request.getDepartureCity())
                .returnCity(request.getReturnCity())
                .preferredLanguages(resolveLanguages(request.getPreferredLanguageIds()))
                .otherLanguageRequested(request.getOtherLanguageRequested())
                .numberOfAdults(globalAdults)
                .numberOfChildren(globalChildren)
                .currency(Currency.TND)
                .promoCode(request.getPromoCode())
                .status(ReservationStatus.PENDING)
                .holdExpiresAt(request.getHoldExpiresAt())
                .idempotencyKey(request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()
                        ? request.getIdempotencyKey() : null)
                .build();
    }

    // Resolves SpokenLanguage ids from a public/admin request into real
    // entities. Used for both Reservation.preferredLanguages and
    // Guide.languages - an unknown id fails closed rather than silently
    // dropping a language the caller explicitly asked for.
    private java.util.Set<com.camping.duneinsolite.model.SpokenLanguage> resolveLanguages(
            java.util.Set<UUID> languageIds) {
        if (languageIds == null || languageIds.isEmpty()) return new java.util.HashSet<>();
        var languages = new java.util.HashSet<>(spokenLanguageRepository.findAllById(languageIds));
        if (languages.size() != languageIds.size()) {
            throw new ReservationValidationException("One or more languages not found");
        }
        return languages;
    }

    // ── Items dispatcher ──────────────────────────────────────────────────────────

    private void applyReservationItems(ReservationRequest request, Reservation reservation,
                                       ReservationType type, int globalAdults, int globalChildren,
                                       boolean isPartner, User user) {
        switch (type) {
            case HEBERGEMENT -> applyHebergementItems(request, reservation, globalAdults, globalChildren, isPartner, user);
            case TOURS       -> applyToursItems(request, reservation, globalAdults, globalChildren, isPartner);
            case EXTRAS      -> reservation.setTotalAmount(null);
        }

        applyParticipants(request, reservation);
        applyExtras(request, reservation, user);
        validateGuideRequired(request, reservation, type);

        reservation.setTotalExtrasAmount(reservation.calculateTotalExtrasAmount());
    }

    // ── Service options (guide, transport/pickup) ──────────────────────────────────

    /**
     * Some stays require an accompanying guide (TourType.guideRequired) -
     * if any selected tour type does, the guest must have picked at least
     * one GUIDE-category service option. Configurable per tour, per the
     * booking brief.
     */
    private void validateGuideRequired(ReservationRequest request, Reservation reservation, ReservationType type) {
        if (type != ReservationType.HEBERGEMENT || request.getTourTypes() == null) return;

        boolean anyRequires = request.getTourTypes().stream()
                .map(TourTypeSelectionRequest::getTourTypeId)
                .filter(java.util.Objects::nonNull)
                .anyMatch(id -> tourTypeRepository.findById(id).map(TourType::getGuideRequired).orElse(false));
        if (!anyRequires) return;

        boolean hasGuide = reservation.getExtras().stream()
                .anyMatch(o -> !o.isResourceAllocation() && o.getCategory() == ExtraCategory.GUIDE);
        if (!hasGuide) {
            throw new ReservationValidationException("This stay requires an accompanying guide — please choose one.");
        }
    }

    // ── HEBERGEMENT ───────────────────────────────────────────────────────────────

    private void applyHebergementItems(ReservationRequest request, Reservation reservation,
                                       int globalAdults, int globalChildren, boolean isPartner, User user) {
        long nights = ChronoUnit.DAYS.between(request.getCheckInDate(), request.getCheckOutDate());
        if (nights <= 0) nights = 1;

        boolean singleTourType = request.getTourTypes().size() == 1;

        if (!singleTourType) {
            validateTourTypePeopleCounts(request, globalAdults, globalChildren);
        }

        for (TourTypeSelectionRequest selection : request.getTourTypes()) {
            ReservationTourType snapshot = buildTourTypeSnapshot(
                    selection, singleTourType, globalAdults, globalChildren, nights, isPartner, user);
            reservation.addTourType(snapshot);

            if (selection.getRepartitions() != null) {
                for (var r : selection.getRepartitions()) {
                    ReservationRepartition rep = ReservationRepartition.builder()
                            .tenteType(r.getTenteType())
                            .numberOfTentes(r.getNumberOfTentes())
                            .reservationTourType(snapshot)
                            .build();
                    reservation.addRepartition(rep);
                }
            }
        }

        reservation.setTotalAmount(reservation.calculateTotalTourTypesAmount());
    }

    private void validateTourTypePeopleCounts(ReservationRequest request,
                                              int globalAdults, int globalChildren) {
        for (TourTypeSelectionRequest selection : request.getTourTypes()) {
            int selAdults   = selection.getNumberOfAdults()   != null ? selection.getNumberOfAdults()   : 0;
            int selChildren = selection.getNumberOfChildren() != null ? selection.getNumberOfChildren() : 0;

            if (selAdults > globalAdults) {
                throw new ReservationValidationException(
                        "Tour type adults (" + selAdults + ") cannot exceed group adults (" + globalAdults + ")");
            }
            if (selChildren > globalChildren) {
                throw new ReservationValidationException(
                        "Tour type children (" + selChildren + ") cannot exceed group children (" + globalChildren + ")");
            }
        }

        int totalSelAdults = request.getTourTypes().stream()
                .mapToInt(t -> t.getNumberOfAdults() != null ? t.getNumberOfAdults() : 0).sum();
        int totalSelChildren = request.getTourTypes().stream()
                .mapToInt(t -> t.getNumberOfChildren() != null ? t.getNumberOfChildren() : 0).sum();

        if (totalSelAdults < globalAdults) {
            throw new ReservationValidationException(
                    "Total adults across all tour types (" + totalSelAdults + ") " +
                            "cannot be less than group adults (" + globalAdults + "). " +
                            "Every person must be assigned to at least one tour type.");
        }
        if (totalSelChildren < globalChildren) {
            throw new ReservationValidationException(
                    "Total children across all tour types (" + totalSelChildren + ") " +
                            "cannot be less than group children (" + globalChildren + "). " +
                            "Every child must be assigned to at least one tour type.");
        }
    }

    private ReservationTourType buildTourTypeSnapshot(TourTypeSelectionRequest selection,
                                                      boolean singleTourType,
                                                      int globalAdults, int globalChildren,
                                                      long nights, boolean isPartner, User user) {
        TourType tourType = tourTypeRepository.findById(selection.getTourTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("TourType not found: " + selection.getTourTypeId()));

        int adults   = singleTourType ? globalAdults   : (selection.getNumberOfAdults()   != null ? selection.getNumberOfAdults()   : 0);
        int children = singleTourType ? globalChildren : (selection.getNumberOfChildren() != null ? selection.getNumberOfChildren() : 0);

        java.math.BigDecimal adultPrice = isPartner ? tourType.getPartnerAdultPrice() : tourType.getPassengerAdultPrice();
        java.math.BigDecimal childPrice = isPartner ? tourType.getPartnerChildPrice() : tourType.getPassengerChildPrice();

        UserProductRemise remise = user.getRemises().stream()
                .filter(r -> r.getProductId().equals(tourType.getTourTypeId()))
                .findFirst().orElse(null);
        if (remise != null) {
            adultPrice = applyRemise(adultPrice, remise.getAdultRemise());
            childPrice = applyRemise(childPrice, remise.getChildRemise());
        }

        var builder = ReservationTourType.builder()
                .catalogTourTypeId(tourType.getTourTypeId())
                .name(tourType.getName())
                .description(tourType.getDescription())
                .duration(tourType.getDuration())
                .adultPrice(adultPrice)
                .childPrice(childPrice)
                .numberOfAdults(adults)
                .numberOfChildren(children)
                .numberOfNights(1)
                .activityDate(selection.getActivityDate())
                .tva(tourType.getTva());

        // Phase 1: if the guest picked an accommodation tier, the server
        // resolves its price (fails closed if unpriced/inactive/undersized) and
        // snapshots it — this line is then priced per unit, not per person.
        if (selection.getAccommodationTypeId() != null) {
            int units = selection.getAccommodationUnits() != null ? selection.getAccommodationUnits() : 1;
            var priced = accommodationPricingService.resolveById(
                    selection.getAccommodationTypeId(), units, 1, adults + children, selection.getActivityDate());
            builder.accommodationTypeId(priced.accommodationTypeId())
                    .accommodationName(priced.name())
                    .accommodationUnits(priced.units())
                    .accommodationUnitPriceTtc(priced.snapshotUnitPriceTtc())
                    .accommodationTvaRate(priced.tvaRate());
        }

        return builder.build();
    }

    /**
     * Phase 2 — for every accommodation-priced stay line, take the tier's
     * {@code FOR UPDATE} lock and verify the requested units fit under
     * {@code maxUnits} for the reservation's nights. The lock is held to
     * transaction commit, so the check→persist window cannot be raced. No-op
     * when a tier has no {@code maxUnits} configured.
     */
    private void enforceAccommodationAvailability(Reservation reservation, UUID excludeReservationId) {
        if (reservation.getReservationType() != ReservationType.HEBERGEMENT
                || reservation.getCheckInDate() == null || reservation.getCheckOutDate() == null) {
            return;
        }
        for (ReservationTourType line : reservation.getTourTypes()) {
            if (line.isAccommodationPriced()) {
                accommodationAvailabilityService.allocate(
                        line.getAccommodationTypeId(), line.getAccommodationUnits(),
                        reservation.getCheckInDate(), reservation.getCheckOutDate(),
                        excludeReservationId);
            }
        }
    }

    /**
     * Every activity line (quad, camel ride...) on the reservation, take the
     * activity's {@code FOR UPDATE} lock and verify the requested quantity
     * fits under {@code maxUnitsPerDay} for its date. Unlike accommodation,
     * this runs regardless of {@code reservationType} — an activity line can
     * be a standalone EXTRAS booking or a ride attached to a HEBERGEMENT
     * stay, and both consume the same shared inventory. No-op when an
     * activity has no {@code maxUnitsPerDay} configured.
     */
    private void enforceExtraAvailability(Reservation reservation, UUID excludeReservationId) {
        Map<String, ReservationExtra> grouped = new java.util.TreeMap<>();
        for (ReservationExtra line : reservation.getExtras()) {
            if (line.getCatalogExtraId() == null || line.getActivityDate() == null) continue;
            String key = line.getCatalogExtraId() + "|" + line.getActivityDate();
            grouped.merge(key, line, (left, right) -> {
                left.setQuantity(left.getQuantity() + right.getQuantity());
                return left;
            });
        }
        // Deterministic resource/date lock order prevents deadlocks when two
        // composite options consume the same guide and vehicle resources.
        for (ReservationExtra line : grouped.values()) {
            extraAvailabilityService.allocate(
                    line.getCatalogExtraId(), line.getQuantity(), line.getActivityDate(), excludeReservationId);
        }
    }

    // ── TOURS ─────────────────────────────────────────────────────────────────────

    private void applyToursItems(ReservationRequest request, Reservation reservation,
                                 int globalAdults, int globalChildren, boolean isPartner) {
        ReservationTour reservationTour = buildTourSnapshot(request, globalAdults, globalChildren, isPartner);
        reservation.addTour(reservationTour);

        TourSelectionRequest selection = request.getTours().get(0);
        if (selection.getHebergements() != null && !selection.getHebergements().isEmpty()) {
            applyTourHebergements(selection.getHebergements(), reservationTour, reservation);
        }

        reservation.setTotalAmount(reservation.calculateTotalToursAmount());
    }

    // Embedded, free accommodation nights on a TOURS reservation. Derives the reservation's
    // checkInDate/checkOutDate from these nights (earliest activityDate / latest
    // activityDate+numberOfNights) since the camping-board queries gate TOURS rows on
    // checkInDate being set.
    private void applyTourHebergements(List<TourHebergementRequest> hebergements,
                                       ReservationTour reservationTour, Reservation reservation) {
        LocalDate minCheckIn = null;
        LocalDate maxCheckOut = null;

        for (TourHebergementRequest h : hebergements) {
            TourType tourType = tourTypeRepository.findById(h.getTourTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("TourType not found: " + h.getTourTypeId()));
            int nights = (h.getNumberOfNights() != null && h.getNumberOfNights() > 0) ? h.getNumberOfNights() : 1;

            ReservationTourHebergement snapshot = ReservationTourHebergement.builder()
                    .catalogTourTypeId(tourType.getTourTypeId())
                    .name(tourType.getName())
                    .description(tourType.getDescription())
                    .duration(tourType.getDuration())
                    .numberOfNights(nights)
                    .numberOfAdults(h.getNumberOfAdults() != null ? h.getNumberOfAdults() : 0)
                    .numberOfChildren(h.getNumberOfChildren() != null ? h.getNumberOfChildren() : 0)
                    .activityDate(h.getActivityDate())
                    .build();
            reservationTour.addHebergement(snapshot);

            if (h.getRepartitions() != null) {
                for (RepartitionRequest r : h.getRepartitions()) {
                    ReservationRepartition rep = ReservationRepartition.builder()
                            .tenteType(r.getTenteType())
                            .numberOfTentes(r.getNumberOfTentes())
                            .reservationTourHebergement(snapshot)
                            .build();
                    reservation.addRepartition(rep);
                }
            }

            if (h.getActivityDate() != null) {
                if (minCheckIn == null || h.getActivityDate().isBefore(minCheckIn)) minCheckIn = h.getActivityDate();
                LocalDate departureForThis = h.getActivityDate().plusDays(nights);
                if (maxCheckOut == null || departureForThis.isAfter(maxCheckOut)) maxCheckOut = departureForThis;
            }
        }

        if (minCheckIn != null)  reservation.setCheckInDate(minCheckIn);
        if (maxCheckOut != null) reservation.setCheckOutDate(maxCheckOut);
    }

    private ReservationTour buildTourSnapshot(ReservationRequest request,
                                              int globalAdults, int globalChildren, boolean isPartner) {
        TourSelectionRequest selection = request.getTours().get(0);

        Tour tour = tourRepository.findById(selection.getTourId())
                .orElseThrow(() -> new ResourceNotFoundException("Tour not found: " + selection.getTourId()));

        java.math.BigDecimal adultPrice = isPartner ? tour.getPartnerAdultPrice() : tour.getPassengerAdultPrice();
        java.math.BigDecimal childPrice = isPartner ? tour.getPartnerChildPrice() : tour.getPassengerChildPrice();
        java.math.BigDecimal totalPrice = Money.add(
                Money.multiply(adultPrice, globalAdults),
                Money.multiply(childPrice, globalChildren));

        return ReservationTour.builder()
                .catalogTourId(tour.getTourId())
                .name(tour.getName())
                .description(tour.getDescription())
                .duration(tour.getDuration())
                .adultPrice(adultPrice)
                .childPrice(childPrice)
                .numberOfAdults(globalAdults)
                .numberOfChildren(globalChildren)
                .departureDate(request.getServiceDate())
                .totalPrice(totalPrice)
                .tva(tour.getTva())
                .build();
    }

    // ── Participants ──────────────────────────────────────────────────────────────

    private void applyParticipants(ReservationRequest request, Reservation reservation) {
        if (request.getParticipants() == null) return;

        request.getParticipants().forEach(p -> {
            Participant participant = Participant.builder()
                    .fullName(p.getFullName())
                    .age(p.getAge())
                    .isAdult(p.getIsAdult())
                    .build();
            reservation.addParticipant(participant);
        });
    }

    // ── Extras ────────────────────────────────────────────────────────────────────

    private void applyExtras(ReservationRequest request, Reservation reservation, User user) {
        applyExtras(request.getExtras(), reservation, user);
    }

    private void applyExtras(List<ReservationExtraRequest> requestedExtras,
                             Reservation reservation, User user) {
        if (requestedExtras == null) return;

        requestedExtras.forEach(e -> {
            Extra catalog = extraRepository.findById(e.getExtraId())
                    .orElseThrow(() -> new ResourceNotFoundException("Extra not found: " + e.getExtraId()));
            if (!Boolean.TRUE.equals(catalog.getIsActive())) {
                throw new ReservationValidationException("Extra is inactive: " + catalog.getName());
            }

            LocalDate activityDate = e.getActivityDate() != null ? e.getActivityDate()
                    : reservation.getServiceDate() != null ? reservation.getServiceDate()
                    : reservation.getCheckInDate();
            if (activityDate == null) {
                throw new ReservationValidationException("A service date is required for " + catalog.getName());
            }

            int requestedQuantity = e.getQuantity() != null ? Math.max(e.getQuantity(), 1) : 1;
            int people = Math.max(1, reservation.getNumberOfAdults() + reservation.getNumberOfChildren());
            long stayDays = reservation.getCheckInDate() != null && reservation.getCheckOutDate() != null
                    ? Math.max(1, ChronoUnit.DAYS.between(
                            reservation.getCheckInDate(), reservation.getCheckOutDate())) : 1;
            int pricedQuantity = switch (catalog.getPricingUnit()) {
                case PER_BOOKING -> 1;
                case PER_PERSON -> people;
                case PER_DAY -> Math.toIntExact(stayDays);
                case PER_VEHICLE, PER_UNIT -> requestedQuantity;
            };
            java.math.BigDecimal unitPrice = extraPricingService.unitPrice(catalog, activityDate);
            UserProductRemise remise = user.getRemises().stream()
                    .filter(r -> r.getProductId().equals(catalog.getExtraId()))
                    .findFirst().orElse(null);
            if (remise != null && remise.getUnitRemise() != null) {
                java.math.BigDecimal discounted = Money.subtract(unitPrice, remise.getUnitRemise());
                unitPrice = discounted.signum() < 0 ? Money.ZERO : discounted;
            }
            unitPrice = Money.divide(unitPrice, currencyConfig.effectiveRate(reservation));

            ReservationExtra extra = ReservationExtra.builder()
                    .catalogExtraId(catalog.getExtraId())
                    .name(catalog.getName())
                    .description(catalog.getDescription())
                    .duration(catalog.getDuration())
                    .quantity(pricedQuantity)
                    .unitPrice(unitPrice)
                    .totalPrice(Money.multiply(unitPrice, pricedQuantity))
                    .activityDate(activityDate)
                    .tva(catalog.getTva())
                    .category(catalog.getCategory())
                    .serviceType(catalog.getServiceType())
                    .pricingUnit(catalog.getPricingUnit())
                    .isActive(true)
                    .build();
            if (catalog.getCategory() == ExtraCategory.ACTIVITY) {
                reservation.addExtra(extra);
                return;
            }

            PickupDetails pickup = PickupDetails.builder()
                    .hotelName(e.getPickupHotelName()).airport(e.getPickupAirport())
                    .flightNumber(e.getPickupFlightNumber()).address(e.getPickupAddress())
                    .arrivalTime(e.getPickupArrivalTime()).instructions(e.getPickupInstructions()).build();
            validatePickup(catalog, pickup);
            extra.setCatalogExtraId(null);
            extra.setSelectedExtraId(catalog.getExtraId());
            extra.setPickupDetails(pickup.isBlank() ? null : pickup);
            reservation.addExtra(extra);

            int days = catalog.getPricingUnit() == PricingUnit.PER_DAY ? pricedQuantity : 1;
            int ownUnits = catalog.getPricingUnit() == PricingUnit.PER_PERSON ? people
                    : catalog.getPricingUnit() == PricingUnit.PER_VEHICLE
                    || catalog.getPricingUnit() == PricingUnit.PER_UNIT ? requestedQuantity : 1;
            int componentMultiplier = catalog.getPricingUnit() == PricingUnit.PER_VEHICLE
                    || catalog.getPricingUnit() == PricingUnit.PER_UNIT ? requestedQuantity : 1;
            for (int day = 0; day < days; day++) {
                LocalDate allocationDate = activityDate.plusDays(day);
                addResourceAllocation(reservation, catalog, catalog, ownUnits, allocationDate);
                for (ExtraResourceRequirement requirement : catalog.getResourceRequirements()) {
                    addResourceAllocation(reservation, catalog, requirement.getResource(),
                            requirement.getQuantity() * componentMultiplier, allocationDate);
                }
            }
        });

        boolean hasTransport = reservation.getExtras().stream()
                .anyMatch(line -> !line.isResourceAllocation() && line.getCategory() == ExtraCategory.TRANSPORT);
        boolean hasCustomerVehicleGuide = requestedExtras.stream()
                .map(ReservationExtraRequest::getExtraId)
                .map(extraRepository::findById)
                .flatMap(java.util.Optional::stream)
                .anyMatch(Extra::isRequiresCustomerVehicle);
        if (hasTransport && hasCustomerVehicleGuide) {
            throw new ReservationValidationException(
                    "A guide in your own vehicle can't be combined with a transport/pickup option.");
        }
    }

    private void addResourceAllocation(Reservation reservation, Extra selected, Extra resource,
                                       int quantity, LocalDate date) {
        reservation.addExtra(ReservationExtra.builder()
                .catalogExtraId(resource.getExtraId()).selectedExtraId(selected.getExtraId())
                .name(resource.getName()).description(resource.getDescription())
                .quantity(quantity).unitPrice(Money.ZERO).totalPrice(Money.ZERO)
                .activityDate(date).tva(Money.ZERO).category(resource.getCategory())
                .pricingUnit(resource.getPricingUnit()).resourceAllocation(true).isActive(true).build());
    }

    private void validatePickup(Extra catalog, PickupDetails pickup) {
        for (PickupField field : catalog.getRequiredPickupFields()) {
            String value = switch (field) {
                case HOTEL_NAME -> pickup.getHotelName();
                case AIRPORT -> pickup.getAirport();
                case FLIGHT_NUMBER -> pickup.getFlightNumber();
                case ADDRESS -> pickup.getAddress();
                case ARRIVAL_TIME -> pickup.getArrivalTime();
                case INSTRUCTIONS -> pickup.getInstructions();
            };
            if (value == null || value.isBlank()) {
                throw new ReservationValidationException(
                        "\"" + catalog.getName() + "\" requires pickup field " + field.name() + ".");
            }
        }
    }

    // ── Creation notification ─────────────────────────────────────────────────────

    private void publishCreationNotification(Reservation savedReservation) {
        notificationPublisher.publish(
                RabbitMQConfig.RESERVATION_CREATED,
                NotificationMessage.builder()
                        .targetRoles(List.of(UserRole.ADMIN))
                        .type(NotificationType.RESERVATION_CREATED)
                        .reservationId(savedReservation.getReservationId())
                        .title("Nouvelle réservation")
                        .message("Le groupe \"" + savedReservation.getGroupName()
                                + "\" a soumis une demande de réservation.")
                        .build()
        );
    }

    // ── Initial payment ───────────────────────────────────────────────────────────

    private void handleInitialPayment(ReservationRequest request, Reservation savedReservation) {
        if (request.getInitialPayment() == null) return;

        Transaction initialTx = paymentService.buildTransaction(savedReservation, request.getInitialPayment());
        transactionRepository.save(initialTx);
        paymentService.publishPaymentReceivedInternal(savedReservation, request.getInitialPayment().getAmount());

        PaymentSummary summary = paymentService.computePaymentSummary(savedReservation);
        if (summary.getPaymentStatus() == PaymentStatus.PAID) {
            paymentService.publishPaymentCompletedInternal(savedReservation);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public ReservationResponse getReservationById(UUID reservationId) {
        Reservation reservation = findById(reservationId);
        // IDOR fix (Phase 4): the endpoint is only isAuthenticated(); without
        // this any logged-in CLIENT could read any reservation by id — full
        // guest PII, dates and price. Staff (ADMIN/CAMPING) see any; a
        // CLIENT/PARTENAIRE sees only their own.
        caller.requireStaffOrOwner(reservation.getUser() != null ? reservation.getUser().getUserId() : null);
        return toEnrichedResponse(reservation);
    }

    // Was an unbounded findAll() - loaded the entire reservation table into
    // memory on every call (ARCHITECTURE.md §13 names this exact line by
    // number). Now paginated the same way its siblings just below
    // (getReservationsByStatus/getActiveReservations) already were - this
    // was the one method in the class still on the old pattern, not a new
    // one introduced here.
    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> getAllReservations(Pageable pageable) {
        return reservationRepository.findAll(pageable)
                .map(this::toEnrichedResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationResponse> getReservationsByUser(UUID userId) {
        return reservationRepository.findByUserUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toEnrichedResponse).toList();
    }

    // Everything except COMPLETED: PENDING, CONFIRMED, CANCELLED, CHECKED_IN, REJECTED
    private static final List<ReservationStatus> NON_COMPLETED_STATUSES = List.of(
            ReservationStatus.PENDING,
            ReservationStatus.CONFIRMED,
            ReservationStatus.CANCELLED,
            ReservationStatus.CHECKED_IN,
            ReservationStatus.REJECTED
    );

    @Override
    @Transactional(readOnly = true)
    public List<ReservationResponse> getNonCompletedReservationsByUser(UUID userId) {
        return reservationRepository.findByUserUserIdAndStatusIn(userId, NON_COMPLETED_STATUSES).stream()
                .map(this::toEnrichedResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> getReservationsByStatus(ReservationStatus status, Pageable pageable) {
        List<Reservation> sorted = reservationRepository.findByStatus(status);
        return paginate(sorted, pageable);
    }

    // Pages an already fetched-and-sorted list in memory rather than pushing LIMIT/OFFSET
    // to the DB, so every existing fetch/filter/sort code path stays byte-for-byte
    // unchanged (some of it — e.g. getActiveReservations()'s Java comparator — has no SQL
    // equivalent that produces identical ordering for null relevant dates). Enrichment
    // (payment summary + transaction lookups) still only runs on the page-sized slice.
    private Page<ReservationResponse> paginate(List<Reservation> filteredAndSorted, Pageable pageable) {
        int total = filteredAndSorted.size();
        int start = (int) pageable.getOffset();
        if (start >= total) {
            return new PageImpl<>(List.of(), pageable, total);
        }
        int end = Math.min(start + pageable.getPageSize(), total);
        List<ReservationResponse> content = filteredAndSorted.subList(start, end).stream()
                .map(this::toEnrichedResponse)
                .toList();
        return new PageImpl<>(content, pageable, total);
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE STATUS
    // ─────────────────────────────────────────────────────────────

    @Override
    public ReservationResponse updateReservationStatus(UUID reservationId, ReservationStatus status,
                                                       String rejectionReason, CompanyType companyType,
                                                       String paymentLink) {
        Reservation reservation = findById(reservationId);

        ReservationStatus current = reservation.getStatus();

        // The reservation lifecycle is defined in one place. This also rejects a
        // no-op X→X (a double-confirm click used to re-run the CONFIRMED side
        // effects and mint a second proforma).
        stateMachine.assertAllowed(current, status);

        boolean isAdminOrCamping = caller.isStaff();

        if (!isAdminOrCamping) {
            // IDOR fix (Phase 4): a non-staff caller may only cancel their OWN
            // reservation. Previously the only checks were "status == CANCELLED"
            // and the 48h window — nothing tied the caller to the reservation,
            // so any CLIENT could cancel anyone's booking by id.
            caller.requireStaffOrOwner(reservation.getUser() != null ? reservation.getUser().getUserId() : null);

            if (status != ReservationStatus.CANCELLED) {
                throw new AccessDeniedException("You are not authorized to set this status. Only cancellation is allowed.");
            }

            // checkInDate is only populated for HEBERGEMENT; TOURS/EXTRAS use serviceDate instead
            LocalDate relevantDate = reservation.getCheckInDate() != null
                    ? reservation.getCheckInDate()
                    : reservation.getServiceDate();

            if (relevantDate != null) {
                LocalDateTime cancellationDeadline = relevantDate.atStartOfDay().minusHours(48);

                if (LocalDateTime.now().isAfter(cancellationDeadline)) {
                    throw new ReservationStatusException(
                            "Cancellation is no longer possible. Reservations must be cancelled " +
                                    "at least 48 hours before the service date (" + relevantDate + ")."
                    );
                }
            }
        }

        reservation.setStatus(status);
        if (status == ReservationStatus.REJECTED) {
            reservation.setRejectionReason(rejectionReason);
        }
        if (status == ReservationStatus.CONFIRMED && paymentLink != null && !paymentLink.isBlank()) {
            reservation.setPaymentLink(paymentLink);
        }
        if (status == ReservationStatus.COMPLETED) {
            reservation.setCompletedAt(LocalDateTime.now());
        }

        boolean wasOccupying = current == ReservationStatus.CONFIRMED || current == ReservationStatus.CHECKED_IN;
        boolean willOccupy   = status  == ReservationStatus.CONFIRMED || status  == ReservationStatus.CHECKED_IN;
        if (willOccupy && !wasOccupying) {
            // Phase 2: re-check accommodation inventory at confirm time — a
            // hold may have expired and another booking taken its unit.
            enforceAccommodationAvailability(reservation, reservationId);
            enforceExtraAvailability(reservation, reservationId);
            reservationCapacityValidator.validate(reservation, reservationId);
        }
        // Confirming clears the hold expiry — a CONFIRMED reservation never expires.
        if (status == ReservationStatus.CONFIRMED) {
            reservation.setHoldExpiresAt(null);
        }

        Reservation savedReservation = reservationRepository.save(reservation);

        // Side effects per transition — see ReservationStateMachine's effect
        // table. Each is idempotent-safe against the state machine's no-op X→X
        // rejection (a double-confirm can no longer re-run onConfirmed).
        switch (status) {
            case CONFIRMED -> onConfirmed(savedReservation, companyType);
            case COMPLETED -> onCompleted(savedReservation, companyType);
            case REJECTED  -> onRejected(savedReservation);
            default -> { }
        }

        return toEnrichedResponse(savedReservation);
    }

    /** CONFIRMED: notify client + CAMPING, auto-generate the PROFORMA, e-mail the payment link if set. */
    private void onConfirmed(Reservation savedReservation, CompanyType companyType) {
            // ── Build confirmation message — include staff if already assigned ──
            boolean hasGuides     = !savedReservation.getGuides().isEmpty();
            boolean hasChauffeurs = !savedReservation.getChauffeurs().isEmpty();

            String confirmMessage;
            if (hasGuides || hasChauffeurs) {
                String guideNames = savedReservation.getGuides().stream()
                        .map(g -> g.getFirstName() + " " + g.getLastName())
                        .collect(Collectors.joining(", "));
                String chauffeurNames = savedReservation.getChauffeurs().stream()
                        .map(c -> c.getFirstName() + " " + c.getLastName())
                        .collect(Collectors.joining(", "));

                StringBuilder sb = new StringBuilder("Votre réservation pour le groupe \"")
                        .append(savedReservation.getGroupName()).append("\" a été confirmée.");
                if (hasGuides)     sb.append(" Guide(s): ").append(guideNames).append(".");
                if (hasChauffeurs) sb.append(" Chauffeur(s): ").append(chauffeurNames).append(".");
                confirmMessage = sb.toString();
            } else {
                confirmMessage = "Votre réservation pour le groupe \""
                        + savedReservation.getGroupName() + "\" a été confirmée.";
            }

            // ── Notify client/partenaire ──────────────────────────────────────
            notificationPublisher.publish(
                    RabbitMQConfig.RESERVATION_CONFIRMED,
                    NotificationMessage.builder()
                            .targetUserId(savedReservation.getUser().getUserId())
                            .type(NotificationType.RESERVATION_CONFIRMED)
                            .reservationId(savedReservation.getReservationId())
                            .title("Réservation confirmée")
                            .message(confirmMessage)
                            .build()
            );

            // ── Notify CAMPING role ───────────────────────────────────────────
            notificationPublisher.publish(
                    RabbitMQConfig.RESERVATION_CONFIRMED,
                    NotificationMessage.builder()
                            .targetRoles(List.of(UserRole.CAMPING))
                            .type(NotificationType.RESERVATION_CONFIRMED)
                            .reservationId(savedReservation.getReservationId())
                            .title("Nouvelle réservation confirmée")
                            .message("Le groupe \"" + savedReservation.getGroupName()
                                    + "\" arrive le " + savedReservation.getCheckInDate())
                            .build()
            );

            // ── Auto-generate PROFORMA invoice (see ReservationInvoiceService / ADR-0004) ──
            Invoice proforma = reservationInvoiceService.generateProforma(savedReservation, companyType);
            java.math.BigDecimal totalTtc = proforma.getTotalTtc();

            // ── Email + WhatsApp the client. No online payment gateway (Click
            // to Pay) is integrated yet, so a confirmation always goes out here
            // — either the payment-link email (admin already provided one) or
            // the plain "accepted, we'll follow up" email. WhatsApp is a stub
            // (see WhatsAppNotificationService) until a real API account
            // exists; it never blocks or fails this flow. ──
            if (savedReservation.getPaymentLink() != null && !savedReservation.getPaymentLink().isBlank()) {
                LocalDate paymentDueDate = savedReservation.getCheckInDate() != null
                        ? savedReservation.getCheckInDate()
                        : savedReservation.getServiceDate();
                java.math.BigDecimal minPaymentAmount = Money.multiply(totalTtc, new java.math.BigDecimal("0.10"));

                emailService.sendReservationConfirmedPaymentEmail(
                        savedReservation.getUser().getEmail(),
                        savedReservation.getUser().getName(),
                        savedReservation.getGroupName(),
                        totalTtc,
                        minPaymentAmount,
                        savedReservation.getCurrency() != null ? savedReservation.getCurrency().name() : "TND",
                        paymentDueDate,
                        savedReservation.getPaymentLink()
                );
            } else {
                emailService.sendReservationAcceptedEmail(
                        savedReservation.getUser().getEmail(),
                        savedReservation.getUser().getName(),
                        savedReservation.getGroupName()
                );
            }

            whatsAppNotificationService.sendReservationAccepted(
                    savedReservation.getUser().getPhone(),
                    savedReservation.getUser().getName(),
                    savedReservation.getGroupName()
            );
    }

    /** COMPLETED: generate the FACTURE if a companyType was given, then notify the client. */
    private void onCompleted(Reservation savedReservation, CompanyType companyType) {
            if (companyType != null) {
                // ── Generate facture (see ReservationInvoiceService / ADR-0004) ──
                reservationInvoiceService.generateFacture(savedReservation, companyType);

                notificationPublisher.publish(
                        RabbitMQConfig.RESERVATION_CONFIRMED,
                        NotificationMessage.builder()
                                .targetUserId(savedReservation.getUser().getUserId())
                                .type(NotificationType.RESERVATION_CONFIRMED)
                                .reservationId(savedReservation.getReservationId())
                                .title("Réservation terminée")
                                .message("Votre réservation pour le groupe \""
                                        + savedReservation.getGroupName()
                                        + "\" est terminée. Votre facture est disponible.")
                                .build()
                );
            } else {
                // ── Completed without generating a facture ────────────────────
                notificationPublisher.publish(
                        RabbitMQConfig.RESERVATION_CONFIRMED,
                        NotificationMessage.builder()
                                .targetUserId(savedReservation.getUser().getUserId())
                                .type(NotificationType.RESERVATION_CONFIRMED)
                                .reservationId(savedReservation.getReservationId())
                                .title("Réservation terminée")
                                .message("Votre réservation pour le groupe \""
                                        + savedReservation.getGroupName()
                                        + "\" est terminée.")
                                .build()
                );
            }
    }

    /** REJECTED: notify the client, with the reason if one was given. */
    private void onRejected(Reservation savedReservation) {
        notificationPublisher.publish(
                RabbitMQConfig.RESERVATION_REJECTED,
                NotificationMessage.builder()
                        .targetUserId(savedReservation.getUser().getUserId())
                        .type(NotificationType.RESERVATION_REJECTED)
                        .title("Réservation rejetée")
                        .reservationId(savedReservation.getReservationId())
                        .message("Votre réservation pour le groupe \""
                                + savedReservation.getGroupName() + "\" a été rejetée."
                                + (savedReservation.getRejectionReason() != null
                                ? " Raison: " + savedReservation.getRejectionReason() : ""))
                        .build()
        );
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE RESERVATION
    // ─────────────────────────────────────────────────────────────

    @Override
    public ReservationResponse updateReservation(UUID reservationId, ReservationUpdateRequest request) {
        Reservation reservation = findById(reservationId);

        // Staff (ADMIN/CAMPING) may edit any reservation; a CLIENT/PARTENAIRE
        // only their own. Same "staff or owner" rule as getReservationById /
        // updateReservationStatus, resolved from the JWT subject.
        caller.requireStaffOrOwner(reservation.getUser() != null ? reservation.getUser().getUserId() : null);

        if (reservation.getStatus() == ReservationStatus.CHECKED_IN  ||
                reservation.getStatus() == ReservationStatus.COMPLETED   ||
                reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new ReservationStatusException("Cannot edit a reservation with status: " + reservation.getStatus());
        }

        if (request.getCheckInDate()      != null) reservation.setCheckInDate(request.getCheckInDate());
        if (request.getCheckOutDate()     != null) reservation.setCheckOutDate(request.getCheckOutDate());
        if (request.getServiceDate()      != null) reservation.setServiceDate(request.getServiceDate());
        if (request.getGroupName()        != null) reservation.setGroupName(request.getGroupName());
        if (request.getGroupLeaderName()  != null) reservation.setGroupLeaderName(request.getGroupLeaderName());
        if (request.getDemandeSpecial()   != null) reservation.setDemandeSpecial(request.getDemandeSpecial());
        if (request.getPreferredLanguageIds() != null) reservation.setPreferredLanguages(resolveLanguages(request.getPreferredLanguageIds()));
        if (request.getOtherLanguageRequested() != null) reservation.setOtherLanguageRequested(request.getOtherLanguageRequested());
        if (request.getPromoCode()        != null) reservation.setPromoCode(request.getPromoCode());
        if (request.getNumberOfAdults()   != null) reservation.setNumberOfAdults(request.getNumberOfAdults());
        if (request.getNumberOfChildren() != null) reservation.setNumberOfChildren(request.getNumberOfChildren());

        if (reservation.getStatus() == ReservationStatus.CONFIRMED ||
                reservation.getStatus() == ReservationStatus.REJECTED) {
            reservation.setStatus(ReservationStatus.PENDING);
            reservation.setRejectionReason(null);
        }

        long nights = ChronoUnit.DAYS.between(reservation.getCheckInDate(), reservation.getCheckOutDate());
        if (nights <= 0) nights = 1;

        boolean isPartner = reservation.getUser().getRole() == UserRole.PARTENAIRE;

        if (request.getTourTypes() != null && !request.getTourTypes().isEmpty()) {
            int globalAdults   = reservation.getNumberOfAdults();
            int globalChildren = reservation.getNumberOfChildren();
            boolean singleTourType = request.getTourTypes().size() == 1;

            if (!singleTourType) {
                for (TourTypeSelectionRequest selection : request.getTourTypes()) {
                    int selAdults   = selection.getNumberOfAdults()   != null ? selection.getNumberOfAdults()   : 0;
                    int selChildren = selection.getNumberOfChildren() != null ? selection.getNumberOfChildren() : 0;

                    if (selAdults > globalAdults) throw new ReservationValidationException(
                            "Tour type adults (" + selAdults + ") cannot exceed group adults (" + globalAdults + ")"
                    );
                    if (selChildren > globalChildren) throw new ReservationValidationException(
                            "Tour type children (" + selChildren + ") cannot exceed group children (" + globalChildren + ")"
                    );
                }

                int totalSelAdults = request.getTourTypes().stream()
                        .mapToInt(t -> t.getNumberOfAdults() != null ? t.getNumberOfAdults() : 0).sum();
                int totalSelChildren = request.getTourTypes().stream()
                        .mapToInt(t -> t.getNumberOfChildren() != null ? t.getNumberOfChildren() : 0).sum();

                if (totalSelAdults < globalAdults) throw new ReservationValidationException(
                        "Total adults across all tour types (" + totalSelAdults + ") cannot be less than group adults (" + globalAdults + ")."
                );
                if (totalSelChildren < globalChildren) throw new ReservationValidationException(
                        "Total children across all tour types (" + totalSelChildren + ") cannot be less than group children (" + globalChildren + ")."
                );
            }

            // Phase 1 regression guard: capture the existing accommodation
            // snapshots before the rebuild wipes them. A historical reservation
            // stays financially stable — editing an unrelated field (or the
            // admin form round-tripping tourTypes) must NOT revert an
            // accommodation-priced line to per-person pricing, and must NOT
            // re-read the current catalogue price. Repricing only happens when
            // the request explicitly carries a new accommodationTypeId.
            Map<UUID, ReservationTourType> priorAccommodation = new LinkedHashMap<>();
            for (ReservationTourType old : reservation.getTourTypes()) {
                if (old.isAccommodationPriced() && old.getCatalogTourTypeId() != null) {
                    priorAccommodation.put(old.getCatalogTourTypeId(), old);
                }
            }

            reservation.getTourTypes().clear();
            reservation.getRepartitions().clear();

            User resUser = reservation.getUser();
            java.math.BigDecimal tourTypeRate = currencyConfig.effectiveRate(reservation);

            for (TourTypeSelectionRequest selection : request.getTourTypes()) {
                TourType tourType = tourTypeRepository.findById(selection.getTourTypeId())
                        .orElseThrow(() -> new ResourceNotFoundException("TourType not found: " + selection.getTourTypeId()));

                int adults   = singleTourType ? globalAdults   : (selection.getNumberOfAdults()   != null ? selection.getNumberOfAdults()   : 0);
                int children = singleTourType ? globalChildren : (selection.getNumberOfChildren() != null ? selection.getNumberOfChildren() : 0);

                java.math.BigDecimal adultPrice = isPartner ? tourType.getPartnerAdultPrice() : tourType.getPassengerAdultPrice();
                java.math.BigDecimal childPrice = isPartner ? tourType.getPartnerChildPrice() : tourType.getPassengerChildPrice();

                UserProductRemise remise = resUser.getRemises().stream()
                        .filter(r -> r.getProductId().equals(tourType.getTourTypeId()))
                        .findFirst().orElse(null);
                if (remise != null) {
                    adultPrice = applyRemise(adultPrice, remise.getAdultRemise());
                    childPrice = applyRemise(childPrice, remise.getChildRemise());
                }

                var snapshotBuilder = ReservationTourType.builder()
                        .catalogTourTypeId(tourType.getTourTypeId())
                        .name(tourType.getName())
                        .description(tourType.getDescription())
                        .duration(tourType.getDuration())
                        .adultPrice(Money.divide(adultPrice, tourTypeRate))
                        .childPrice(Money.divide(childPrice, tourTypeRate))
                        .numberOfAdults(adults)
                        .numberOfChildren(children)
                        .numberOfNights(1)
                        .activityDate(selection.getActivityDate())
                        .tva(tourType.getTva());

                if (selection.getAccommodationTypeId() != null) {
                    // Explicit re-selection in the request → reprice (deliberate).
                    int units = selection.getAccommodationUnits() != null ? selection.getAccommodationUnits() : 1;
                    var priced = accommodationPricingService.resolveById(
                            selection.getAccommodationTypeId(), units, 1, adults + children, selection.getActivityDate());
                    snapshotBuilder.accommodationTypeId(priced.accommodationTypeId())
                            .accommodationName(priced.name())
                            .accommodationUnits(priced.units())
                            .accommodationUnitPriceTtc(priced.snapshotUnitPriceTtc())
                            .accommodationTvaRate(priced.tvaRate());
                } else {
                    // Carry the prior snapshot forward unchanged — no repricing.
                    ReservationTourType prior = priorAccommodation.get(tourType.getTourTypeId());
                    if (prior != null) {
                        snapshotBuilder.accommodationTypeId(prior.getAccommodationTypeId())
                                .accommodationName(prior.getAccommodationName())
                                .accommodationUnits(prior.getAccommodationUnits())
                                .accommodationUnitPriceTtc(prior.getAccommodationUnitPriceTtc())
                                .accommodationTvaRate(prior.getAccommodationTvaRate());
                    }
                }

                ReservationTourType snapshot = snapshotBuilder.build();
                reservation.addTourType(snapshot);

                if (selection.getRepartitions() != null) {
                    for (var r : selection.getRepartitions()) {
                        ReservationRepartition rep = ReservationRepartition.builder()
                                .tenteType(r.getTenteType())
                                .numberOfTentes(r.getNumberOfTentes())
                                .reservationTourType(snapshot)
                                .build();
                        reservation.addRepartition(rep);
                    }
                }
            }
            reservation.setTotalAmount(reservation.calculateTotalTourTypesAmount());
        }

        if (request.getTours() != null && !request.getTours().isEmpty()
                && reservation.getReservationType() == ReservationType.TOURS
                && !reservation.getTours().isEmpty()) {
            TourSelectionRequest tourSelection = request.getTours().get(0);
            ReservationTour existingTour = reservation.getTours().get(0);

            reservation.getRepartitions().removeIf(r -> r.getReservationTourHebergement() != null);
            existingTour.getHebergements().clear();

            if (tourSelection.getHebergements() != null && !tourSelection.getHebergements().isEmpty()) {
                applyTourHebergements(tourSelection.getHebergements(), existingTour, reservation);
            } else {
                reservation.setCheckInDate(null);
                reservation.setCheckOutDate(null);
            }
        }

        if (request.getParticipants() != null) {
            reservation.getParticipants().clear();
            request.getParticipants().forEach(p -> {
                Participant participant = Participant.builder()
                        .fullName(p.getFullName())
                        .age(p.getAge())
                        .isAdult(p.getIsAdult())
                        .build();
                reservation.addParticipant(participant);
            });
        }

        if (request.getExtras() != null) {
            reservation.getExtras().clear();
            applyExtras(request.getExtras(), reservation, reservation.getUser());
            reservation.setTotalExtrasAmount(reservation.calculateTotalExtrasAmount());
        }

        enforceAccommodationAvailability(reservation, reservationId);
        enforceExtraAvailability(reservation, reservationId);
        reservationCapacityValidator.validate(reservation, reservationId);

        Reservation savedReservation = reservationRepository.save(reservation);

        notificationPublisher.publish(
                RabbitMQConfig.RESERVATION_UPDATED,
                NotificationMessage.builder()
                        .targetRoles(List.of(UserRole.ADMIN))
                        .type(NotificationType.RESERVATION_UPDATED)
                        .reservationId(savedReservation.getReservationId())
                        .title("Réservation modifiée")
                        .message("Le groupe \"" + savedReservation.getGroupName()
                                + "\" a modifié sa réservation. En attente de reconfirmation.")
                        .build()
        );

        return toEnrichedResponse(savedReservation);
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────

    @Override
    public void deleteReservation(UUID reservationId) {
        Reservation reservation = findById(reservationId);

        // Soft-delete: the reservation row itself is kept (deletedAt set) so
        // invoices/transactions keep a valid FK and stay in the accounting
        // trail. Every detail row that belongs exclusively to this booking is
        // hard-deleted via orphanRemoval. Repartitions are cleared first since
        // they hold FKs into tourTypes/tours' hebergements.
        reservation.getRepartitions().clear();
        reservation.getTourTypes().clear();
        reservation.getTours().clear();
        reservation.getParticipants().clear();
        reservation.getExtras().clear();
        reservation.getGuides().clear();
        reservation.getChauffeurs().clear();

        reservation.setDeletedAt(LocalDateTime.now());
        reservationRepository.save(reservation);
    }

    // ─────────────────────────────────────────────────────────────
    // MY RESERVATIONS
    // ─────────────────────────────────────────────────────────────

    @Override
    public List<ReservationResponse> getMyReservations(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
        return reservationRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toEnrichedResponse)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // SEARCH & FILTER
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> searchReservationsByName(String name, Pageable pageable) {
        List<Reservation> sorted = reservationRepository.searchByUserName(name);
        return paginate(sorted, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> getActiveReservations(Pageable pageable) {
        LocalDate today = LocalDate.now();

        List<Reservation> sorted = reservationRepository.findAllActive().stream()
                .sorted((a, b) -> {
                    LocalDate dateA = getRelevantDate(a);
                    LocalDate dateB = getRelevantDate(b);

                    boolean aIsPast = dateA != null && dateA.isBefore(today);
                    boolean bIsPast = dateB != null && dateB.isBefore(today);

                    if (aIsPast && !bIsPast) return 1;
                    if (!aIsPast && bIsPast) return -1;

                    if (dateA == null && dateB == null) return 0;
                    if (dateA == null) return 1;
                    if (dateB == null) return -1;

                    return dateA.compareTo(dateB);
                })
                .toList();
        return paginate(sorted, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> getActiveReservationsByDate(LocalDate date, Pageable pageable) {
        LocalDate today = LocalDate.now();

        List<Reservation> sorted = reservationRepository.findAllActive(date).stream()
                .sorted((a, b) -> {
                    LocalDate dateA = getRelevantDate(a);
                    LocalDate dateB = getRelevantDate(b);

                    boolean aIsPast = dateA != null && dateA.isBefore(today);
                    boolean bIsPast = dateB != null && dateB.isBefore(today);

                    if (aIsPast && !bIsPast) return 1;
                    if (!aIsPast && bIsPast) return -1;

                    if (dateA == null && dateB == null) return 0;
                    if (dateA == null) return 1;
                    if (dateB == null) return -1;

                    return dateA.compareTo(dateB);
                })
                .toList();
        return paginate(sorted, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> getReservationsByDate(LocalDate date, Pageable pageable) {
        List<Reservation> sorted = reservationRepository.findAllByDate(date);
        return paginate(sorted, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> getReservationsFiltered(ReservationStatus status, String name, LocalDate date, Pageable pageable) {
        Specification<Reservation> spec = ReservationSpecification.combine(status, name, date);
        Pageable effectivePageable = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt"));
        return reservationRepository.findAll(spec, effectivePageable)
                .map(this::toEnrichedResponse);
    }

    // ─────────────────────────────────────────────────────────────
    // CAMPING VIEWS
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> getCampingActiveReservations(Pageable pageable) {
        LocalDate today      = LocalDate.now();
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);

        List<Reservation> sorted = reservationRepository.findCampingActive(today, cutoff);
        return paginate(sorted, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> getCampingActiveReservationsByDate(LocalDate date, Pageable pageable) {
        List<Reservation> sorted = reservationRepository.findCampingActiveByDate(date);
        return paginate(sorted, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> searchCampingReservationsByName(String name, Pageable pageable) {
        LocalDate today = LocalDate.now();
        List<Reservation> sorted = reservationRepository.findCampingActiveByName(name, today);
        return paginate(sorted, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationResponse> getCampingReservationsByStatus(ReservationStatus status, Pageable pageable) {
        LocalDate today = LocalDate.now();
        List<Reservation> sorted = reservationRepository.findCampingActiveByStatus(status, today);
        return paginate(sorted, pageable);
    }

    // ─────────────────────────────────────────────────────────────
    // STAFF MANAGEMENT
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public ReservationResponse addStaffToReservation(UUID reservationId, ReservationStaffRequest request) {
        Reservation reservation = findById(reservationId);
        validateIsTourReservation(reservation);
        validateStaffManageable(reservation);

        if ((request.getGuides() == null || request.getGuides().isEmpty()) &&
                (request.getChauffeurs() == null || request.getChauffeurs().isEmpty())) {
            throw new ReservationValidationException("At least one guide or chauffeur must be provided");
        }

        if (request.getGuides() != null && !request.getGuides().isEmpty()) {
            request.getGuides().forEach(g -> {
                Guide guide;
                if (g.getGuideProfileId() != null) {
                    GuideProfile profile = guideProfileService.lockActiveEntity(g.getGuideProfileId());
                    if (reservation.getServiceDate() != null && guideRepository
                            .existsByGuideProfile_GuideProfileIdAndReservation_ServiceDateAndReservation_StatusIn(
                                    profile.getGuideProfileId(), reservation.getServiceDate(),
                                    List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN))) {
                        throw new ReservationValidationException(
                                "This guide is already assigned to another trip on " + reservation.getServiceDate());
                    }
                    guide = Guide.builder()
                            .firstName(profile.getFirstName())
                            .lastName(profile.getLastName())
                            .phoneNumber(profile.getPhoneNumber())
                            .languages(new java.util.HashSet<>(profile.getLanguages()))
                            .guideProfile(profile)
                            .build();
                } else {
                    if (g.getFirstName() == null || g.getFirstName().isBlank()
                            || g.getLastName() == null || g.getLastName().isBlank()) {
                        throw new ReservationValidationException(
                                "Select a guide profile or provide the guide's first and last name");
                    }
                    guide = Guide.builder()
                            .firstName(g.getFirstName())
                            .lastName(g.getLastName())
                            .phoneNumber(g.getPhoneNumber())
                            .languages(resolveLanguages(g.getLanguageIds()))
                            .build();
                }
                reservation.addGuide(guide);
            });
        }

        if (request.getChauffeurs() != null && !request.getChauffeurs().isEmpty()) {
            request.getChauffeurs().forEach(c -> {
                Chauffeur chauffeur;
                if (c.getDriverProfileId() != null) {
                    DriverProfile profile = driverProfileService.lockActiveEntity(c.getDriverProfileId());
                    if (reservation.getServiceDate() != null && chauffeurRepository
                            .existsByDriverProfile_DriverProfileIdAndReservation_ServiceDateAndReservation_StatusIn(
                                    profile.getDriverProfileId(), reservation.getServiceDate(),
                                    List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN))) {
                        throw new ReservationValidationException(
                                "This driver is already assigned to another trip on " + reservation.getServiceDate());
                    }
                    chauffeur = Chauffeur.builder()
                            .firstName(profile.getFirstName())
                            .lastName(profile.getLastName())
                            .phoneNumber(profile.getPhoneNumber())
                            .vehicleModel(profile.getVehicleModel())
                            .numberOfSeats(profile.getNumberOfSeats())
                            .driverUser(profile.getUser())
                            .driverProfile(profile)
                            .build();
                } else {
                    if (c.getFirstName() == null || c.getFirstName().isBlank()
                            || c.getLastName() == null || c.getLastName().isBlank()) {
                        throw new ReservationValidationException(
                                "Select a driver profile or provide the driver's first and last name");
                    }
                    chauffeur = Chauffeur.builder()
                            .firstName(c.getFirstName())
                            .lastName(c.getLastName())
                            .phoneNumber(c.getPhoneNumber())
                            .vehicleModel(c.getVehicleModel())
                            .numberOfSeats(c.getNumberOfSeats())
                            .driverUser(resolveDriverUser(c.getDriverUserEmail()))
                            .build();
                }
                reservation.addChauffeur(chauffeur);
            });
        }

        Reservation savedReservation = reservationRepository.save(reservation);

        if (isActiveReservation(savedReservation)) {
            String guideNames = savedReservation.getGuides().stream()
                    .map(g -> g.getFirstName() + " " + g.getLastName())
                    .collect(Collectors.joining(", "));
            String chauffeurNames = savedReservation.getChauffeurs().stream()
                    .map(c -> c.getFirstName() + " " + c.getLastName())
                    .collect(Collectors.joining(", "));

            StringBuilder msg = new StringBuilder("Du personnel a été assigné à votre réservation ")
                    .append(getReservationLabel(savedReservation)).append(".");
            if (!guideNames.isEmpty())     msg.append(" Guide(s): ").append(guideNames).append(".");
            if (!chauffeurNames.isEmpty()) msg.append(" Chauffeur(s): ").append(chauffeurNames).append(".");

            notificationPublisher.publish(
                    RabbitMQConfig.STAFF_ASSIGNED,
                    NotificationMessage.builder()
                            .targetUserId(savedReservation.getUser().getUserId())
                            .type(NotificationType.STAFF_ASSIGNED)
                            .reservationId(savedReservation.getReservationId())
                            .title("Personnel assigné")
                            .message(msg.toString())
                            .build()
            );
        }

        return toEnrichedResponse(savedReservation);
    }

    @Override
    @Transactional
    public ReservationResponse updateGuide(UUID reservationId, UUID guideId, GuideUpdateRequest request) {
        Reservation reservation = findById(reservationId);
        validateIsTourReservation(reservation);
        validateStaffManageable(reservation);

        Guide guide = reservation.getGuides().stream()
                .filter(g -> g.getGuideId().equals(guideId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException(
                        "Guide not found: " + guideId + " in reservation: " + reservationId));

        if (request.getFirstName()   != null) guide.setFirstName(request.getFirstName());
        if (request.getLastName()    != null) guide.setLastName(request.getLastName());
        if (request.getPhoneNumber() != null) guide.setPhoneNumber(request.getPhoneNumber());
        if (request.getLanguageIds()   != null) guide.setLanguages(resolveLanguages(request.getLanguageIds()));

        Reservation savedReservation = reservationRepository.save(reservation);

        if (isActiveReservation(savedReservation)) {
            notificationPublisher.publish(
                    RabbitMQConfig.STAFF_UPDATED,
                    NotificationMessage.builder()
                            .targetUserId(savedReservation.getUser().getUserId())
                            .type(NotificationType.STAFF_UPDATED)
                            .reservationId(savedReservation.getReservationId())
                            .title("Personnel modifié")
                            .message("Le guide de votre réservation "
                                    + getReservationLabel(savedReservation) + " a été mis à jour.")
                            .build()
            );
        }

        return toEnrichedResponse(savedReservation);
    }

    @Override
    @Transactional
    public String deleteGuide(UUID reservationId, UUID guideId) {
        Reservation reservation = findById(reservationId);
        validateIsTourReservation(reservation);
        validateStaffManageable(reservation);

        Guide guide = reservation.getGuides().stream()
                .filter(g -> g.getGuideId().equals(guideId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException(
                        "Guide not found: " + guideId + " in reservation: " + reservationId));

        String guideName = guide.getFirstName() + " " + guide.getLastName();
        reservation.removeGuide(guide);
        Reservation savedReservation = reservationRepository.save(reservation);

        if (isActiveReservation(savedReservation)) {
            notificationPublisher.publish(
                    RabbitMQConfig.STAFF_UPDATED,
                    NotificationMessage.builder()
                            .targetUserId(savedReservation.getUser().getUserId())
                            .type(NotificationType.STAFF_UPDATED)
                            .reservationId(savedReservation.getReservationId())
                            .title("Personnel modifié")
                            .message("Le guide " + guideName + " a été retiré de votre réservation "
                                    + getReservationLabel(savedReservation) + ".")
                            .build()
            );
        }

        return "Guide deleted successfully";
    }

    @Override
    @Transactional
    public ReservationResponse updateChauffeur(UUID reservationId, UUID chauffeurId, ChauffeurUpdateRequest request) {
        Reservation reservation = findById(reservationId);
        validateIsTourReservation(reservation);
        validateStaffManageable(reservation);

        Chauffeur chauffeur = reservation.getChauffeurs().stream()
                .filter(c -> c.getChauffeurId().equals(chauffeurId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException(
                        "Chauffeur not found: " + chauffeurId + " in reservation: " + reservationId));

        if (request.getFirstName()    != null) chauffeur.setFirstName(request.getFirstName());
        if (request.getLastName()     != null) chauffeur.setLastName(request.getLastName());
        if (request.getPhoneNumber()  != null) chauffeur.setPhoneNumber(request.getPhoneNumber());
        if (request.getVehicleModel() != null) chauffeur.setVehicleModel(request.getVehicleModel());
        if (request.getNumberOfSeats() != null) chauffeur.setNumberOfSeats(request.getNumberOfSeats());
        // null = leave the link as-is, "" = unlink, anything else = relink.
        if (request.getDriverUserEmail() != null) {
            chauffeur.setDriverUser(
                    request.getDriverUserEmail().isBlank() ? null : resolveDriverUser(request.getDriverUserEmail()));
        }

        Reservation savedReservation = reservationRepository.save(reservation);

        if (isActiveReservation(savedReservation)) {
            notificationPublisher.publish(
                    RabbitMQConfig.STAFF_UPDATED,
                    NotificationMessage.builder()
                            .targetUserId(savedReservation.getUser().getUserId())
                            .type(NotificationType.STAFF_UPDATED)
                            .reservationId(savedReservation.getReservationId())
                            .title("Personnel modifié")
                            .message("Le chauffeur de votre réservation "
                                    + getReservationLabel(savedReservation) + " a été mis à jour.")
                            .build()
            );
        }

        return toEnrichedResponse(savedReservation);
    }

    // null/blank -> no account linked (the common case - a chauffeur
    // assignment is just a name/phone snapshot). A non-blank value must
    // resolve to a real user, so a typo doesn't silently link nobody.
    private User resolveDriverUser(String email) {
        if (email == null || email.isBlank()) return null;
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Driver account not found: " + email));
        if (user.getRole() != UserRole.CHAUFFEUR) {
            throw new ReservationValidationException("The linked account must have the CHAUFFEUR role");
        }
        return user;
    }

    @Override
    @Transactional
    public String deleteChauffeur(UUID reservationId, UUID chauffeurId) {
        Reservation reservation = findById(reservationId);
        validateIsTourReservation(reservation);
        validateStaffManageable(reservation);

        Chauffeur chauffeur = reservation.getChauffeurs().stream()
                .filter(c -> c.getChauffeurId().equals(chauffeurId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException(
                        "Chauffeur not found: " + chauffeurId + " in reservation: " + reservationId));

        String chauffeurName = chauffeur.getFirstName() + " " + chauffeur.getLastName();
        reservation.removeChauffeur(chauffeur);
        Reservation savedReservation = reservationRepository.save(reservation);

        if (isActiveReservation(savedReservation)) {
            notificationPublisher.publish(
                    RabbitMQConfig.STAFF_UPDATED,
                    NotificationMessage.builder()
                            .targetUserId(savedReservation.getUser().getUserId())
                            .type(NotificationType.STAFF_UPDATED)
                            .reservationId(savedReservation.getReservationId())
                            .title("Personnel modifié")
                            .message("Le chauffeur " + chauffeurName + " a été retiré de votre réservation "
                                    + getReservationLabel(savedReservation) + ".")
                            .build()
            );
        }

        return "Chauffeur deleted successfully";
    }

    // ─────────────────────────────────────────────────────────────
    // GENERATE FACTURE LATER
    //
    // TODO(company-scoping, blocked on docs/OPEN-QUESTIONS.md Q1/Q2/Q4):
    // `companyType` below is a free parameter the caller (an ADMIN) types
    // in - nothing validates it against what the reservation actually
    // contains, because TourType/Tour/Extra carry no company field to check
    // it against (see docs/data-sharing-inventory.md §5, confirmed live
    // 30 Aug 2026: zero real invoices exist yet, so this is a dormant risk,
    // not an active one). Harmless today because only Dunes products are
    // bookable at all. Becomes a real audit-integrity gap the moment Route
    // Insolite reservations exist - at that point this needs to derive
    // companyType from the reservation's own line items (once they carry
    // one) and reject a mismatch, not trust the caller. Do not "fix" this
    // by guessing a company-scoping design now - it is a business/legal
    // decision (Q1, Q2, Q4), not a code default.
    // ─────────────────────────────────────────────────────────────

    @Override
    public InvoiceResponse generateFactureLater(UUID reservationId, CompanyType companyType) {
        Reservation reservation = findById(reservationId);

        // Phase 4 — fail closed instead of trusting the caller's companyType.
        // A reservation carries no company today (business-blocked on
        // OPEN-QUESTIONS Q1/Q2/Q4 — see docs/adr/0002-company-scoping.md), and
        // only Dunes Insolites products are bookable. So: an absent value
        // resolves to DUNES_INSOLITES, and an explicit ROUTE_INSOLITE is
        // rejected — nobody can mint a Route Insolite invoice until the
        // ownership model exists and can be checked against the line items.
        if (companyType == null) {
            companyType = CompanyType.DUNES_INSOLITES;
        } else if (companyType != CompanyType.DUNES_INSOLITES) {
            throw new AccessDeniedException(
                    "Invoices can only be issued for DUNES_INSOLITES until company scoping is in place.");
        }

        // Extraction (ADR-0004): the facture build/persist now lives in
        // ReservationInvoiceService, which returns the row it just created — so
        // the response is that facture deterministically, not "the last invoice
        // getInvoicesByReservation happens to return" (which was order-undefined
        // once a proforma already existed — the reason this method used to be
        // able to echo back the proforma).
        Invoice facture = reservationInvoiceService.generateFacture(reservation, companyType);
        return invoiceService.getInvoiceById(facture.getInvoiceId());
    }

    // ─────────────────────────────────────────────────────────────
    // CURRENCY RECALCULATION
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public ReservationResponse recalculateCurrency(UUID reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));

        switch (reservation.getReservationType()) {
            case HEBERGEMENT -> reservation.setTotalAmount(reservation.calculateTotalTourTypesAmount());
            case TOURS       -> reservation.setTotalAmount(reservation.calculateTotalToursAmount());
            case EXTRAS      -> { /* no main amount for pure-extras reservations */ }
        }
        reservation.setTotalExtrasAmount(reservation.calculateTotalExtrasAmount());

        reservationRepository.saveAndFlush(reservation);
        entityManager.detach(reservation);
        return toEnrichedResponse(findById(reservationId));
    }

    // ─────────────────────────────────────────────────────────────
    // CAMPING STATS
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CampingStatsResponse getCampingStats() {
        LocalDate today = LocalDate.now();

        List<Reservation> inCamp = reservationRepository.findCampingCheckedIn();
        int inCampAdults   = inCamp.stream().mapToInt(r -> r.getNumberOfAdults()   != null ? r.getNumberOfAdults()   : 0).sum();
        int inCampChildren = inCamp.stream().mapToInt(r -> r.getNumberOfChildren() != null ? r.getNumberOfChildren() : 0).sum();

        List<Reservation> arriving = reservationRepository.findCampingArrivingToday(today);
        int arrivingAdults   = arriving.stream().mapToInt(r -> r.getNumberOfAdults()   != null ? r.getNumberOfAdults()   : 0).sum();
        int arrivingChildren = arriving.stream().mapToInt(r -> r.getNumberOfChildren() != null ? r.getNumberOfChildren() : 0).sum();

        return CampingStatsResponse.builder()
                .inCampAdults(inCampAdults)
                .inCampChildren(inCampChildren)
                .inCampTotal(inCampAdults + inCampChildren)
                .arrivingTodayAdults(arrivingAdults)
                .arrivingTodayChildren(arrivingChildren)
                .arrivingTodayTotal(arrivingAdults + arrivingChildren)
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────

    private Reservation findById(UUID reservationId) {
        return reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));
    }

    private ReservationResponse toEnrichedResponse(Reservation reservation) {
        ReservationResponse response = reservationMapper.toResponse(reservation);
        PaymentSummary summary = paymentService.computePaymentSummary(reservation);
        response.setPaymentSummary(summary);
        response.setTotalAmount(summary.getOriginalMainAmount());
        response.setTotalExtrasAmount(summary.getOriginalExtrasAmount());
        List<TransactionResponse> txHistory = transactionRepository
                .findByReservationReservationId(reservation.getReservationId())
                .stream()
                .sorted(Comparator.comparing(Transaction::getTransactionDate))
                .map(transactionMapper::toResponse)
                .toList();
        response.setTransactions(txHistory);

        List<Invoice> factures = invoiceRepository.findByInvoiceTypeAndReservationReservationId(
                InvoiceType.STANDARD, reservation.getReservationId());
        boolean hasFacture = !factures.isEmpty();
        response.setHasFacture(hasFacture);
        if (hasFacture) {
            response.setFactureDate(factures.get(0).getInvoiceDate());
        }

        return response;
    }

    private LocalDate getRelevantDate(Reservation reservation) {
        return switch (reservation.getReservationType()) {
            case HEBERGEMENT -> reservation.getCheckInDate();
            case EXTRAS      -> reservation.getServiceDate();
            case TOURS       -> reservation.getServiceDate();
        };
    }

    // Both below are state-conflict business rules, not defects - same
    // shape as the "Cannot edit" guard above, so they get the same
    // ReservationStatusException (422) instead of a bare IllegalStateException
    // that only ever got 400 via the deprecated blanket RuntimeException
    // handler (see GlobalExceptionHandler's own comment on that handler).
    private void validateIsTourReservation(Reservation reservation) {
        if (reservation.getReservationType() != ReservationType.TOURS) {
            throw new ReservationStatusException(
                    "Staff (guides and chauffeurs) can only be managed on TOURS reservations. " +
                            "Current type: " + reservation.getReservationType());
        }
    }

    private void validateStaffManageable(Reservation reservation) {
        ReservationStatus status = reservation.getStatus();
        if (status == ReservationStatus.CANCELLED ||
                status == ReservationStatus.REJECTED  ||
                status == ReservationStatus.COMPLETED) {
            throw new ReservationStatusException(
                    "Le personnel ne peut pas être modifié pour une réservation "
                            + status.name().toLowerCase() + ".");
        }
    }

    private boolean isActiveReservation(Reservation reservation) {
        return reservation.getStatus() == ReservationStatus.CONFIRMED
                || reservation.getStatus() == ReservationStatus.CHECKED_IN;
    }

    private String getReservationLabel(Reservation reservation) {
        return reservation.getGroupName() != null
                ? "\"" + reservation.getGroupName() + "\""
                : "#" + reservation.getReservationId().toString().substring(0, 8).toUpperCase();
    }

    // Converts every price field so the DB always holds values in the target currency.
    // Called once at reservation creation when initial payment currency != TND.
    private void applyReservationCurrencyConversion(Reservation reservation, Currency targetCurrency) {
        if (targetCurrency == Currency.TND) {
            reservation.setCurrency(Currency.TND);
            return;
        }
        java.math.BigDecimal rate = currencyConfig.rateFor(targetCurrency);
        reservation.setExchangeRateApplied(rate);

        reservation.setTotalAmount(Money.divide(reservation.getTotalAmount(), rate));
        reservation.setTotalExtrasAmount(Money.divide(reservation.getTotalExtrasAmount(), rate));

        reservation.getTourTypes().forEach(tt -> {
            tt.setAdultPrice(Money.divide(tt.getAdultPrice(), rate));
            tt.setChildPrice(Money.divide(tt.getChildPrice(), rate));
        });
        reservation.getTours().forEach(tour -> {
            tour.setAdultPrice(Money.divide(tour.getAdultPrice(), rate));
            tour.setChildPrice(Money.divide(tour.getChildPrice(), rate));
            tour.setTotalPrice(Money.divide(tour.getTotalPrice(), rate));
        });
        reservation.getExtras().forEach(extra -> {
            extra.setUnitPrice(Money.divide(extra.getUnitPrice(), rate));
            extra.setTotalPrice(Money.divide(extra.getTotalPrice(), rate));
        });

        reservation.setCurrency(targetCurrency);
    }

    /** Catalogue price minus a discount, floored at zero. Null discount → price unchanged. */
    private static java.math.BigDecimal applyRemise(java.math.BigDecimal price, java.math.BigDecimal remise) {
        if (remise == null) return Money.round(price);
        java.math.BigDecimal r = Money.subtract(price, remise);
        return r.signum() < 0 ? Money.ZERO : r;
    }

}
