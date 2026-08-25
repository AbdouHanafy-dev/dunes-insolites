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
import com.camping.duneinsolite.mapper.ReservationMapper;
import com.camping.duneinsolite.mapper.TransactionMapper;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.model.DocumentSequence;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.repository.specification.ReservationSpecification;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
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
    private final DocumentSequenceRepository  documentSequenceRepository;
    private final ReservationCapacityValidator reservationCapacityValidator;
    private final CurrencyConfig              currencyConfig;
    private final EmailService                emailService;

    @PersistenceContext
    private EntityManager entityManager;

    // ─────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────

    @Override
    public ReservationResponse createReservation(ReservationRequest request) {

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found: " + request.getUserId()));

        Source source = sourceRepository.findById(request.getSourceId())
                .orElseThrow(() -> new RuntimeException("Source not found: " + request.getSourceId()));

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
            throw new RuntimeException("Check-in and check-out dates are required for HEBERGEMENT reservations");
        }
        if (request.getTourTypes() == null || request.getTourTypes().isEmpty()) {
            throw new RuntimeException("At least one tour type is required for HEBERGEMENT reservations");
        }
    }

    private void validateTours(ReservationRequest request) {
        if (request.getTours() == null || request.getTours().isEmpty()) {
            throw new RuntimeException("A tour selection is required for TOURS reservations");
        }
        if (request.getTours().size() > 1) {
            throw new RuntimeException("Only one tour can be selected per reservation");
        }
        if (request.getServiceDate() == null) {
            throw new RuntimeException("Departure date (serviceDate) is required for TOURS reservations");
        }
    }

    private void validateExtras(ReservationRequest request) {
        if (request.getExtras() == null || request.getExtras().isEmpty()) {
            throw new RuntimeException("At least one extra is required for EXTRAS reservations");
        }
        if (request.getServiceDate() == null) {
            throw new RuntimeException("Service date is required for EXTRAS reservations");
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
                .numberOfAdults(globalAdults)
                .numberOfChildren(globalChildren)
                .currency(Currency.TND)
                .promoCode(request.getPromoCode())
                .status(ReservationStatus.PENDING)
                .build();
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

        reservation.setTotalExtrasAmount(reservation.calculateTotalExtrasAmount());
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
                throw new RuntimeException(
                        "Tour type adults (" + selAdults + ") cannot exceed group adults (" + globalAdults + ")");
            }
            if (selChildren > globalChildren) {
                throw new RuntimeException(
                        "Tour type children (" + selChildren + ") cannot exceed group children (" + globalChildren + ")");
            }
        }

        int totalSelAdults = request.getTourTypes().stream()
                .mapToInt(t -> t.getNumberOfAdults() != null ? t.getNumberOfAdults() : 0).sum();
        int totalSelChildren = request.getTourTypes().stream()
                .mapToInt(t -> t.getNumberOfChildren() != null ? t.getNumberOfChildren() : 0).sum();

        if (totalSelAdults < globalAdults) {
            throw new RuntimeException(
                    "Total adults across all tour types (" + totalSelAdults + ") " +
                            "cannot be less than group adults (" + globalAdults + "). " +
                            "Every person must be assigned to at least one tour type.");
        }
        if (totalSelChildren < globalChildren) {
            throw new RuntimeException(
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
                .orElseThrow(() -> new RuntimeException("TourType not found: " + selection.getTourTypeId()));

        int adults   = singleTourType ? globalAdults   : (selection.getNumberOfAdults()   != null ? selection.getNumberOfAdults()   : 0);
        int children = singleTourType ? globalChildren : (selection.getNumberOfChildren() != null ? selection.getNumberOfChildren() : 0);

        double adultPrice = isPartner ? tourType.getPartnerAdultPrice() : tourType.getPassengerAdultPrice();
        double childPrice = isPartner ? tourType.getPartnerChildPrice() : tourType.getPassengerChildPrice();

        UserProductRemise remise = user.getRemises().stream()
                .filter(r -> r.getProductId().equals(tourType.getTourTypeId()))
                .findFirst().orElse(null);
        if (remise != null) {
            if (remise.getAdultRemise() != null) adultPrice = Math.max(0, adultPrice - remise.getAdultRemise());
            if (remise.getChildRemise() != null) childPrice = Math.max(0, childPrice - remise.getChildRemise());
        }

        return ReservationTourType.builder()
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
                .tva(tourType.getTva())
                .build();
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
                    .orElseThrow(() -> new RuntimeException("TourType not found: " + h.getTourTypeId()));
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
                .orElseThrow(() -> new RuntimeException("Tour not found: " + selection.getTourId()));

        double adultPrice = isPartner ? tour.getPartnerAdultPrice() : tour.getPassengerAdultPrice();
        double childPrice = isPartner ? tour.getPartnerChildPrice() : tour.getPassengerChildPrice();
        double totalPrice = (globalAdults * adultPrice) + (globalChildren * childPrice);

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
        if (request.getExtras() == null) return;

        request.getExtras().forEach(e -> {
            Extra catalog = extraRepository.findById(e.getExtraId())
                    .orElseThrow(() -> new RuntimeException("Extra not found: " + e.getExtraId()));

            double unitPrice = catalog.getUnitPrice();
            UserProductRemise remise = user.getRemises().stream()
                    .filter(r -> r.getProductId().equals(catalog.getExtraId()))
                    .findFirst().orElse(null);
            if (remise != null && remise.getUnitRemise() != null) {
                unitPrice = Math.max(0, unitPrice - remise.getUnitRemise());
            }

            ReservationExtra extra = ReservationExtra.builder()
                    .catalogExtraId(catalog.getExtraId())
                    .name(catalog.getName())
                    .description(catalog.getDescription())
                    .duration(catalog.getDuration())
                    .quantity(e.getQuantity())
                    .unitPrice(unitPrice)
                    .totalPrice(r2(unitPrice * e.getQuantity()))
                    .activityDate(e.getActivityDate())
                    .tva(catalog.getTva())
                    .isActive(true)
                    .build();
            reservation.addExtra(extra);
        });
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
        return toEnrichedResponse(findById(reservationId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationResponse> getAllReservations() {
        return reservationRepository.findAll().stream()
                .map(this::toEnrichedResponse)
                .toList();
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

        if (current == ReservationStatus.COMPLETED) {
            throw new ReservationStatusException("This reservation is already completed and cannot be modified.");
        }
        if (current == ReservationStatus.CANCELLED) {
            throw new ReservationStatusException("This reservation has already been cancelled and cannot be modified.");
        }
        if (current == ReservationStatus.CHECKED_IN && status != ReservationStatus.COMPLETED) {
            throw new ReservationStatusException("A checked-in reservation can only be marked as completed.");
        }
        if (current == ReservationStatus.REJECTED) {
            throw new ReservationStatusException("This reservation has been rejected and cannot be modified.");
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdminOrCamping = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_CAMPING"));

        if (!isAdminOrCamping) {
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
            reservationCapacityValidator.validate(reservation, reservationId);
        }

        Reservation savedReservation = reservationRepository.save(reservation);

        if (status == ReservationStatus.CONFIRMED) {

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

            // ── Auto-generate PROFORMA invoice ────────────────────────────────
            double proformaTotal =
                    (savedReservation.getTotalAmount()       != null ? savedReservation.getTotalAmount()       : 0.0)
                  + (savedReservation.getTotalExtrasAmount() != null ? savedReservation.getTotalExtrasAmount() : 0.0);

            PaymentSummary alreadyPaid = paymentService.computePaymentSummary(savedReservation);
            double paidSoFar = alreadyPaid.getTotalPaid();

            PaymentStatus proformaPaymentStatus;
            if (paidSoFar <= 0) {
                proformaPaymentStatus = PaymentStatus.UNPAID;
            } else if (paidSoFar < proformaTotal) {
                proformaPaymentStatus = PaymentStatus.PARTIALLY_PAID;
            } else {
                proformaPaymentStatus = PaymentStatus.PAID;
            }

// ── Auto-generate PROFORMA invoice ────────────────────────────────
            Invoice proforma = Invoice.builder()
                    .invoiceNumber(generateProformaNumber())
                    .invoiceType(InvoiceType.PROFORMA)
                    .invoiceDate(LocalDate.now())
                    .paidAmount(paidSoFar)
                    .status(InvoiceStatus.DRAFT)
                    .paymentStatus(proformaPaymentStatus)
                    .currency(savedReservation.getCurrency())
                    .reservation(savedReservation)
                    .user(savedReservation.getUser())
                    .companyType(companyType)
                    .build();

            double[] tvaBreakdown = populateInvoiceItems(savedReservation, proforma);  // ← ONLY call
            double totalHt  = tvaBreakdown[0];
            double totalTva = tvaBreakdown[1];
            double totalTtc = r2(totalHt + totalTva);

            proforma.setTotalHt(totalHt);
            proforma.setTvaRate(0.0);
            proforma.setTvaAmount(totalTva);
            proforma.setTotalTtc(totalTtc);
            proforma.setTotalAmount(totalTtc);

            invoiceRepository.save(proforma);

            // ── Email the client: only when the admin actually provided a payment link ──
            if (savedReservation.getPaymentLink() != null && !savedReservation.getPaymentLink().isBlank()) {
                LocalDate paymentDueDate = savedReservation.getCheckInDate() != null
                        ? savedReservation.getCheckInDate()
                        : savedReservation.getServiceDate();
                double minPaymentAmount = r2(totalTtc * 0.10);

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
            }
        }

        if (status == ReservationStatus.COMPLETED) {

            if (companyType != null) {
                // ── Generate facture ──────────────────────────────────────────
                double rawTotal =
                        (savedReservation.getTotalAmount()       != null ? savedReservation.getTotalAmount()       : 0.0)
                      + (savedReservation.getTotalExtrasAmount() != null ? savedReservation.getTotalExtrasAmount() : 0.0);

                Currency currency   = savedReservation.getCurrency() != null ? savedReservation.getCurrency() : Currency.TND;
                double timbreFiscal = getTimbreFiscal(savedReservation);
                LocalDate completedDate = savedReservation.getCompletedAt().toLocalDate();

                Invoice facture = Invoice.builder()
                        .invoiceNumber(generateFactureNumber())
                        .invoiceType(InvoiceType.STANDARD)
                        .invoiceDate(completedDate)
                        .totalAmount(rawTotal)
                        .timbreFiscal(timbreFiscal)
                        .status(InvoiceStatus.DRAFT)
                        .currency(currency)
                        .reservation(savedReservation)
                        .user(savedReservation.getUser())
                        .companyType(companyType)
                        .build();

                double[] tvaBreakdown = populateInvoiceItems(savedReservation, facture);
                double totalHt  = tvaBreakdown[0];
                double totalTva = tvaBreakdown[1];
                double totalTtc = r2(totalHt + totalTva + timbreFiscal);
                facture.setTotalHt(totalHt);
                facture.setTvaRate(0.0);
                facture.setTvaAmount(totalTva);
                facture.setTotalTtc(totalTtc);

                PaymentSummary paid = paymentService.computePaymentSummary(savedReservation);
                double paidSoFar    = paid.getTotalPaid();
                PaymentStatus facturePaymentStatus;
                if (paidSoFar <= 0)            facturePaymentStatus = PaymentStatus.UNPAID;
                else if (paidSoFar < totalTtc) facturePaymentStatus = PaymentStatus.PARTIALLY_PAID;
                else                           facturePaymentStatus = PaymentStatus.PAID;
                facture.setPaymentStatus(facturePaymentStatus);
                facture.setPaidAmount(paidSoFar);

                invoiceRepository.save(facture);

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

        if (status == ReservationStatus.REJECTED) {
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

        return toEnrichedResponse(savedReservation);
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE RESERVATION
    // ─────────────────────────────────────────────────────────────

    @Override
    public ReservationResponse updateReservation(UUID reservationId, ReservationUpdateRequest request) {
        Reservation reservation = findById(reservationId);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin) {
            Jwt jwt = (Jwt) auth.getPrincipal();
            String email = jwt.getClaim("email");
            User authenticatedUser = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
            if (!reservation.getUser().getUserId().equals(authenticatedUser.getUserId())) {
                throw new AccessDeniedException("You can only edit your own reservations.");
            }
        }

        if (reservation.getStatus() == ReservationStatus.CHECKED_IN  ||
                reservation.getStatus() == ReservationStatus.COMPLETED   ||
                reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalStateException("Cannot edit a reservation with status: " + reservation.getStatus());
        }

        if (request.getCheckInDate()      != null) reservation.setCheckInDate(request.getCheckInDate());
        if (request.getCheckOutDate()     != null) reservation.setCheckOutDate(request.getCheckOutDate());
        if (request.getServiceDate()      != null) reservation.setServiceDate(request.getServiceDate());
        if (request.getGroupName()        != null) reservation.setGroupName(request.getGroupName());
        if (request.getGroupLeaderName()  != null) reservation.setGroupLeaderName(request.getGroupLeaderName());
        if (request.getDemandeSpecial()   != null) reservation.setDemandeSpecial(request.getDemandeSpecial());
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

                    if (selAdults > globalAdults) throw new RuntimeException(
                            "Tour type adults (" + selAdults + ") cannot exceed group adults (" + globalAdults + ")"
                    );
                    if (selChildren > globalChildren) throw new RuntimeException(
                            "Tour type children (" + selChildren + ") cannot exceed group children (" + globalChildren + ")"
                    );
                }

                int totalSelAdults = request.getTourTypes().stream()
                        .mapToInt(t -> t.getNumberOfAdults() != null ? t.getNumberOfAdults() : 0).sum();
                int totalSelChildren = request.getTourTypes().stream()
                        .mapToInt(t -> t.getNumberOfChildren() != null ? t.getNumberOfChildren() : 0).sum();

                if (totalSelAdults < globalAdults) throw new RuntimeException(
                        "Total adults across all tour types (" + totalSelAdults + ") cannot be less than group adults (" + globalAdults + ")."
                );
                if (totalSelChildren < globalChildren) throw new RuntimeException(
                        "Total children across all tour types (" + totalSelChildren + ") cannot be less than group children (" + globalChildren + ")."
                );
            }

            reservation.getTourTypes().clear();
            reservation.getRepartitions().clear();

            User resUser = reservation.getUser();
            double tourTypeRate = currencyConfig.effectiveRate(reservation);

            for (TourTypeSelectionRequest selection : request.getTourTypes()) {
                TourType tourType = tourTypeRepository.findById(selection.getTourTypeId())
                        .orElseThrow(() -> new RuntimeException("TourType not found: " + selection.getTourTypeId()));

                int adults   = singleTourType ? globalAdults   : (selection.getNumberOfAdults()   != null ? selection.getNumberOfAdults()   : 0);
                int children = singleTourType ? globalChildren : (selection.getNumberOfChildren() != null ? selection.getNumberOfChildren() : 0);

                double adultPrice = isPartner ? tourType.getPartnerAdultPrice() : tourType.getPassengerAdultPrice();
                double childPrice = isPartner ? tourType.getPartnerChildPrice() : tourType.getPassengerChildPrice();

                UserProductRemise remise = resUser.getRemises().stream()
                        .filter(r -> r.getProductId().equals(tourType.getTourTypeId()))
                        .findFirst().orElse(null);
                if (remise != null) {
                    if (remise.getAdultRemise() != null) adultPrice = Math.max(0, adultPrice - remise.getAdultRemise());
                    if (remise.getChildRemise() != null) childPrice = Math.max(0, childPrice - remise.getChildRemise());
                }

                ReservationTourType snapshot = ReservationTourType.builder()
                        .catalogTourTypeId(tourType.getTourTypeId())
                        .name(tourType.getName())
                        .description(tourType.getDescription())
                        .duration(tourType.getDuration())
                        .adultPrice(r2(adultPrice / tourTypeRate))
                        .childPrice(r2(childPrice / tourTypeRate))
                        .numberOfAdults(adults)
                        .numberOfChildren(children)
                        .numberOfNights(1)
                        .activityDate(selection.getActivityDate())
                        .tva(tourType.getTva())
                        .build();

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
            double extraRate = currencyConfig.effectiveRate(reservation);

            User updateUser = reservation.getUser();
            reservation.getExtras().clear();
            request.getExtras().forEach(e -> {
                Extra catalog = extraRepository.findById(e.getExtraId())
                        .orElseThrow(() -> new RuntimeException("Extra not found: " + e.getExtraId()));

                double unitPrice = r2(catalog.getUnitPrice() / extraRate);
                UserProductRemise remise = updateUser.getRemises().stream()
                        .filter(r -> r.getProductId().equals(catalog.getExtraId()))
                        .findFirst().orElse(null);
                if (remise != null && remise.getUnitRemise() != null) {
                    unitPrice = Math.max(0, r2(unitPrice - remise.getUnitRemise() / extraRate));
                }
                double totalPrice = r2(unitPrice * e.getQuantity());

                ReservationExtra extra = ReservationExtra.builder()
                        .catalogExtraId(catalog.getExtraId())
                        .name(catalog.getName())
                        .description(catalog.getDescription())
                        .duration(catalog.getDuration())
                        .quantity(e.getQuantity())
                        .unitPrice(unitPrice)
                        .totalPrice(totalPrice)
                        .activityDate(e.getActivityDate())
                        .tva(catalog.getTva())
                        .isActive(true)
                        .build();
                reservation.addExtra(extra);
            });
            reservation.setTotalExtrasAmount(reservation.calculateTotalExtrasAmount());
        }

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
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
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
            throw new RuntimeException("At least one guide or chauffeur must be provided");
        }

        if (request.getGuides() != null && !request.getGuides().isEmpty()) {
            request.getGuides().forEach(g -> {
                Guide guide = Guide.builder()
                        .firstName(g.getFirstName())
                        .lastName(g.getLastName())
                        .phoneNumber(g.getPhoneNumber())
                        .build();
                reservation.addGuide(guide);
            });
        }

        if (request.getChauffeurs() != null && !request.getChauffeurs().isEmpty()) {
            request.getChauffeurs().forEach(c -> {
                Chauffeur chauffeur = Chauffeur.builder()
                        .firstName(c.getFirstName())
                        .lastName(c.getLastName())
                        .phoneNumber(c.getPhoneNumber())
                        .build();
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

        if (request.getFirstName()   != null) chauffeur.setFirstName(request.getFirstName());
        if (request.getLastName()    != null) chauffeur.setLastName(request.getLastName());
        if (request.getPhoneNumber() != null) chauffeur.setPhoneNumber(request.getPhoneNumber());

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
    // ─────────────────────────────────────────────────────────────

    @Override
    public InvoiceResponse generateFactureLater(UUID reservationId, CompanyType companyType) {
        Reservation reservation = findById(reservationId);

        double rawTotal =
                (reservation.getTotalAmount()       != null ? reservation.getTotalAmount()       : 0.0)
              + (reservation.getTotalExtrasAmount() != null ? reservation.getTotalExtrasAmount() : 0.0);

        Currency currency   = reservation.getCurrency() != null ? reservation.getCurrency() : Currency.TND;
        double timbreFiscal = getTimbreFiscal(reservation);
        LocalDate invoiceDate = reservation.getCompletedAt() != null
                ? reservation.getCompletedAt().toLocalDate() : LocalDate.now();

        Invoice facture = Invoice.builder()
                .invoiceNumber(generateFactureNumber())
                .invoiceType(InvoiceType.STANDARD)
                .invoiceDate(invoiceDate)
                .totalAmount(rawTotal)
                .timbreFiscal(timbreFiscal)
                .status(InvoiceStatus.DRAFT)
                .currency(currency)
                .reservation(reservation)
                .user(reservation.getUser())
                .companyType(companyType)
                .build();

        double[] tvaBreakdown = populateInvoiceItems(reservation, facture);
        double totalHt  = tvaBreakdown[0];
        double totalTva = tvaBreakdown[1];
        double totalTtc = r2(totalHt + totalTva + timbreFiscal);
        facture.setTotalHt(totalHt);
        facture.setTvaRate(0.0);
        facture.setTvaAmount(totalTva);
        facture.setTotalTtc(totalTtc);

        PaymentSummary paid = paymentService.computePaymentSummary(reservation);
        double paidSoFar    = paid.getTotalPaid();
        PaymentStatus facturePaymentStatus;
        if (paidSoFar <= 0)            facturePaymentStatus = PaymentStatus.UNPAID;
        else if (paidSoFar < totalTtc) facturePaymentStatus = PaymentStatus.PARTIALLY_PAID;
        else                           facturePaymentStatus = PaymentStatus.PAID;
        facture.setPaymentStatus(facturePaymentStatus);
        facture.setPaidAmount(paidSoFar);

        invoiceRepository.save(facture);

        List<InvoiceResponse> invoices = invoiceService.getInvoicesByReservation(reservationId);
        return invoices.get(invoices.size() - 1);
    }

    // ─────────────────────────────────────────────────────────────
    // CURRENCY RECALCULATION
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public ReservationResponse recalculateCurrency(UUID reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found: " + reservationId));

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
                .orElseThrow(() -> new RuntimeException("Reservation not found: " + reservationId));
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

    private void validateIsTourReservation(Reservation reservation) {
        if (reservation.getReservationType() != ReservationType.TOURS) {
            throw new IllegalStateException(
                    "Staff (guides and chauffeurs) can only be managed on TOURS reservations. " +
                            "Current type: " + reservation.getReservationType());
        }
    }

    private void validateStaffManageable(Reservation reservation) {
        ReservationStatus status = reservation.getStatus();
        if (status == ReservationStatus.CANCELLED ||
                status == ReservationStatus.REJECTED  ||
                status == ReservationStatus.COMPLETED) {
            throw new IllegalStateException(
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
        double rate = currencyConfig.rateFor(targetCurrency);
        reservation.setExchangeRateApplied(rate);

        if (reservation.getTotalAmount() != null)
            reservation.setTotalAmount(r2(reservation.getTotalAmount() / rate));
        if (reservation.getTotalExtrasAmount() != null)
            reservation.setTotalExtrasAmount(r2(reservation.getTotalExtrasAmount() / rate));

        reservation.getTourTypes().forEach(tt -> {
            tt.setAdultPrice(r2(tt.getAdultPrice() / rate));
            tt.setChildPrice(r2(tt.getChildPrice() / rate));
        });

        reservation.getTours().forEach(tour -> {
            tour.setAdultPrice(r2(tour.getAdultPrice() / rate));
            tour.setChildPrice(r2(tour.getChildPrice() / rate));
            tour.setTotalPrice(r2(tour.getTotalPrice() / rate));
        });

        reservation.getExtras().forEach(extra -> {
            extra.setUnitPrice(r2(extra.getUnitPrice() / rate));
            extra.setTotalPrice(r2(extra.getTotalPrice() / rate));
        });

        reservation.setCurrency(targetCurrency);
    }

    private static double r2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double[] populateInvoiceItems(Reservation reservation, Invoice invoice) {
        double sumHt = 0, sumTva = 0;
        int line = 1;

        if (reservation.getReservationType() == ReservationType.HEBERGEMENT
                && reservation.getTourTypes() != null
                && !reservation.getTourTypes().isEmpty()) {

            // Group nights into one invoice line only when they're truly the same stay:
            // same tour, same headcount, and same price. A night with a different adult/child
            // count or price (catalog change, per-night promo, etc.) starts its own group/line
            // instead of being blended into an unrelated night's line.
            record TourTypeGroupKey(UUID catalogTourTypeId, Integer adults, Integer children,
                                     Double adultPrice, Double childPrice) {}

            Map<TourTypeGroupKey, List<ReservationTourType>> grouped = new LinkedHashMap<>();
            for (ReservationTourType tt : reservation.getTourTypes()) {
                UUID catalogId = tt.getCatalogTourTypeId() != null
                        ? tt.getCatalogTourTypeId()
                        : tt.getReservationTourTypeId();
                TourTypeGroupKey key = new TourTypeGroupKey(
                        catalogId, tt.getNumberOfAdults(), tt.getNumberOfChildren(),
                        tt.getAdultPrice(), tt.getChildPrice());
                grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(tt);
            }

            for (List<ReservationTourType> group : grouped.values()) {
                ReservationTourType first = group.get(0);
                int    nights   = group.size();
                double rate     = first.getTva() != null ? first.getTva() : 0.0;
                int    adults   = first.getNumberOfAdults()   != null ? first.getNumberOfAdults()   : 0;
                int    children = first.getNumberOfChildren() != null ? first.getNumberOfChildren() : 0;
                double ap       = first.getAdultPrice()  != null ? first.getAdultPrice()  : 0.0;
                double cp       = first.getChildPrice()  != null ? first.getChildPrice()  : 0.0;

                LocalDate minDate = group.stream()
                        .map(ReservationTourType::getActivityDate)
                        .filter(d -> d != null)
                        .min(Comparator.naturalOrder())
                        .orElse(null);
                LocalDate maxDate = group.stream()
                        .map(ReservationTourType::getActivityDate)
                        .filter(d -> d != null)
                        .max(Comparator.naturalOrder())
                        .orElse(null);
                // endDate is checkout day (last night + 1); only set for multi-night
                LocalDate endDate = (maxDate != null && nights > 1) ? maxDate.plusDays(1) : null;

                if (adults > 0) {
                    double lineTtc = r2(ap * adults * nights);
                    double lineHt  = rate > 0 ? r2(lineTtc / (1 + rate / 100)) : lineTtc;
                    sumHt  += lineHt;
                    sumTva += r2(lineTtc - lineHt);
                    invoice.addItem(InvoiceItem.builder()
                            .description(first.getName() + " (Adulte)")
                            .itemType("HEBERGEMENT")
                            .quantity(adults)
                            .unitPrice(rate > 0 ? r2((ap * nights) / (1 + rate / 100)) : r2(ap * nights))
                            .tva(rate)
                            .activityDate(minDate)
                            .activityEndDate(endDate)
                            .lineNumber(line++)
                            .build());
                }
                if (children > 0) {
                    double lineTtc = r2(cp * children * nights);
                    double lineHt  = rate > 0 ? r2(lineTtc / (1 + rate / 100)) : lineTtc;
                    sumHt  += lineHt;
                    sumTva += r2(lineTtc - lineHt);
                    invoice.addItem(InvoiceItem.builder()
                            .description(first.getName() + " (Enfant)")
                            .itemType("HEBERGEMENT")
                            .quantity(children)
                            .unitPrice(rate > 0 ? r2((cp * nights) / (1 + rate / 100)) : r2(cp * nights))
                            .tva(rate)
                            .activityDate(minDate)
                            .activityEndDate(endDate)
                            .lineNumber(line++)
                            .build());
                }
            }
        } else if (reservation.getReservationType() == ReservationType.TOURS
                && reservation.getTours() != null
                && !reservation.getTours().isEmpty()) {
            for (ReservationTour t : reservation.getTours()) {
                double rate     = t.getTva() != null ? t.getTva() : 0.0;
                int    adults   = t.getNumberOfAdults()   != null ? t.getNumberOfAdults()   : 0;
                int    children = t.getNumberOfChildren() != null ? t.getNumberOfChildren() : 0;
                double ap       = t.getAdultPrice()  != null ? t.getAdultPrice()  : 0.0;
                double cp       = t.getChildPrice()  != null ? t.getChildPrice()  : 0.0;

                if (adults > 0) {
                    double lineTtc = r2(ap * adults);
                    double lineHt  = rate > 0 ? r2(lineTtc / (1 + rate / 100)) : lineTtc;
                    sumHt  += lineHt;
                    sumTva += r2(lineTtc - lineHt);
                    invoice.addItem(InvoiceItem.builder()
                            .description(t.getName() + " (Adulte)")
                            .itemType("TOURS")
                            .quantity(adults)
                            .unitPrice(rate > 0 ? r2(ap / (1 + rate / 100)) : ap)
                            .tva(rate)
                            .activityDate(t.getDepartureDate())
                            .lineNumber(line++)
                            .build());
                }
                if (children > 0) {
                    double lineTtc = r2(cp * children);
                    double lineHt  = rate > 0 ? r2(lineTtc / (1 + rate / 100)) : lineTtc;
                    sumHt  += lineHt;
                    sumTva += r2(lineTtc - lineHt);
                    invoice.addItem(InvoiceItem.builder()
                            .description(t.getName() + " (Enfant)")
                            .itemType("TOURS")
                            .quantity(children)
                            .unitPrice(rate > 0 ? r2(cp / (1 + rate / 100)) : cp)
                            .tva(rate)
                            .activityDate(t.getDepartureDate())
                            .lineNumber(line++)
                            .build());
                }
            }
        }

        if (reservation.getExtras() != null) {
            for (ReservationExtra extra : reservation.getExtras()) {
                if (Boolean.TRUE.equals(extra.getIsActive())) {
                    double rate    = extra.getTva() != null ? extra.getTva() : 0.0;
                    int    qty     = extra.getQuantity() != null ? extra.getQuantity() : 1;
                    double unitP   = extra.getUnitPrice() != null ? extra.getUnitPrice() : 0.0;
                    double lineTtc = extra.getTotalPrice() != null ? extra.getTotalPrice() : r2(unitP * qty);
                    double lineHt  = rate > 0 ? r2(lineTtc / (1 + rate / 100)) : lineTtc;
                    sumHt  += lineHt;
                    sumTva += r2(lineTtc - lineHt);
                    invoice.addItem(InvoiceItem.builder()
                            .description(extra.getName())
                            .itemType("EXTRA")
                            .quantity(qty)
                            .unitPrice(rate > 0 ? r2(unitP / (1 + rate / 100)) : unitP)
                            .tva(rate)
                            .activityDate(extra.getActivityDate())
                            .lineNumber(line++)
                            .build());
                }
            }
        }

        return new double[]{ r2(sumHt), r2(sumTva) };
    }

    private String generateProformaNumber() {
        int year = LocalDate.now().getYear();
        DocumentSequence seq = documentSequenceRepository
                .findByTypeAndYearForUpdate("PROFORMA", year)
                .orElseGet(() -> DocumentSequence.builder()
                        .type("PROFORMA").year(year).lastNumber(0).build());
        seq.setLastNumber(seq.getLastNumber() + 1);
        documentSequenceRepository.save(seq);
        return String.format("%03d/%d", seq.getLastNumber(), year);
    }

    private String generateFactureNumber() {
        int year = LocalDate.now().getYear();
        DocumentSequence seq = documentSequenceRepository
                .findByTypeAndYearForUpdate("FACTURE", year)
                .orElseGet(() -> DocumentSequence.builder()
                        .type("FACTURE").year(year).lastNumber(0).build());
        seq.setLastNumber(seq.getLastNumber() + 1);
        documentSequenceRepository.save(seq);
        return String.format("%03d/%d", seq.getLastNumber(), year);
    }

    private double getTimbreFiscal(Reservation reservation) {
        Currency currency = reservation.getCurrency() != null ? reservation.getCurrency() : Currency.TND;
        if (currency == Currency.TND) return 1.000;
        return Math.round((1.0 / currencyConfig.effectiveRate(reservation)) * 1000.0) / 1000.0;
    }
}
