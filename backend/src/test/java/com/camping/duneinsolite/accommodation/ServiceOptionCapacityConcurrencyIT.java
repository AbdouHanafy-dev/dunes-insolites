package com.camping.duneinsolite.accommodation;

import com.camping.duneinsolite.dto.request.ReservationRequest;
import com.camping.duneinsolite.dto.request.ReservationServiceOptionRequest;
import com.camping.duneinsolite.dto.request.TourTypeSelectionRequest;
import com.camping.duneinsolite.exception.ReservationValidationException;
import com.camping.duneinsolite.exception.ServiceOptionUnavailableException;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.ReservationService;
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
    @Autowired ServiceOptionRepository serviceOptionRepository;
    @Autowired TourTypeRepository tourTypeRepository;
    @Autowired ReservationRepository reservationRepository;
    @Autowired ReservationServiceOptionRepository reservationServiceOptionRepository;
    @Autowired UserRepository userRepository;
    @Autowired SourceRepository sourceRepository;
    @Autowired InvoiceRepository invoiceRepository;
    @Autowired TransactionRepository transactionRepository;

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

        guideOptionId = serviceOptionRepository.save(ServiceOption.builder()
                .slug("guide-support-" + UUID.randomUUID()).name("Guide with Support Vehicle")
                .category(ServiceOptionCategory.GUIDE).type("GUIDE_WITH_SUPPORT_VEHICLE")
                .pricingUnit(PricingUnit.PER_DAY).unitPriceTtc(new BigDecimal("100.000"))
                .tvaRate(BigDecimal.ZERO).maxUnitsPerDay(4).active(true).build()).getId();

        hotelPickupId = serviceOptionRepository.save(ServiceOption.builder()
                .slug("hotel-pickup-" + UUID.randomUUID()).name("Hotel Pickup")
                .category(ServiceOptionCategory.TRANSPORT).type("HOTEL_PICKUP")
                .pricingUnit(PricingUnit.PER_BOOKING).unitPriceTtc(new BigDecimal("80.000"))
                .tvaRate(BigDecimal.ZERO).requiresPickupLocation(true).active(true).build()).getId();

        guideInVehicleId = serviceOptionRepository.save(ServiceOption.builder()
                .slug("guide-in-vehicle-" + UUID.randomUUID()).name("Guide in Your Vehicle")
                .category(ServiceOptionCategory.GUIDE).type("GUIDE_IN_CUSTOMER_VEHICLE")
                .pricingUnit(PricingUnit.PER_DAY).unitPriceTtc(new BigDecimal("70.000"))
                .tvaRate(BigDecimal.ZERO).requiresCustomerVehicle(true).active(true).build()).getId();
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        transactionRepository.deleteAll();
        invoiceRepository.deleteAll();
        reservationRepository.deleteAll();
        userRepository.deleteAll();
        serviceOptionRepository.deleteAll();
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

        ReservationServiceOptionRequest opt = new ReservationServiceOptionRequest();
        opt.setServiceOptionId(optionId);
        opt.setQuantity(quantity);
        opt.setServiceDate(date);
        req.setServiceOptions(List.of(opt));
        return req;
    }

    @Test
    void aNormalGuideBookingSucceeds() {
        var response = reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 1));
        List<ReservationServiceOption> lines = reservationServiceOptionRepository
                .findByReservationReservationId(response.getReservationId());
        assertThat(lines).hasSize(1);
        assertThat(lines.get(0).getTotalPrice()).isEqualByComparingTo("100.000");
    }

    @Test
    void requestingMoreGuidesThanCapacityIsRejected() {
        assertThatThrownBy(() -> reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 5)))
                .isInstanceOf(ServiceOptionUnavailableException.class);
    }

    @Test
    void twoBookingsThatBothFitAreAccepted() {
        reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 2));
        reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 2)); // 2+2 == 4, fits
        long total = reservationServiceOptionRepository.findByIsActiveTrue().stream()
                .filter(o -> o.getCatalogServiceOptionId().equals(guideOptionId))
                .mapToInt(ReservationServiceOption::getQuantity).sum();
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
                } catch (ServiceOptionUnavailableException e) {
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

        long consumed = reservationServiceOptionRepository.findByIsActiveTrue().stream()
                .filter(o -> o.getCatalogServiceOptionId().equals(guideOptionId))
                .mapToInt(ReservationServiceOption::getQuantity).sum();
        assertThat(consumed).as("4 can never become more than 4").isLessThanOrEqualTo(4);
    }

    @Test
    void cancellingAReservationFreesItsCapacity() {
        var first = reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 4)); // takes all 4
        assertThatThrownBy(() -> reservationService.createReservation(extrasOnlyRequestWithGuide(guideOptionId, 1)))
                .isInstanceOf(ServiceOptionUnavailableException.class);

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
        ReservationServiceOptionRequest opt = new ReservationServiceOptionRequest();
        opt.setServiceOptionId(hotelPickupId);
        opt.setServiceDate(date);
        // No hotel name / address / instructions supplied at all.
        req.setServiceOptions(List.of(opt));

        assertThatThrownBy(() -> reservationService.createReservation(req))
                .isInstanceOf(ReservationValidationException.class)
                .hasMessageContaining("pickup details");
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
        ReservationServiceOptionRequest opt = new ReservationServiceOptionRequest();
        opt.setServiceOptionId(hotelPickupId);
        opt.setServiceDate(date);
        opt.setPickupHotelName("Sabria Palace");
        opt.setPickupInstructions("Lobby at 7am");
        req.setServiceOptions(List.of(opt));

        var response = reservationService.createReservation(req);
        List<ReservationServiceOption> lines = reservationServiceOptionRepository
                .findByReservationReservationId(response.getReservationId());
        assertThat(lines).hasSize(1);
        assertThat(lines.get(0).getPickupDetails().getHotelName()).isEqualTo("Sabria Palace");
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

        ReservationServiceOptionRequest guide = new ReservationServiceOptionRequest();
        guide.setServiceOptionId(guideInVehicleId);
        guide.setServiceDate(date);

        ReservationServiceOptionRequest pickup = new ReservationServiceOptionRequest();
        pickup.setServiceOptionId(hotelPickupId);
        pickup.setServiceDate(date);
        pickup.setPickupHotelName("Sabria Palace");

        req.setServiceOptions(List.of(guide, pickup));

        assertThatThrownBy(() -> reservationService.createReservation(req))
                .isInstanceOf(ReservationValidationException.class)
                .hasMessageContaining("can't be combined");
    }

    @Test
    void severalServiceOptionsInOneReservationAreEachCheckedIndependently() {
        ReservationRequest req = new ReservationRequest();
        req.setUserId(user.getUserId());
        req.setSourceId(source.getSourceId());
        req.setReservationType(ReservationType.EXTRAS);
        req.setServiceDate(date);
        req.setNumberOfAdults(2);
        req.setNumberOfChildren(0);

        ReservationServiceOptionRequest guide = new ReservationServiceOptionRequest();
        guide.setServiceOptionId(guideOptionId);
        guide.setQuantity(1);
        guide.setServiceDate(date);

        ReservationServiceOptionRequest pickup = new ReservationServiceOptionRequest();
        pickup.setServiceOptionId(hotelPickupId);
        pickup.setServiceDate(date);
        pickup.setPickupHotelName("Sabria Palace");

        req.setServiceOptions(List.of(guide, pickup));

        var response = reservationService.createReservation(req);
        List<ReservationServiceOption> lines = reservationServiceOptionRepository
                .findByReservationReservationId(response.getReservationId());
        assertThat(lines).hasSize(2);
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
        // No serviceOptions at all - guide is required, must be rejected.

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

        ReservationServiceOptionRequest guide = new ReservationServiceOptionRequest();
        guide.setServiceOptionId(guideOptionId);
        guide.setQuantity(1);
        guide.setServiceDate(date);
        req.setServiceOptions(List.of(guide));

        var response = reservationService.createReservation(req);
        assertThat(response.getReservationId()).isNotNull();
    }
}
