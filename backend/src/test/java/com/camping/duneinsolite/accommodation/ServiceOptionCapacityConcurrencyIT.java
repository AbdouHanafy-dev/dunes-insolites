package com.camping.duneinsolite.accommodation;

import com.camping.duneinsolite.dto.request.ReservationRequest;
import com.camping.duneinsolite.dto.request.ReservationExtraRequest;
import com.camping.duneinsolite.dto.request.TourTypeSelectionRequest;
import com.camping.duneinsolite.exception.ReservationValidationException;
import com.camping.duneinsolite.exception.ActivityUnavailableException;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.ReservationService;
import com.camping.duneinsolite.service.PublicAvailabilityService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.rabbitmq.RabbitMQContainer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Guide/transport capacity, guide-required, pickup-required and
 * guide-in-own-vehicle/transport mutual exclusion - all enforced in
 * ReservationServiceImpl. The concurrency test is the same technique as
 * {@link ExtraCapacityConcurrencyIT} / {@link SitewideCapacityConcurrencyIT}:
 * a FOR UPDATE row lock, proven by two real concurrent requests that
 * together overflow capacity.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false",
        "app.reservation.hold-expiry-sweep-ms=3600000",
        "spring.datasource.hikari.maximum-pool-size=8"
})
@Testcontainers
class ServiceOptionCapacityConcurrencyIT {

    @Container static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");
    @Container static final RabbitMQContainer RABBIT = new RabbitMQContainer("rabbitmq:3-management");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        r.add("spring.datasource.username", POSTGRES::getUsername);
        r.add("spring.datasource.password", POSTGRES::getPassword);
        r.add("spring.rabbitmq.host", RABBIT::getHost);
        r.add("spring.rabbitmq.port", RABBIT::getAmqpPort);
        r.add("spring.rabbitmq.username", RABBIT::getAdminUsername);
        r.add("spring.rabbitmq.password", RABBIT::getAdminPassword);
    }

    @MockitoBean JavaMailSender mailSender;
    @MockitoBean KeycloakUserSyncService keycloakUserSyncService;

    @Autowired ReservationService reservationService;
    @Autowired PublicAvailabilityService publicAvailabilityService;
    @Autowired TourTypeRepository tourTypeRepository;
    @Autowired ReservationRepository reservationRepository;
    @Autowired UserRepository userRepository;
    @Autowired SourceRepository sourceRepository;
    @Autowired InvoiceRepository invoiceRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired ExtraRepository extraRepository;
    @Autowired ReservationExtraRepository reservationExtraRepository;
    @Autowired ExtraResourceRequirementRepository extraResourceRequirementRepository;

    private UUID guideOptionId;
    private UUID hotelPickupId;
    private UUID guideInVehicleId;
    private User user;
    private Source source;
    private final LocalDate date = LocalDate.now().plusDays(70);

    @BeforeEach
    void seed() {
        source = sourceRepository.findByName("Site web")
                .orElseGet(() -> sourceRepository.save(Source.builder().name("Site web").build()));
        user = userRepository.save(User.builder().userId(UUID.randomUUID())
                .name("G").email("g" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build());

        guideOptionId = extraRepository.save(Extra.builder()
                .slug("guide-support-" + UUID.randomUUID()).name("Guide with Support Vehicle")
                .category(ExtraCategory.GUIDE).serviceType("GUIDE_WITH_SUPPORT_VEHICLE")
                .pricingUnit(PricingUnit.PER_UNIT).unitPrice(new BigDecimal("100.000"))
                .tva(BigDecimal.ZERO).maxUnitsPerDay(4).isActive(true).build()).getExtraId();

        hotelPickupId = extraRepository.save(Extra.builder()
                .slug("hotel-pickup-" + UUID.randomUUID()).name("Hotel Pickup")
                .category(ExtraCategory.TRANSPORT).serviceType("HOTEL_PICKUP")
                .pricingUnit(PricingUnit.PER_BOOKING).unitPrice(new BigDecimal("80.000"))
                .tva(BigDecimal.ZERO).pickupFields(java.util.Set.of(PickupField.HOTEL_NAME))
                .requiredPickupFields(java.util.Set.of(PickupField.HOTEL_NAME))
                .isActive(true).build()).getExtraId();

        guideInVehicleId = extraRepository.save(Extra.builder()
                .slug("guide-in-vehicle-" + UUID.randomUUID()).name("Guide in Your Vehicle")
                .category(ExtraCategory.GUIDE).serviceType("GUIDE_IN_CUSTOMER_VEHICLE")
                .pricingUnit(PricingUnit.PER_DAY).unitPrice(new BigDecimal("70.000"))
                .tva(BigDecimal.ZERO).requiresCustomerVehicle(true).isActive(true).build()).getExtraId();
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        transactionRepository.deleteAll();
        invoiceRepository.deleteAll();
        reservationRepository.deleteAll();
        userRepository.deleteAll();
        extraResourceRequirementRepository.deleteAll();
        extraRepository.deleteAll();
        tourTypeRepository.deleteAll();
    }

    private ReservationRequest extrasOnlyRequestWithGuide(UUID optionId, int quantity) {
        ReservationRequest req = new ReservationRequest();
        req.setUserId(user.getUserId());
        req.setSourceId(source.getSourceId());
        req.setReservationType(ReservationType.EXTRAS);
        req.setServiceDate(date);
        req.setNumberOfAdults(2);
        req.setNumberOfChildren(0);

        ReservationExtraRequest opt = new ReservationExtraRequest();
        opt.setExtraId(optionId);
        opt.setQuantity(quantity);
        opt.setActivityDate(date);
        req.setExtras(List.of(opt));
        return req;
    }

    @Test
    void aNormalGuideBookingSucceeds() {
        var response = reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 1));
        List<ReservationExtra> lines = reservationExtraRepository
                .findByReservationReservationId(response.getReservationId());
        assertThat(lines).filteredOn(line -> !line.isResourceAllocation()).hasSize(1)
                .first().extracting(ReservationExtra::getTotalPrice).isEqualTo(new BigDecimal("100.000"));
    }

    @Test
    void requestingMoreGuidesThanCapacityIsRejected() {
        assertThatThrownBy(() -> reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 5)))
                .isInstanceOf(ActivityUnavailableException.class);
    }

    @Test
    void twoBookingsThatBothFitAreAccepted() {
        reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 2));
        reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 2)); // 2+2 == 4, fits
        long total = reservationExtraRepository.findByIsActiveTrue().stream()
                .filter(ReservationExtra::isResourceAllocation)
                .filter(o -> guideOptionId.equals(o.getCatalogExtraId()))
                .mapToInt(ReservationExtra::getQuantity).sum();
        assertThat(total).isEqualTo(4);
    }

    @Test
    void twoConcurrentBookingsThatTogetherOverflowCapacity_onlyOneWins() throws Exception {
        // 4 guides total. Two guests each want 3 at almost the same instant.
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier start = new CyclicBarrier(2);
        AtomicInteger ok = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        AtomicInteger other = new AtomicInteger();

        for (int i = 0; i < 2; i++) {
            pool.submit(() -> {
                try {
                    start.await(5, TimeUnit.SECONDS);
                    reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 3));
                    ok.incrementAndGet();
                } catch (ActivityUnavailableException e) {
                    rejected.incrementAndGet();
                } catch (Exception e) {
                    other.incrementAndGet();
                }
                return null;
            });
        }
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        assertThat(ok.get()).as("only one overflowing request wins").isEqualTo(1);
        assertThat(rejected.get()).as("the other is rejected on capacity").isEqualTo(1);
        assertThat(other.get()).as("no unexpected failures").isZero();

        long consumed = reservationExtraRepository.findByIsActiveTrue().stream()
                .filter(ReservationExtra::isResourceAllocation)
                .filter(o -> guideOptionId.equals(o.getCatalogExtraId()))
                .mapToInt(ReservationExtra::getQuantity).sum();
        assertThat(consumed).as("4 can never become more than 4").isLessThanOrEqualTo(4);
    }

    @Test
    void cancellingAReservationFreesItsCapacity() {
        var first = reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 4)); // takes all 4
        assertThatThrownBy(() -> reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 1)))
                .isInstanceOf(ActivityUnavailableException.class);

        Reservation reservation = reservationRepository.findById(first.getReservationId()).orElseThrow();
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        var second = reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 4));
        assertThat(second).isNotNull();
    }

    @Test
    void pickupOptionWithoutPickupDetailsIsRejected() {
        ReservationRequest req = new ReservationRequest();
        req.setUserId(user.getUserId());
        req.setSourceId(source.getSourceId());
        req.setReservationType(ReservationType.EXTRAS);
        req.setServiceDate(date);
        req.setNumberOfAdults(2);
        req.setNumberOfChildren(0);
        ReservationExtraRequest opt = new ReservationExtraRequest();
        opt.setExtraId(hotelPickupId);
        opt.setActivityDate(date);
        // No hotel name / address / instructions supplied at all.
        req.setExtras(List.of(opt));

        assertThatThrownBy(() -> reservationService.createReservation(req))
                .isInstanceOf(ReservationValidationException.class)
                .hasMessageContaining("HOTEL_NAME");
    }

    @Test
    void pickupOptionWithDetailsSucceeds() {
        ReservationRequest req = new ReservationRequest();
        req.setUserId(user.getUserId());
        req.setSourceId(source.getSourceId());
        req.setReservationType(ReservationType.EXTRAS);
        req.setServiceDate(date);
        req.setNumberOfAdults(2);
        req.setNumberOfChildren(0);
        ReservationExtraRequest opt = new ReservationExtraRequest();
        opt.setExtraId(hotelPickupId);
        opt.setActivityDate(date);
        opt.setPickupHotelName("Sabria Palace");
        opt.setPickupInstructions("Lobby at 7am");
        req.setExtras(List.of(opt));

        var response = reservationService.createReservation(req);
        List<ReservationExtra> lines = reservationExtraRepository
                .findByReservationReservationId(response.getReservationId());
        assertThat(lines).filteredOn(line -> !line.isResourceAllocation()).hasSize(1)
                .first().extracting(line -> line.getPickupDetails().getHotelName()).isEqualTo("Sabria Palace");
    }

    @Test
    void guideInOwnVehicleCombinedWithTransportIsRejected() {
        ReservationRequest req = new ReservationRequest();
        req.setUserId(user.getUserId());
        req.setSourceId(source.getSourceId());
        req.setReservationType(ReservationType.EXTRAS);
        req.setServiceDate(date);
        req.setNumberOfAdults(2);
        req.setNumberOfChildren(0);

        ReservationExtraRequest guide = new ReservationExtraRequest();
        guide.setExtraId(guideInVehicleId);
        guide.setActivityDate(date);

        ReservationExtraRequest pickup = new ReservationExtraRequest();
        pickup.setExtraId(hotelPickupId);
        pickup.setActivityDate(date);
        pickup.setPickupHotelName("Sabria Palace");

        req.setExtras(List.of(guide, pickup));

        assertThatThrownBy(() -> reservationService.createReservation(req))
                .isInstanceOf(ReservationValidationException.class)
                .hasMessageContaining("can't be combined");
    }

    @Test
    void severalServiceExtrasInOneReservationAreEachCheckedIndependently() {
        ReservationRequest req = new ReservationRequest();
        req.setUserId(user.getUserId());
        req.setSourceId(source.getSourceId());
        req.setReservationType(ReservationType.EXTRAS);
        req.setServiceDate(date);
        req.setNumberOfAdults(2);
        req.setNumberOfChildren(0);

        ReservationExtraRequest guide = new ReservationExtraRequest();
        guide.setExtraId(guideOptionId);
        guide.setQuantity(1);
        guide.setActivityDate(date);

        ReservationExtraRequest pickup = new ReservationExtraRequest();
        pickup.setExtraId(hotelPickupId);
        pickup.setActivityDate(date);
        pickup.setPickupHotelName("Sabria Palace");

        req.setExtras(List.of(guide, pickup));

        var response = reservationService.createReservation(req);
        List<ReservationExtra> lines = reservationExtraRepository
                .findByReservationReservationId(response.getReservationId());
        assertThat(lines).filteredOn(line -> !line.isResourceAllocation()).hasSize(2);
    }

    @Test
    void aStayThatRequiresAGuide_cannotBeBookedWithoutOne() {
        String staySlug = "gr-" + UUID.randomUUID();
        TourType stay = tourTypeRepository.save(TourType.builder()
                .name("Guided nuitée").slug(staySlug).isActive(true).guideRequired(true)
                .passengerAdultPrice(new BigDecimal("100")).passengerChildPrice(new BigDecimal("100"))
                .partnerAdultPrice(new BigDecimal("100")).partnerChildPrice(new BigDecimal("100"))
                .tva(BigDecimal.ZERO).build());

        ReservationRequest req = new ReservationRequest();
        req.setUserId(user.getUserId());
        req.setSourceId(source.getSourceId());
        req.setReservationType(ReservationType.HEBERGEMENT);
        req.setCheckInDate(date);
        req.setCheckOutDate(date.plusDays(1));
        req.setNumberOfAdults(2);
        req.setNumberOfChildren(0);

        TourTypeSelectionRequest selection = new TourTypeSelectionRequest();
        selection.setTourTypeId(stay.getTourTypeId());
        selection.setNumberOfAdults(2);
        selection.setNumberOfChildren(0);
        selection.setActivityDate(date);
        req.setTourTypes(List.of(selection));
        // No GUIDE-category extra at all - guide is required, must be rejected.

        assertThatThrownBy(() -> reservationService.createReservation(req))
                .isInstanceOf(ReservationValidationException.class)
                .hasMessageContaining("requires an accompanying guide");
    }

    @Test
    void aStayThatRequiresAGuide_succeedsOnceOneIsChosen() {
        String staySlug = "gr-" + UUID.randomUUID();
        TourType stay = tourTypeRepository.save(TourType.builder()
                .name("Guided nuitée").slug(staySlug).isActive(true).guideRequired(true)
                .passengerAdultPrice(new BigDecimal("100")).passengerChildPrice(new BigDecimal("100"))
                .partnerAdultPrice(new BigDecimal("100")).partnerChildPrice(new BigDecimal("100"))
                .tva(BigDecimal.ZERO).build());

        ReservationRequest req = new ReservationRequest();
        req.setUserId(user.getUserId());
        req.setSourceId(source.getSourceId());
        req.setReservationType(ReservationType.HEBERGEMENT);
        req.setCheckInDate(date);
        req.setCheckOutDate(date.plusDays(1));
        req.setNumberOfAdults(2);
        req.setNumberOfChildren(0);

        TourTypeSelectionRequest selection = new TourTypeSelectionRequest();
        selection.setTourTypeId(stay.getTourTypeId());
        selection.setNumberOfAdults(2);
        selection.setNumberOfChildren(0);
        selection.setActivityDate(date);
        req.setTourTypes(List.of(selection));

        ReservationExtraRequest guide = new ReservationExtraRequest();
        guide.setExtraId(guideOptionId);
        guide.setQuantity(1);
        guide.setActivityDate(date);
        req.setExtras(List.of(guide));

        var response = reservationService.createReservation(req);
        assertThat(response.getReservationId()).isNotNull();
    }

    private Extra compositeGuide(int guideCapacity, int vehicleCapacity) {
        Extra guide = extraRepository.save(Extra.builder().name("Guide resource " + UUID.randomUUID())
                .slug("guide-resource-" + UUID.randomUUID()).unitPrice(BigDecimal.ZERO)
                .tva(BigDecimal.ZERO).category(ExtraCategory.RESOURCE).pricingUnit(PricingUnit.PER_UNIT)
                .maxUnitsPerDay(guideCapacity).isActive(true).build());
        Extra vehicle = extraRepository.save(Extra.builder().name("Vehicle resource " + UUID.randomUUID())
                .slug("vehicle-resource-" + UUID.randomUUID()).unitPrice(BigDecimal.ZERO)
                .tva(BigDecimal.ZERO).category(ExtraCategory.RESOURCE).pricingUnit(PricingUnit.PER_UNIT)
                .maxUnitsPerDay(vehicleCapacity).isActive(true).build());
        Extra option = Extra.builder().name("Guide + support vehicle")
                .slug("composite-guide-" + UUID.randomUUID()).unitPrice(new BigDecimal("100"))
                .tva(BigDecimal.ZERO).category(ExtraCategory.GUIDE).pricingUnit(PricingUnit.PER_DAY)
                .isActive(true).build();
        option.getResourceRequirements().add(ExtraResourceRequirement.builder()
                .extra(option).resource(guide).quantity(1).build());
        option.getResourceRequirements().add(ExtraResourceRequirement.builder()
                .extra(option).resource(vehicle).quantity(1).build());
        return extraRepository.save(option);
    }

    private ReservationRequest requestWithExtra(UUID extraId) {
        ReservationRequest req = new ReservationRequest();
        req.setUserId(user.getUserId());
        req.setSourceId(source.getSourceId());
        req.setReservationType(ReservationType.EXTRAS);
        req.setServiceDate(date);
        req.setNumberOfAdults(1);
        req.setNumberOfChildren(0);
        var line = new com.camping.duneinsolite.dto.request.ReservationExtraRequest();
        line.setExtraId(extraId);
        line.setQuantity(1);
        line.setActivityDate(date);
        req.setExtras(List.of(line));
        return req;
    }

    @Test
    void compositeGuideRollsBackWhenVehicleIsUnavailable() {
        Extra option = compositeGuide(1, 0);
        long before = reservationExtraRepository.count();

        assertThat(publicAvailabilityService.forServiceOption(option.getSlug(), date).status())
                .isEqualTo("UNAVAILABLE");

        assertThatThrownBy(() -> reservationService.createReservation(requestWithExtra(option.getExtraId())))
                .isInstanceOf(com.camping.duneinsolite.exception.ActivityUnavailableException.class);
        assertThat(reservationExtraRepository.count()).isEqualTo(before);
    }

    @Test
    void compositeGuideRollsBackWhenGuideIsUnavailable() {
        Extra option = compositeGuide(0, 1);
        long before = reservationExtraRepository.count();

        assertThatThrownBy(() -> reservationService.createReservation(requestWithExtra(option.getExtraId())))
                .isInstanceOf(ActivityUnavailableException.class);
        assertThat(reservationExtraRepository.count()).isEqualTo(before);
    }

    @Test
    void airportPickupStoresOnlyConfiguredPickupSnapshot() {
        Extra airport = extraRepository.save(Extra.builder().name("Airport pickup")
                .slug("airport-" + UUID.randomUUID()).unitPrice(new BigDecimal("80"))
                .tva(BigDecimal.ZERO).category(ExtraCategory.TRANSPORT)
                .serviceType("AIRPORT_PICKUP").pricingUnit(PricingUnit.PER_BOOKING)
                .pickupFields(java.util.Set.of(PickupField.AIRPORT, PickupField.FLIGHT_NUMBER))
                .requiredPickupFields(java.util.Set.of(PickupField.AIRPORT)).isActive(true).build());
        ReservationRequest request = requestWithExtra(airport.getExtraId());
        request.getExtras().get(0).setPickupAirport("Tunis-Carthage");
        request.getExtras().get(0).setPickupFlightNumber("TU 723");

        var response = reservationService.createReservation(request);
        ReservationExtra snapshot = reservationExtraRepository
                .findByReservationReservationId(response.getReservationId()).stream()
                .filter(line -> !line.isResourceAllocation()).findFirst().orElseThrow();
        assertThat(snapshot.getPickupDetails().getAirport()).isEqualTo("Tunis-Carthage");
        assertThat(snapshot.getPickupDetails().getFlightNumber()).isEqualTo("TU 723");
        assertThat(snapshot.getUnitPrice()).isEqualByComparingTo("80.000");
    }

    @Test
    void meetingPointPickupRequiresConfiguredAddress() {
        Extra meeting = extraRepository.save(Extra.builder().name("Meeting point")
                .slug("meeting-" + UUID.randomUUID()).unitPrice(new BigDecimal("25"))
                .tva(BigDecimal.ZERO).category(ExtraCategory.TRANSPORT)
                .serviceType("MEETING_POINT").pricingUnit(PricingUnit.PER_BOOKING)
                .pickupFields(java.util.Set.of(PickupField.ADDRESS, PickupField.INSTRUCTIONS))
                .requiredPickupFields(java.util.Set.of(PickupField.ADDRESS)).isActive(true).build());

        assertThatThrownBy(() -> reservationService.createReservation(requestWithExtra(meeting.getExtraId())))
                .isInstanceOf(ReservationValidationException.class).hasMessageContaining("ADDRESS");
    }

    @Test
    void transportCapacityUsesTheSharedExtraInventory() {
        Extra transfer = extraRepository.save(Extra.builder().name("Private transfer")
                .slug("transfer-" + UUID.randomUUID()).unitPrice(new BigDecimal("90"))
                .tva(BigDecimal.ZERO).category(ExtraCategory.TRANSPORT)
                .serviceType("PRIVATE_TRANSFER").pricingUnit(PricingUnit.PER_BOOKING)
                .maxUnitsPerDay(1).isActive(true).build());

        reservationService.createReservation(requestWithExtra(transfer.getExtraId()));
        assertThatThrownBy(() -> reservationService.createReservation(requestWithExtra(transfer.getExtraId())))
                .isInstanceOf(ActivityUnavailableException.class);
    }

    @Test
    void concurrentCompositeGuideBookingsOnlyOneWins() throws Exception {
        Extra option = compositeGuide(1, 1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier start = new CyclicBarrier(2);
        AtomicInteger accepted = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        for (int i = 0; i < 2; i++) pool.submit(() -> {
            try {
                start.await(5, TimeUnit.SECONDS);
                reservationService.createReservation(requestWithExtra(option.getExtraId()));
                accepted.incrementAndGet();
            } catch (com.camping.duneinsolite.exception.ActivityUnavailableException ex) {
                rejected.incrementAndGet();
            } catch (Exception ignored) { }
        });
        pool.shutdown();
        assertThat(pool.awaitTermination(20, TimeUnit.SECONDS)).isTrue();
        assertThat(accepted.get()).isEqualTo(1);
        assertThat(rejected.get()).isEqualTo(1);
        assertThat(publicAvailabilityService.forServiceOption(option.getSlug(), date).unitsAvailable())
                .isZero();
    }
}
