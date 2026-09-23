package com.camping.duneinsolite.accommodation;

import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.exception.CapacityExceededException;
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

/**
 * The sitewide camp-capacity check ({@code CampingSettings.maxCapacity}) is a
 * coarser cap than per-tier inventory — total headcount across all tiers, and it
 * runs only when a reservation is <b>confirmed</b>. Its read-then-compare was
 * TOCTOU-prone; {@code ReservationCapacityValidator} now takes a
 * {@code PESSIMISTIC_WRITE} lock on the settings row before it reads the totals,
 * so two staff confirmations that together overflow the camp serialise and only
 * one wins.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false",
        "app.reservation.hold-expiry-sweep-ms=3600000",
        "spring.datasource.hikari.maximum-pool-size=8"
})
@Testcontainers
class SitewideCapacityConcurrencyIT {

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
    @Autowired TourTypeRepository tourTypeRepository;
    @Autowired AccommodationTypeRepository accommodationTypeRepository;
    @Autowired ReservationRepository reservationRepository;
    @Autowired UserRepository userRepository;
    @Autowired SourceRepository sourceRepository;
    @Autowired CampingSettingsRepository campingSettingsRepository;
    @Autowired InvoiceRepository invoiceRepository;
    @Autowired TransactionRepository transactionRepository;
    @Autowired AccountActionTokenRepository accountActionTokenRepository;

    private String staySlug;
    private final LocalDate date = LocalDate.now().plusDays(50);

    @BeforeEach
    void seed() {
        staySlug = "swc-" + UUID.randomUUID();
        sourceRepository.findByName("Site web")
                .orElseGet(() -> sourceRepository.save(Source.builder().name("Site web").build()));
        TourType stay = tourTypeRepository.save(TourType.builder()
                .name("SWC nuitée").slug(staySlug).isActive(true)
                .passengerAdultPrice(new BigDecimal("100")).passengerChildPrice(new BigDecimal("100"))
                .partnerAdultPrice(new BigDecimal("100")).partnerChildPrice(new BigDecimal("100"))
                .tva(BigDecimal.ZERO).build());
        accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("suite").name("Dune Suite").capacity(6)
                .unitPriceTtc(new BigDecimal("165.000")).tvaRate(BigDecimal.ZERO)
                .maxUnits(20).active(true).build());   // per-tier lock must not be the limiter

        // Camp holds 5. Each booking below is 2 adults.
        campingSettingsRepository.save(CampingSettings.builder().id(1L).maxCapacity(5).build());

        Mockito.when(keycloakUserSyncService.createInvitedGuestUser(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenAnswer(inv -> userRepository.save(User.builder().userId(UUID.randomUUID())
                        .name("G").email("g" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build()));
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        transactionRepository.deleteAll();
        invoiceRepository.deleteAll();
        campingSettingsRepository.deleteAll();
        reservationRepository.deleteAll();   // cascades to tourTypes / extras / participants
        accountActionTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    private UUID book() {
        PublicStayBookingRequest r = new PublicStayBookingRequest();
        r.setStaySlug(staySlug); r.setDate(date); r.setPartySize(2);
        var accSelection = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        accSelection.setAccommodationSlug("suite"); accSelection.setQuantity(1);
        r.setAccommodations(java.util.List.of(accSelection));
        r.setName("Guest"); r.setEmail("g@example.com"); r.setPhone("+21650000000");
        return UUID.fromString(publicBookingService.createStayBooking(r).getId());
    }

    private void confirmAsStaff(UUID reservationId) {
        var ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(new TestingAuthenticationToken("staff", null, "ROLE_ADMIN"));
        SecurityContextHolder.setContext(ctx);
        try {
            reservationService.updateReservationStatus(
                    reservationId, ReservationStatus.CONFIRMED, null, CompanyType.DUNES_INSOLITES, null);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void twoConfirmationsThatTogetherOverflowTheCamp_onlyOneWins() throws Exception {
        // Seed 1 already-CONFIRMED reservation (2 adults) → 3 seats left.
        confirmAsStaff(book());

        // Two more PENDING holds; confirming BOTH would be 2 + 2 = 4 > 3.
        UUID h1 = book();
        UUID h2 = book();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier start = new CyclicBarrier(2);
        AtomicInteger ok = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        AtomicInteger other = new AtomicInteger();

        for (UUID h : List.of(h1, h2)) {
            pool.submit(() -> {
                try {
                    start.await(5, TimeUnit.SECONDS);
                    confirmAsStaff(h);
                    ok.incrementAndGet();
                } catch (CapacityExceededException e) {
                    rejected.incrementAndGet();
                } catch (Exception e) {
                    other.incrementAndGet();
                }
                return null;
            });
        }
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        assertThat(ok.get()).as("only one overflowing confirmation wins").isEqualTo(1);
        assertThat(rejected.get()).as("the other is rejected on sitewide capacity").isEqualTo(1);
        assertThat(other.get()).as("no unexpected failures").isZero();

        long confirmed = reservationRepository.findByStatus(ReservationStatus.CONFIRMED).stream()
                .mapToInt(Reservation::getNumberOfAdults).sum();
        assertThat(confirmed).as("camp headcount never exceeds maxCapacity").isLessThanOrEqualTo(5);
    }

    @Test
    void confirmationsThatFitAreAllAccepted() throws Exception {
        UUID h1 = book();  // 2
        UUID h2 = book();  // 2  -> total 4 <= 5, both fit
        confirmAsStaff(h1);
        confirmAsStaff(h2);
        assertThat(reservationRepository.findByStatus(ReservationStatus.CONFIRMED)).hasSize(2);
    }
}
