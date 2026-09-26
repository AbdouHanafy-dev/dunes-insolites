package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ReservationRequest;
import com.camping.duneinsolite.service.AccommodationPricingService.Guests;
import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.dto.request.publicapi.PublicTourBookingRequest;
import com.camping.duneinsolite.dto.response.ReservationResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.Source;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.ReservationType;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.SourceRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.ReservationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * PublicBookingServiceImpl turns the vitrine's guest-checkout form into a
 * real, server-priced Reservation - the exact path verified live during the
 * DNS-cutover / credential-flow work on 30 Aug 2026 (a real 201, correctly
 * priced at stay-price x partySize, real reservation_tour_types row). It had
 * zero tests despite being the actual money path a guest hits with no login
 * step - these pin the mapping/pricing-input logic that verification
 * exercised manually, so it can't silently regress.
 */
class PublicBookingServiceImplTest {

    private TourTypeRepository tourTypeRepository;
    private TourRepository tourRepository;
    private ExtraRepository extraRepository;
    private SourceRepository sourceRepository;
    private com.camping.duneinsolite.repository.AccommodationTypeRepository accommodationTypeRepository;
    private com.camping.duneinsolite.service.AccommodationPricingService accommodationPricingService;
    private KeycloakUserSyncService keycloakUserSyncService;
    private com.camping.duneinsolite.service.AccountActionService accountActionService;
    private com.camping.duneinsolite.repository.UserRepository userRepository;
    private com.camping.duneinsolite.security.CallerContext callerContext;
    private ReservationService reservationService;
    private PublicBookingServiceImpl service;

    private final UUID tourTypeId = UUID.randomUUID();
    private final UUID sourceId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        tourTypeRepository = mock(TourTypeRepository.class);
        tourRepository = mock(TourRepository.class);
        extraRepository = mock(ExtraRepository.class);
        sourceRepository = mock(SourceRepository.class);
        accommodationTypeRepository = mock(com.camping.duneinsolite.repository.AccommodationTypeRepository.class);
        accommodationPricingService = mock(com.camping.duneinsolite.service.AccommodationPricingService.class);
        var accommodationAvailabilityService = mock(com.camping.duneinsolite.service.AccommodationAvailabilityService.class);
        var availabilityMetrics = new com.camping.duneinsolite.observability.AvailabilityMetrics(
                new io.micrometer.core.instrument.simple.SimpleMeterRegistry());
        keycloakUserSyncService = mock(KeycloakUserSyncService.class);
        accountActionService = mock(com.camping.duneinsolite.service.AccountActionService.class);
        userRepository = mock(com.camping.duneinsolite.repository.UserRepository.class);
        callerContext = mock(com.camping.duneinsolite.security.CallerContext.class);
        reservationService = mock(ReservationService.class);

        service = new PublicBookingServiceImpl(
                tourTypeRepository, tourRepository, extraRepository,
                sourceRepository,
                accommodationTypeRepository, accommodationPricingService,
                accommodationAvailabilityService, availabilityMetrics,
                keycloakUserSyncService, accountActionService, userRepository,
                callerContext, reservationService,
                java.time.Clock.systemUTC());

        // status() default (Mockito) returns null → NPE in createStayBooking's
        // pre-check; stub a benign AVAILABLE result.
        org.mockito.Mockito.when(accommodationAvailabilityService.status(
                        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any()))
                .thenReturn(new com.camping.duneinsolite.service.AccommodationAvailabilityService.Availability(
                        com.camping.duneinsolite.service.AccommodationAvailabilityService.Status.UNKNOWN, null));

        when(sourceRepository.findByName("Site web"))
                .thenReturn(Optional.of(Source.builder().sourceId(sourceId).name("Site web").build()));
        when(keycloakUserSyncService.createInvitedGuestUser(any(), any(), any()))
                .thenReturn(User.builder().userId(userId).role(UserRole.CLIENT).build());
    }

    /** The real service always sets reservationId (see ReservationServiceImpl) -
     *  a bare `new ReservationResponse()` here would NPE at
     *  `.getReservationId().toString()`, which is the response-building code,
     *  not the mapping logic these tests actually target. */
    private ReservationResponse reservationResponseStub() {
        ReservationResponse response = new ReservationResponse();
        response.setReservationId(UUID.randomUUID());
        return response;
    }

    private PublicStayBookingRequest baseRequest() {
        PublicStayBookingRequest request = new PublicStayBookingRequest();
        request.setStaySlug("nuitee-campement-desert");
        request.setDate(LocalDate.of(2026, 9, 20));
        request.setPartySize(2);
        request.setArrivalMode("OWN_VEHICLE");
        request.setName("Claude Test Guest");
        request.setEmail("guest@example.com");
        request.setPhone("+21650000000");
        return request;
    }

    @Test
    void mapsAStayBookingToAOneNightHebergementReservation() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));

        ReservationResponse response = new ReservationResponse();
        response.setReservationId(UUID.randomUUID());
        response.setTotalAmount(new java.math.BigDecimal("190.0"));
        response.setTotalExtrasAmount(new java.math.BigDecimal("35.0"));
        when(reservationService.createReservation(any())).thenReturn(response);

        var publicResponse = service.createStayBooking(baseRequest());

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        ReservationRequest built = captor.getValue();

        assertThat(built.getUserId()).isEqualTo(userId);
        assertThat(built.getSourceId()).isEqualTo(sourceId);
        assertThat(built.getReservationType()).isEqualTo(ReservationType.HEBERGEMENT);
        // A nuitée is one night - the contract only carries a single date, so
        // check-out must always be derived as check-in + 1, never left equal
        // to check-in (that would be a zero-night stay) or taken from the
        // caller (the contract has no separate check-out field to trust).
        assertThat(built.getCheckInDate()).isEqualTo(LocalDate.of(2026, 9, 20));
        assertThat(built.getCheckOutDate()).isEqualTo(LocalDate.of(2026, 9, 21));
        assertThat(built.getNumberOfAdults()).isEqualTo(2);
        assertThat(built.getNumberOfChildren()).isZero();
        assertThat(built.getTourTypes()).hasSize(1);
        assertThat(built.getTourTypes().get(0).getTourTypeId()).isEqualTo(tourTypeId);
        assertThat(built.getExtras()).isNull();
        assertThat(publicResponse.getTotal()).isEqualByComparingTo("225.000");
        assertThat(publicResponse.getStatus()).isEqualTo("pending");
        verify(accountActionService).sendGuestPasswordSetupInvitation(any(User.class), any());
    }

    @Test
    void unknownOrInactiveStaySlugIsRejectedBeforeTouchingKeycloakOrPricing() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("does-not-exist")).thenReturn(Optional.empty());
        PublicStayBookingRequest request = baseRequest();
        request.setStaySlug("does-not-exist");

        assertThatThrownBy(() -> service.createStayBooking(request))
                .isInstanceOf(ResourceNotFoundException.class);

        // Reject-before-side-effects: a bad slug must never reach the
        // guest-account-creation or pricing step (same "validate before you
        // touch an external system" discipline KeycloakUserSyncService's own
        // adminCreateUser/registerUser already follow).
        verify(keycloakUserSyncService, org.mockito.Mockito.never())
                .createInvitedGuestUser(any(), any(), any());
        verify(reservationService, org.mockito.Mockito.never()).createReservation(any());
    }

    @Test
    void ridesAreCarriedAsExtrasOnTheSameDateAsTheStay() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        UUID extraId = UUID.randomUUID();
        when(extraRepository.findBySlugAndIsActiveTrue("quad-desert"))
                .thenReturn(Optional.of(Extra.builder().extraId(extraId).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        PublicStayBookingRequest request = baseRequest();
        request.setRideSlugs(List.of("quad-desert"));
        service.createStayBooking(request);

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        var extras = captor.getValue().getExtras();

        assertThat(extras).hasSize(1);
        assertThat(extras.get(0).getExtraId()).isEqualTo(extraId);
        assertThat(extras.get(0).getActivityDate()).isEqualTo(LocalDate.of(2026, 9, 20));
    }

    @Test
    void perUnitActivitiesAreRequestedOncePerTraveler_otherUnitsStayAtOne() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        UUID perUnitId = UUID.randomUUID();
        UUID flatId = UUID.randomUUID();
        when(extraRepository.findBySlugAndIsActiveTrue("camel-trek"))
                .thenReturn(Optional.of(Extra.builder().extraId(perUnitId)
                        .pricingUnit(com.camping.duneinsolite.model.enums.PricingUnit.PER_UNIT).build()));
        when(extraRepository.findBySlugAndIsActiveTrue("bread-demo"))
                .thenReturn(Optional.of(Extra.builder().extraId(flatId)
                        .pricingUnit(com.camping.duneinsolite.model.enums.PricingUnit.PER_BOOKING).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        PublicStayBookingRequest request = baseRequest();
        request.setPartySize(3);
        request.setRideSlugs(List.of("camel-trek", "bread-demo"));
        service.createStayBooking(request);

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        var extras = captor.getValue().getExtras();

        assertThat(extras.get(0).getExtraId()).isEqualTo(perUnitId);
        assertThat(extras.get(0).getQuantity()).isEqualTo(3);
        assertThat(extras.get(1).getExtraId()).isEqualTo(flatId);
        assertThat(extras.get(1).getQuantity()).isEqualTo(1);
    }

    @Test
    void accommodationChoiceResolvesToATierAndDrivesPricing_notFreeText() {
        // Phase 1: the picked tier is a real, server-priced product. It must be
        // resolved to an AccommodationType id + unit count on the selection so
        // ReservationService prices it per unit — the earlier "notes only, never
        // affects price" behaviour was the defect this phase fixes.
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        UUID accId = UUID.randomUUID();
        when(accommodationTypeRepository.findByTourTypeAndSlug(tourTypeId, "dune-suite"))
                .thenReturn(Optional.of(com.camping.duneinsolite.model.AccommodationType.builder()
                        .id(accId).slug("dune-suite").name("Dune Suite").capacity(4).active(true)
                        .adultPriceTtc(new java.math.BigDecimal("165.000")).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        PublicStayBookingRequest request = baseRequest();
        var accSelection = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        accSelection.setAccommodationSlug("dune-suite");
        accSelection.setQuantity(2);
        request.setAccommodations(List.of(accSelection));
        service.createStayBooking(request);

        // fail-closed pre-check ran before any reservation was built
        verify(accommodationPricingService).resolveById(accId, 2, 1, new Guests(2, 0, 0), LocalDate.of(2026, 9, 20));

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        var selection = captor.getValue().getTourTypes().get(0);
        var resolved = selection.resolvedAccommodationSelections();
        assertThat(resolved).hasSize(1);
        assertThat(resolved.get(0).getAccommodationTypeId()).isEqualTo(accId);
        assertThat(resolved.get(0).getAccommodationUnits()).isEqualTo(2);
    }

    @Test
    void multipleAccommodationTiersCanBeBookedTogether() {
        // The core of the multi-tier feature: a guest can pick several tiers
        // at once (e.g. a Suite and a Tente together) in one booking, each
        // resolved and priced independently.
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        UUID suiteId = UUID.randomUUID();
        UUID tentId = UUID.randomUUID();
        when(accommodationTypeRepository.findByTourTypeAndSlug(tourTypeId, "dune-suite"))
                .thenReturn(Optional.of(com.camping.duneinsolite.model.AccommodationType.builder()
                        .id(suiteId).slug("dune-suite").name("Dune Suite").capacity(4).active(true)
                        .adultPriceTtc(new java.math.BigDecimal("165.000")).build()));
        when(accommodationTypeRepository.findByTourTypeAndSlug(tourTypeId, "desert-tent"))
                .thenReturn(Optional.of(com.camping.duneinsolite.model.AccommodationType.builder()
                        .id(tentId).slug("desert-tent").name("Desert Tent").capacity(2).active(true)
                        .adultPriceTtc(new java.math.BigDecimal("80.000")).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        PublicStayBookingRequest request = baseRequest();
        var suiteSelection = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        suiteSelection.setAccommodationSlug("dune-suite");
        suiteSelection.setQuantity(2);
        suiteSelection.setAdults(1);
        var tentSelection = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        tentSelection.setAccommodationSlug("desert-tent");
        tentSelection.setQuantity(3);
        tentSelection.setAdults(1);
        request.setAccommodations(List.of(suiteSelection, tentSelection));
        service.createStayBooking(request);

        verify(accommodationPricingService).resolveById(suiteId, 2, 1, new Guests(1, 0, 0), LocalDate.of(2026, 9, 20));
        verify(accommodationPricingService).resolveById(tentId, 3, 1, new Guests(1, 0, 0), LocalDate.of(2026, 9, 20));

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        var resolved = captor.getValue().getTourTypes().get(0).resolvedAccommodationSelections();
        assertThat(resolved).hasSize(2);
        assertThat(resolved).extracting("accommodationTypeId").containsExactlyInAnyOrder(suiteId, tentId);
    }

    @Test
    void unknownAccommodationSlugIsRejectedBeforeAnySideEffect() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        when(accommodationTypeRepository.findByTourTypeAndSlug(tourTypeId, "gold-yurt"))
                .thenReturn(Optional.empty());

        PublicStayBookingRequest request = baseRequest();
        var accSelection = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        accSelection.setAccommodationSlug("gold-yurt");
        accSelection.setQuantity(1);
        request.setAccommodations(List.of(accSelection));

        assertThatThrownBy(() -> service.createStayBooking(request))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(keycloakUserSyncService, org.mockito.Mockito.never())
                .createInvitedGuestUser(any(), any(), any());
        verify(reservationService, org.mockito.Mockito.never()).createReservation(any());
    }

    @Test
    void serviceOptionSelectionResolvesToAServiceOptionIdAndCarriesPickupDetails() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        UUID optionId = UUID.randomUUID();
        when(extraRepository.findBySlugAndIsActiveTrue("hotel-pickup"))
                .thenReturn(Optional.of(Extra.builder()
                        .extraId(optionId).slug("hotel-pickup").name("Hotel Pickup")
                        .category(com.camping.duneinsolite.model.enums.ExtraCategory.TRANSPORT)
                        .serviceType("HOTEL_PICKUP")
                        .pricingUnit(com.camping.duneinsolite.model.enums.PricingUnit.PER_BOOKING)
                        .isActive(true).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        PublicStayBookingRequest request = baseRequest();
        var selection = new com.camping.duneinsolite.dto.request.publicapi.PublicServiceOptionSelectionRequest();
        selection.setServiceOptionSlug("hotel-pickup");
        selection.setPickupHotelName("Sabria Palace");
        request.setServiceOptions(List.of(selection));
        request.setArrivalMode("TRANSPORT");

        service.createStayBooking(request);

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        var built = captor.getValue().getExtras().get(0);
        assertThat(built.getExtraId()).isEqualTo(optionId);
        assertThat(built.getPickupHotelName()).isEqualTo("Sabria Palace");
        assertThat(built.getQuantity()).isEqualTo(1);
    }

    @Test
    void transportModeWithoutATransportOptionFailsBeforeCreatingAUser() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        when(extraRepository.existsByCategoryAndIsActiveTrue(com.camping.duneinsolite.model.enums.ExtraCategory.TRANSPORT)).thenReturn(true);
        PublicStayBookingRequest request = baseRequest();
        request.setArrivalMode("TRANSPORT");

        assertThatThrownBy(() -> service.createStayBooking(request))
                .isInstanceOf(com.camping.duneinsolite.exception.ReservationValidationException.class)
                .hasMessageContaining("choose transportation");
        verify(keycloakUserSyncService, org.mockito.Mockito.never())
                .createInvitedGuestUser(any(), any(), any());
    }

    @Test
    void perPersonServiceQuantityComesFromThePartySizeNotTheClient() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        UUID optionId = UUID.randomUUID();
        when(extraRepository.findBySlugAndIsActiveTrue("shared-transfer"))
                .thenReturn(Optional.of(Extra.builder()
                        .extraId(optionId).slug("shared-transfer").name("Shared Transfer")
                        .category(com.camping.duneinsolite.model.enums.ExtraCategory.TRANSPORT)
                        .serviceType("SHARED_TRANSFER")
                        .pricingUnit(com.camping.duneinsolite.model.enums.PricingUnit.PER_PERSON)
                        .isActive(true).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());
        var selection = new com.camping.duneinsolite.dto.request.publicapi.PublicServiceOptionSelectionRequest();
        selection.setServiceOptionSlug("shared-transfer");
        selection.setQuantity(1);
        PublicStayBookingRequest request = baseRequest();
        request.setPartySize(4);
        request.setArrivalMode("TRANSPORT");
        request.setServiceOptions(List.of(selection));

        service.createStayBooking(request);

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        assertThat(captor.getValue().getExtras().get(0).getQuantity()).isEqualTo(4);
    }

    @Test
    void tourTransportRequestIsSavedForAdminAssignmentWithoutForcingACatalogVehicle() {
        UUID tourId = UUID.randomUUID();
        when(tourRepository.findBySlugAndIsActiveTrue("sahara-circuit"))
                .thenReturn(Optional.of(Tour.builder().tourId(tourId).isActive(true).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        PublicTourBookingRequest request = new PublicTourBookingRequest();
        request.setTourSlug("sahara-circuit");
        request.setDate(LocalDate.of(2026, 10, 20));
        request.setNumberOfAdults(2);
        request.setNumberOfChildren(1);
        request.setArrivalMode("TRANSPORT");
        request.setName("Transport Guest");
        request.setEmail("transport@example.com");
        request.setPhone("+21650000009");

        service.createTourBooking(request);

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        ReservationRequest built = captor.getValue();
        assertThat(built.getArrivalMode())
                .isEqualTo(com.camping.duneinsolite.model.enums.ArrivalMode.TRANSPORT);
        assertThat(built.getExtras()).isNull();
        assertThat(built.getTours()).hasSize(1);
        assertThat(built.getTours().get(0).getTourId()).isEqualTo(tourId);
    }

    @Test
    void anOvernightCircuitNoLongerAsksForAnAccommodation() {
        UUID tourId = UUID.randomUUID();
        when(tourRepository.findBySlugAndIsActiveTrue("sabria-circuit"))
                .thenReturn(Optional.of(Tour.builder().tourId(tourId).name("Sabria circuit")
                        .overnightsAtCamp(true).isActive(true).build()));
        when(tourTypeRepository.findFirstByCircuitCampTrue())
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).circuitCamp(true).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        service.createTourBooking(tourRequest("sabria-circuit"));

        // The night at the camp is included in the circuit's price: nothing to choose, no camp line.
        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        assertThat(captor.getValue().getTours().get(0).getHebergements()).isNullOrEmpty();
    }

    @Test
    void aMultiDayCircuitDoesNotAskForAnAccommodationEither() {
        UUID tourId = UUID.randomUUID();
        when(tourRepository.findBySlugAndIsActiveTrue("two-day-sabria-circuit"))
                .thenReturn(Optional.of(Tour.builder().tourId(tourId).name("Two-day Sabria circuit")
                        .durationHours(48).overnightsAtCamp(false).isActive(true).build()));
        when(tourTypeRepository.findFirstByCircuitCampTrue())
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).circuitCamp(true).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        service.createTourBooking(tourRequest("two-day-sabria-circuit"));

        verify(reservationService).createReservation(any());
    }

    private Extra tourOption(String slug, com.camping.duneinsolite.model.enums.PricingUnit unit, Integer minParty,
                             String serviceType) {
        Extra option = Extra.builder().extraId(UUID.randomUUID()).slug(slug).name(slug).isActive(true)
                .category(com.camping.duneinsolite.model.enums.ExtraCategory.TOUR_OPTION)
                .pricingUnit(unit).minPartySize(minParty).serviceType(serviceType).build();
        when(extraRepository.findBySlugAndIsActiveTrue(slug)).thenReturn(Optional.of(option));
        return option;
    }

    private void circuitOfHours(int hours) {
        when(tourRepository.findBySlugAndIsActiveTrue("circuit"))
                .thenReturn(Optional.of(Tour.builder().tourId(UUID.randomUUID()).name("Circuit")
                        .durationHours(hours).isActive(true).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());
    }

    private static com.camping.duneinsolite.dto.request.publicapi.PublicServiceOptionSelectionRequest pick(String slug) {
        var sel = new com.camping.duneinsolite.dto.request.publicapi.PublicServiceOptionSelectionRequest();
        sel.setServiceOptionSlug(slug);
        return sel;
    }

    @Test
    void anUpgradeIsRequestedForEachNightOfTheCircuit() {
        circuitOfHours(72); // 3 days = 2 nights
        Extra suite = tourOption("upgrade-suite", com.camping.duneinsolite.model.enums.PricingUnit.PER_PERSON_NIGHT, 2, "UPGRADE");
        PublicTourBookingRequest request = tourRequest("circuit");
        request.setServiceOptions(List.of(pick("upgrade-suite")));

        service.createTourBooking(request);

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        // The reservation service multiplies the quantity (nights) by the party, so the price is
        // unit price x people x nights and no client-sent number is involved.
        assertThat(captor.getValue().getExtras()).singleElement().satisfies(line -> {
            assertThat(line.getExtraId()).isEqualTo(suite.getExtraId());
            assertThat(line.getQuantity()).isEqualTo(2);
        });
    }

    @Test
    void anUpgradeIsRefusedForAPartyBelowItsMinimum() {
        circuitOfHours(48);
        tourOption("upgrade-tente", com.camping.duneinsolite.model.enums.PricingUnit.PER_PERSON_NIGHT, 5, "UPGRADE");
        PublicTourBookingRequest request = tourRequest("circuit"); // 2 adults + 1 child = 3
        request.setServiceOptions(List.of(pick("upgrade-tente")));

        assertThatThrownBy(() -> service.createTourBooking(request))
                .isInstanceOf(com.camping.duneinsolite.exception.ReservationValidationException.class)
                .hasMessageContaining("needs at least 5 travelers");
        verify(keycloakUserSyncService, org.mockito.Mockito.never()).createInvitedGuestUser(any(), any(), any());
        verify(reservationService, org.mockito.Mockito.never()).createReservation(any());
    }

    @Test
    void aNightlyUpgradeIsRefusedOnASingleDayCircuit() {
        circuitOfHours(12);
        tourOption("upgrade-suite", com.camping.duneinsolite.model.enums.PricingUnit.PER_PERSON_NIGHT, null, "UPGRADE");
        PublicTourBookingRequest request = tourRequest("circuit");
        request.setServiceOptions(List.of(pick("upgrade-suite")));

        assertThatThrownBy(() -> service.createTourBooking(request))
                .isInstanceOf(com.camping.duneinsolite.exception.ReservationValidationException.class)
                .hasMessageContaining("needs a night");
    }

    @Test
    void aReturnCityTypedByTheGuestIsChargedThroughTheBackOfficeOption() {
        circuitOfHours(48);
        Extra other = tourOption("autre-ville-de-retour", com.camping.duneinsolite.model.enums.PricingUnit.PER_BOOKING,
                null, PublicBookingServiceImpl.RETURN_CITY_OPTION);
        when(extraRepository.findFirstByCategoryAndServiceTypeAndIsActiveTrue(
                com.camping.duneinsolite.model.enums.ExtraCategory.TOUR_OPTION, PublicBookingServiceImpl.RETURN_CITY_OPTION))
                .thenReturn(Optional.of(other));
        PublicTourBookingRequest request = tourRequest("circuit");
        request.setReturnCityOther("  Gabès  ");

        service.createTourBooking(request);

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        assertThat(captor.getValue().getReturnCityOther()).isEqualTo("Gabès");
        assertThat(captor.getValue().getReturnCity()).isNull();
        assertThat(captor.getValue().getExtras()).singleElement()
                .satisfies(line -> assertThat(line.getExtraId()).isEqualTo(other.getExtraId()));
    }

    @Test
    void aReturnCityTypedByTheGuestIsKeptEvenWhenNoPriceIsSetUpYet() {
        circuitOfHours(48);
        PublicTourBookingRequest request = tourRequest("circuit");
        request.setReturnCityOther("Gabès");

        service.createTourBooking(request);

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        assertThat(captor.getValue().getReturnCityOther()).isEqualTo("Gabès");
        assertThat(captor.getValue().getExtras()).isNull();
    }

    @Test
    void aListedReturnCityAndATypedOneAreNotAccepted_together() {
        circuitOfHours(48);
        PublicTourBookingRequest request = tourRequest("circuit");
        request.setReturnCity("TUNIS");
        request.setReturnCityOther("Gabès");

        assertThatThrownBy(() -> service.createTourBooking(request))
                .isInstanceOf(com.camping.duneinsolite.exception.ReservationValidationException.class)
                .hasMessageContaining("not both");
    }

    @Test
    void overnightCircuitDoesNotRequireAnAccommodationWhenNoStayIsSetAsTheCircuitCamp() {
        UUID tourId = UUID.randomUUID();
        when(tourRepository.findBySlugAndIsActiveTrue("sabria-circuit"))
                .thenReturn(Optional.of(Tour.builder().tourId(tourId).name("Sabria circuit")
                        .overnightsAtCamp(true).isActive(true).build()));
        when(tourTypeRepository.findFirstByCircuitCampTrue()).thenReturn(Optional.empty());
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        service.createTourBooking(tourRequest("sabria-circuit"));

        verify(reservationService).createReservation(any());
    }

    @Test
    void circuitCampTiersAreUsedEvenWhenThatStayHasAccommodationTypesSwitchedOff() {
        UUID tourId = UUID.randomUUID();
        UUID accommodationId = UUID.randomUUID();
        when(tourRepository.findBySlugAndIsActiveTrue("sabria-circuit"))
                .thenReturn(Optional.of(Tour.builder().tourId(tourId).name("Sabria circuit")
                        .overnightsAtCamp(true).isActive(true).build()));
        when(tourTypeRepository.findFirstByCircuitCampTrue())
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId)
                        .circuitCamp(true).hasAccommodationTypes(false).build()));
        when(accommodationTypeRepository.findByTourTypeAndSlug(tourTypeId, "desert-room"))
                .thenReturn(Optional.of(com.camping.duneinsolite.model.AccommodationType.builder()
                        .id(accommodationId).slug("desert-room").name("Desert Room")
                        .capacity(3).active(true).adultPriceTtc(new java.math.BigDecimal("120.000")).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());
        PublicTourBookingRequest request = tourRequest("sabria-circuit");
        com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest sel =
                new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        sel.setAccommodationSlug("desert-room");
        sel.setQuantity(1);
        request.setAccommodations(List.of(sel));

        service.createTourBooking(request);

        verify(reservationService).createReservation(any());
    }

    @Test
    void stayBookingSplitsThePartyIntoAdultsAndChildrenForPerPersonPricing() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId)
                        .hasAccommodationTypes(false).maxNights(10).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());
        PublicStayBookingRequest request = baseRequest();
        request.setPartySize(4);
        request.setChildren(1);
        request.setNights(3);

        service.createStayBooking(request);

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        ReservationRequest built = captor.getValue();
        assertThat(built.getNumberOfAdults()).isEqualTo(3);
        assertThat(built.getNumberOfChildren()).isEqualTo(1);
        assertThat(built.getCheckOutDate()).isEqualTo(LocalDate.of(2026, 9, 23));
        assertThat(built.getTourTypes().get(0).getNumberOfAdults()).isEqualTo(3);
        assertThat(built.getTourTypes().get(0).getNumberOfChildren()).isEqualTo(1);
    }

    @Test
    void stayBookingNeedsAtLeastOneAdult() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        PublicStayBookingRequest request = baseRequest();
        request.setPartySize(2);
        request.setChildren(2);

        assertThatThrownBy(() -> service.createStayBooking(request))
                .isInstanceOf(com.camping.duneinsolite.exception.ReservationValidationException.class)
                .hasMessageContaining("At least one adult");
        verify(keycloakUserSyncService, org.mockito.Mockito.never())
                .createInvitedGuestUser(any(), any(), any());
    }

    @Test
    void stayWithoutAccommodationTypesRejectsATierSelectionBeforeCreatingAUser() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId)
                        .hasAccommodationTypes(false).build()));
        com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest sel =
                new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        sel.setAccommodationSlug("desert-room");
        sel.setQuantity(1);
        PublicStayBookingRequest request = baseRequest();
        request.setAccommodations(List.of(sel));

        assertThatThrownBy(() -> service.createStayBooking(request))
                .isInstanceOf(com.camping.duneinsolite.exception.ReservationValidationException.class)
                .hasMessageContaining("no accommodation types");
        verify(keycloakUserSyncService, org.mockito.Mockito.never())
                .createInvitedGuestUser(any(), any(), any());
        verify(reservationService, org.mockito.Mockito.never()).createReservation(any());
    }

    @Test
    void overnightCircuitMapsAccommodationTierAndQuantityToItsCampNight() {
        UUID tourId = UUID.randomUUID();
        UUID accommodationId = UUID.randomUUID();
        when(tourRepository.findBySlugAndIsActiveTrue("sabria-circuit"))
                .thenReturn(Optional.of(Tour.builder().tourId(tourId).name("Sabria circuit")
                        .overnightsAtCamp(true).isActive(true).build()));
        when(tourTypeRepository.findFirstByCircuitCampTrue())
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).circuitCamp(true).build()));
        when(accommodationTypeRepository.findByTourTypeAndSlug(tourTypeId, "desert-room"))
                .thenReturn(Optional.of(com.camping.duneinsolite.model.AccommodationType.builder()
                        .id(accommodationId).slug("desert-room").name("Desert Room")
                        .capacity(3).active(true).adultPriceTtc(new java.math.BigDecimal("120.000")).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        PublicTourBookingRequest request = tourRequest("sabria-circuit");
        var accommodation = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        accommodation.setAccommodationSlug("desert-room");
        accommodation.setQuantity(2);
        request.setAccommodations(List.of(accommodation));

        service.createTourBooking(request);

        verify(accommodationPricingService).resolveById(
                accommodationId, 2, 1, new Guests(2, 1, 0), LocalDate.of(2026, 10, 20));
        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        var campNight = captor.getValue().getTours().get(0).getHebergements().get(0);
        assertThat(campNight.getTourTypeId()).isEqualTo(tourTypeId);
        assertThat(campNight.getNumberOfNights()).isEqualTo(1);
        assertThat(campNight.getAccommodations()).singleElement().satisfies(selected -> {
            assertThat(selected.getAccommodationTypeId()).isEqualTo(accommodationId);
            assertThat(selected.getAccommodationUnits()).isEqualTo(2);
        });
    }

    @Test
    void oneDayCircuitDetailFormCanUseTheSharedCampAccommodationCatalogue() {
        UUID tourId = UUID.randomUUID();
        UUID accommodationId = UUID.randomUUID();
        when(tourRepository.findBySlugAndIsActiveTrue("one-day-circuit"))
                .thenReturn(Optional.of(Tour.builder().tourId(tourId).name("One-day circuit")
                        .durationHours(24).overnightsAtCamp(false).isActive(true).build()));
        when(tourTypeRepository.findFirstByCircuitCampTrue())
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).circuitCamp(true).build()));
        when(accommodationTypeRepository.findByTourTypeAndSlug(tourTypeId, "desert-tent"))
                .thenReturn(Optional.of(com.camping.duneinsolite.model.AccommodationType.builder()
                        .id(accommodationId).slug("desert-tent").name("Desert Tent")
                        .capacity(3).active(true).adultPriceTtc(new java.math.BigDecimal("95.000")).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        PublicTourBookingRequest request = tourRequest("one-day-circuit");
        var accommodation = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        accommodation.setAccommodationSlug("desert-tent");
        accommodation.setQuantity(1);
        request.setAccommodations(List.of(accommodation));

        service.createTourBooking(request);

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        var campNight = captor.getValue().getTours().get(0).getHebergements().get(0);
        assertThat(campNight.getTourTypeId()).isEqualTo(tourTypeId);
        assertThat(campNight.getAccommodations()).singleElement().satisfies(selected ->
                assertThat(selected.getAccommodationTypeId()).isEqualTo(accommodationId));
    }

    @Test
    void aStayWithAReturnCityTypedByTheGuestIsChargedThroughTheBackOfficeOption() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        Extra other = tourOption("autre-ville-de-retour", com.camping.duneinsolite.model.enums.PricingUnit.PER_BOOKING,
                null, PublicBookingServiceImpl.RETURN_CITY_OPTION);
        when(extraRepository.findFirstByCategoryAndServiceTypeAndIsActiveTrue(
                com.camping.duneinsolite.model.enums.ExtraCategory.TOUR_OPTION, PublicBookingServiceImpl.RETURN_CITY_OPTION))
                .thenReturn(Optional.of(other));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());
        PublicStayBookingRequest request = baseRequest();
        request.setReturnCityOther("  Gabès ");

        service.createStayBooking(request);

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        assertThat(captor.getValue().getReturnCityOther()).isEqualTo("Gabès");
        assertThat(captor.getValue().getReturnCity()).isNull();
        assertThat(captor.getValue().getExtras()).singleElement()
                .satisfies(line -> assertThat(line.getExtraId()).isEqualTo(other.getExtraId()));
    }

    @Test
    void aStayRefusesAListedAndATypedReturnCityTogether() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        PublicStayBookingRequest request = baseRequest();
        request.setReturnCity("TUNIS");
        request.setReturnCityOther("Gabès");

        assertThatThrownBy(() -> service.createStayBooking(request))
                .isInstanceOf(com.camping.duneinsolite.exception.ReservationValidationException.class)
                .hasMessageContaining("not both");
        verify(reservationService, org.mockito.Mockito.never()).createReservation(any());
    }

    @Test
    void aNightlyUpgradeCannotBeSoldOnAStay() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        tourOption("upgrade-suite", com.camping.duneinsolite.model.enums.PricingUnit.PER_PERSON_NIGHT, null, "UPGRADE");
        PublicStayBookingRequest request = baseRequest();
        request.setServiceOptions(List.of(pick("upgrade-suite")));

        assertThatThrownBy(() -> service.createStayBooking(request))
                .isInstanceOf(com.camping.duneinsolite.exception.ReservationValidationException.class);
        verify(reservationService, org.mockito.Mockito.never()).createReservation(any());
    }

    private PublicTourBookingRequest tourRequest(String slug) {
        PublicTourBookingRequest request = new PublicTourBookingRequest();
        request.setTourSlug(slug);
        request.setDate(LocalDate.of(2026, 10, 20));
        request.setNumberOfAdults(2);
        request.setNumberOfChildren(1);
        request.setArrivalMode("OWN_VEHICLE");
        request.setName("Circuit Guest");
        request.setEmail("circuit@example.com");
        request.setPhone("+21650000008");
        return request;
    }

    @Test
    void authenticatedClientOwnsTheBookingAndNoGuestAccountIsCreated() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        when(callerContext.isAuthenticatedUser()).thenReturn(true);
        when(callerContext.requireUserId()).thenReturn(userId);
        User signedIn = User.builder()
                .userId(userId).name("Signed In Guest").email("guest@example.com")
                .role(UserRole.CLIENT).build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(signedIn));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        service.createStayBooking(baseRequest());

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        assertThat(captor.getValue().getUserId()).isEqualTo(userId);
        verify(keycloakUserSyncService, org.mockito.Mockito.never())
                .createInvitedGuestUser(any(), any(), any());
        verify(accountActionService, org.mockito.Mockito.never())
                .sendGuestPasswordSetupInvitation(any(), any());
    }

    @Test
    void aVisitorWhoAlreadyHasAClientAccountBooksIntoThatAccountWithoutSigningIn() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        UUID existingId = UUID.randomUUID();
        when(userRepository.findByEmail("guest@example.com")).thenReturn(Optional.of(User.builder()
                .userId(existingId).name("Returning Client").email("guest@example.com")
                .role(UserRole.CLIENT).build()));
        when(reservationService.createReservation(any())).thenReturn(reservationResponseStub());

        service.createStayBooking(baseRequest());

        ArgumentCaptor<ReservationRequest> captor = ArgumentCaptor.forClass(ReservationRequest.class);
        verify(reservationService).createReservation(captor.capture());
        // Lands in the existing account, so it shows in their space.
        assertThat(captor.getValue().getUserId()).isEqualTo(existingId);
        // No second identity, and no setup invitation to an account that already has a password.
        verify(keycloakUserSyncService, org.mockito.Mockito.never())
                .createInvitedGuestUser(any(), any(), any());
        verify(accountActionService, org.mockito.Mockito.never())
                .sendGuestPasswordSetupInvitation(any(), any());
    }

    @Test
    void aTeamAccountEmailIsNeverUsedForAPublicBooking() {
        when(tourTypeRepository.findBySlugAndIsActiveTrue("nuitee-campement-desert"))
                .thenReturn(Optional.of(TourType.builder().tourTypeId(tourTypeId).build()));
        when(userRepository.findByEmail("guest@example.com")).thenReturn(Optional.of(User.builder()
                .userId(UUID.randomUUID()).email("guest@example.com").role(UserRole.ADMIN).build()));

        assertThatThrownBy(() -> service.createStayBooking(baseRequest()))
                .isInstanceOf(com.camping.duneinsolite.exception.ConflictException.class)
                .hasMessageContaining("team account");

        verify(reservationService, org.mockito.Mockito.never()).createReservation(any());
        verify(keycloakUserSyncService, org.mockito.Mockito.never())
                .createInvitedGuestUser(any(), any(), any());
    }
}
