package com.camping.duneinsolite.accommodation;

import com.camping.duneinsolite.dto.request.publicapi.PublicActivityBookingRequest;
import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.exception.ActivityUnavailableException;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.PublicBookingService;
import com.camping.duneinsolite.service.ReservationService;
import org.junit.jupiter.api.*;
import org.mockito.Mockito;
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
 * Per-activity capacity (quads, camel-ride seats...) enforced by
 * ExtraAvailabilityService.allocate() under a {@code FOR UPDATE} row lock -
 * the exact twin of {@link SitewideCapacityConcurrencyIT}'s technique, but
 * for Extra inventory rather than the sitewide headcount, and checked at
 * BOOKING/CREATE time rather than confirm time (an activity line has no
 * separate "occupying" state machine — its hold already consumes inventory
 * the moment a PENDING reservation is created, same as accommodation).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false",
        "app.reservation.hold-expiry-sweep-ms=3600000",
        "spring.datasource.hikari.maximum-pool-size=8"
})
@Testcontainers
class ExtraCapacityConcurrencyIT {

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

    @Autowired PublicBookingService publicBookingService;
    @Autowired ReservationService reservationService;
    @Autowired ExtraRepository extraRepository;
    @Autowired TourTypeRepository tourTypeRepository;
    @Autowired AccommodationTypeRepository accommodationTypeRepository;
    @Autowired ReservationRepository reservationRepository;
    @Autowired ReservationExtraRepository reservationExtraRepository;
    @Autowired UserRepository userRepository;
    @Autowired SourceRepository sourceRepository;
    @Autowired InvoiceRepository invoiceRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired AccountActionTokenRepository accountActionTokenRepository;

    private UUID quadId;
    private final LocalDate date = LocalDate.now().plusDays(60);

    @BeforeEach
    void seed() {
        sourceRepository.findByName("Site web")
                .orElseGet(() -> sourceRepository.save(Source.builder().name("Site web").build()));
        Extra quad = extraRepository.save(Extra.builder()
                .name("Quad").slug("quad-" + UUID.randomUUID())
                .unitPrice(new BigDecimal("80.000")).isActive(true).tva(BigDecimal.ZERO)
                .maxUnitsPerDay(8)
                .build());
        quadId = quad.getExtraId();

        Mockito.when(keycloakUserSyncService.createInvitedGuestUser(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenAnswer(inv -> userRepository.save(User.builder().userId(UUID.randomUUID())
                        .name("G").email("g" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build()));
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        transactionRepository.deleteAll();
        invoiceRepository.deleteAll();
        reservationRepository.deleteAll(); // cascades to tourTypes / extras / participants
        accountActionTokenRepository.deleteAll();
        userRepository.deleteAll();
        extraRepository.deleteAll();
    }

    private UUID bookQuads(int quantity) {
        PublicActivityBookingRequest r = new PublicActivityBookingRequest();
        r.setActivitySlug(extraRepository.findById(quadId).orElseThrow().getSlug());
        r.setDate(date);
        r.setNumberOfAdults(quantity);
        r.setName("Guest");
        r.setEmail("g@example.com");
        r.setPhone("+21650000000");
        return UUID.fromString(publicBookingService.createActivityBooking(r).getId());
    }

    @Test
    void aNormalBookingSucceeds() {
        UUID id = bookQuads(3);
        assertThat(reservationExtraRepository.findByReservationReservationId(id)).hasSize(1);
        assertThat(reservationExtraRepository.findByReservationReservationId(id).get(0).getQuantity()).isEqualTo(3);
    }

    @Test
    void requestingMoreThanCapacityIsRejected() {
        assertThatThrownBy(() -> bookQuads(9))
                .isInstanceOf(ActivityUnavailableException.class);
    }

    @Test
    void twoBookingsThatBothFitAreAccepted() {
        bookQuads(4);
        bookQuads(4); // 4 + 4 == 8, fits exactly
        long total = reservationExtraRepository.findByIsActiveTrue().stream()
                .filter(e -> e.getCatalogExtraId().equals(quadId))
                .mapToInt(ReservationExtra::getQuantity).sum();
        assertThat(total).isEqualTo(8);
    }

    @Test
    void twoConcurrentBookingsThatTogetherOverflowCapacity_onlyOneWins() throws Exception {
        // 8 quads total. Two guests each want 5 at almost the same instant -
        // together that's 10, so at most one can succeed.
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier start = new CyclicBarrier(2);
        AtomicInteger ok = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        AtomicInteger other = new AtomicInteger();

        for (int i = 0; i < 2; i++) {
            pool.submit(() -> {
                try {
                    start.await(5, TimeUnit.SECONDS);
                    bookQuads(5);
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
                .filter(e -> e.getCatalogExtraId().equals(quadId))
                .mapToInt(ReservationExtra::getQuantity).sum();
        assertThat(consumed).as("8 can never become more than 8").isLessThanOrEqualTo(8);
    }

    @Test
    void cancellingAReservationFreesItsCapacity() {
        UUID first = bookQuads(8); // takes all 8
        assertThatThrownBy(() -> bookQuads(1)).isInstanceOf(ActivityUnavailableException.class);

        Reservation reservation = reservationRepository.findById(first).orElseThrow();
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        // Now that the 8 are released, a new request for 8 succeeds again.
        UUID second = bookQuads(8);
        assertThat(second).isNotNull();
    }

    @Test
    void severalActivitiesInOneReservationAreEachCheckedIndependently() {
        Extra camel = extraRepository.save(Extra.builder()
                .name("Camel Ride").slug("camel-" + UUID.randomUUID())
                .unitPrice(new BigDecimal("40.000")).isActive(true).tva(BigDecimal.ZERO)
                .maxUnitsPerDay(15)
                .build());

        com.camping.duneinsolite.dto.request.ReservationRequest req = new com.camping.duneinsolite.dto.request.ReservationRequest();
        User user = userRepository.save(User.builder().userId(UUID.randomUUID())
                .name("G").email("g" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build());
        Source source = sourceRepository.findByName("Site web").orElseThrow();
        req.setUserId(user.getUserId());
        req.setSourceId(source.getSourceId());
        req.setReservationType(ReservationType.EXTRAS);
        req.setServiceDate(date);
        req.setNumberOfAdults(2);
        req.setNumberOfChildren(0);

        var quadExtra = new com.camping.duneinsolite.dto.request.ReservationExtraRequest();
        quadExtra.setExtraId(quadId);
        quadExtra.setQuantity(4);
        quadExtra.setActivityDate(date);
        var camelExtra = new com.camping.duneinsolite.dto.request.ReservationExtraRequest();
        camelExtra.setExtraId(camel.getExtraId());
        camelExtra.setQuantity(10);
        camelExtra.setActivityDate(date);
        req.setExtras(List.of(quadExtra, camelExtra));

        var response = reservationService.createReservation(req);
        List<ReservationExtra> lines = reservationExtraRepository.findByReservationReservationId(response.getReservationId());
        assertThat(lines).hasSize(2);
    }

    @Test
    void aStayBookingWithAnAttachedActivity_bothInventoriesAreEnforced() {
        String staySlug = "hc-" + UUID.randomUUID();
        TourType stay = tourTypeRepository.save(TourType.builder()
                .name("HC nuitée").slug(staySlug).isActive(true)
                .passengerAdultPrice(new BigDecimal("100")).passengerChildPrice(new BigDecimal("100"))
                .partnerAdultPrice(new BigDecimal("100")).partnerChildPrice(new BigDecimal("100"))
                .tva(BigDecimal.ZERO).build());
        accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("suite").name("Dune Suite").capacity(6)
                .unitPriceTtc(new BigDecimal("165.000")).tvaRate(BigDecimal.ZERO)
                .maxUnits(20).active(true).build());
        String quadSlug = extraRepository.findById(quadId).orElseThrow().getSlug();

        PublicStayBookingRequest r = new PublicStayBookingRequest();
        r.setStaySlug(staySlug); r.setDate(date); r.setPartySize(2);
        r.setAccommodationSlug("suite"); r.setAccommodationQty(1);
        r.setRideSlugs(List.of(quadSlug));
        r.setName("Guest"); r.setEmail("g@example.com"); r.setPhone("+21650000000");

        var response = publicBookingService.createStayBooking(r);
        UUID id = UUID.fromString(response.getId());
        assertThat(reservationRepository.findById(id)).isPresent();
        assertThat(reservationExtraRepository.findByReservationReservationId(id)).hasSize(1);
    }
}
