package com.camping.duneinsolite.accommodation;

import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.exception.AccommodationUnavailableException;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.PublicBookingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
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
 * STEP 15 — the critical concurrency test. Two guests race for the last unit of
 * a tier ({@code maxUnits = 1}); exactly one must win. Real Postgres, no mocks
 * of the repository. Repeated to make a race likely; both threads meet at a
 * barrier inside the request so they hit the allocation lock together.
 *
 * <p>If this ever records two successes, Phase 2 is FAILED.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false",
        "app.reservation.hold-expiry-sweep-ms=3600000"
})
@Testcontainers
class AccommodationConcurrencyIT {

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
        // Hikari needs > 2 connections so both racing transactions can run.
        r.add("spring.datasource.hikari.maximum-pool-size", () -> "8");
    }

    @MockitoBean JavaMailSender mailSender;
    @MockitoBean KeycloakUserSyncService keycloakUserSyncService;

    @Autowired PublicBookingService publicBookingService;
    @Autowired TourTypeRepository tourTypeRepository;
    @Autowired AccommodationTypeRepository accommodationTypeRepository;
    @Autowired ReservationRepository reservationRepository;
    @Autowired ReservationTourTypeRepository reservationTourTypeRepository;
    @Autowired UserRepository userRepository;
    @Autowired SourceRepository sourceRepository;

    private String staySlug;
    private final LocalDate date = LocalDate.now().plusDays(45);

    @BeforeEach
    void seed() {
        staySlug = "p2c-" + UUID.randomUUID();
        sourceRepository.findByName("Site web")
                .orElseGet(() -> sourceRepository.save(Source.builder().name("Site web").build()));
        TourType stay = tourTypeRepository.save(TourType.builder()
                .name("P2C nuitée").slug(staySlug).isActive(true)
                .passengerAdultPrice(new java.math.BigDecimal("999.0")).passengerChildPrice(new java.math.BigDecimal("999.0"))
                .partnerAdultPrice(new java.math.BigDecimal("999.0")).partnerChildPrice(new java.math.BigDecimal("999.0")).tva(java.math.BigDecimal.ZERO).build());
        accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("suite").name("Dune Suite").capacity(4)
                .unitPriceTtc(new BigDecimal("165.000")).tvaRate(BigDecimal.ZERO)
                .maxUnits(1).active(true).build());
        Mockito.when(keycloakUserSyncService.createInvitedGuestUser(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenAnswer(inv -> userRepository.save(User.builder().userId(UUID.randomUUID())
                        .name("G").email("g" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build()));
    }

    private PublicStayBookingRequest req() {
        PublicStayBookingRequest r = new PublicStayBookingRequest();
        r.setStaySlug(staySlug); r.setDate(date); r.setPartySize(2);
        var accSelection = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        accSelection.setAccommodationSlug("suite"); accSelection.setQuantity(1);
        r.setAccommodations(java.util.List.of(accSelection));
        r.setName("Guest"); r.setEmail("g@example.com"); r.setPhone("+21650000000");
        return r;
    }

    @RepeatedTest(8)
    void twoGuestsRaceForTheLastUnit_exactlyOneWins() throws Exception {
        UUID suiteId = accommodationTypeRepository.findAll().stream()
                .filter(a -> a.getSlug().equals("suite")).findFirst().orElseThrow().getId();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier start = new CyclicBarrier(2);
        AtomicInteger ok = new AtomicInteger();
        AtomicInteger conflict = new AtomicInteger();
        AtomicInteger other = new AtomicInteger();

        Callable<Void> attempt = () -> {
            start.await(5, TimeUnit.SECONDS);
            try {
                publicBookingService.createStayBooking(req());
                ok.incrementAndGet();
            } catch (AccommodationUnavailableException e) {
                conflict.incrementAndGet();
            } catch (Exception e) {
                other.incrementAndGet();
                throw e;
            }
            return null;
        };

        Future<Void> a = pool.submit(attempt);
        Future<Void> b = pool.submit(attempt);
        try { a.get(20, TimeUnit.SECONDS); } catch (ExecutionException ignored) {}
        try { b.get(20, TimeUnit.SECONDS); } catch (ExecutionException ignored) {}
        pool.shutdownNow();

        assertThat(ok.get()).as("exactly one booking succeeds").isEqualTo(1);
        assertThat(conflict.get()).as("exactly one is rejected with a capacity conflict").isEqualTo(1);
        assertThat(other.get()).as("no unexpected failures").isZero();

        long allocated = reservationTourTypeRepository.sumConsumingUnits(
                suiteId, date, date.plusDays(1), java.time.LocalDateTime.now(), null);
        assertThat(allocated).as("exactly one unit allocated in the database for this tier").isEqualTo(1L);
    }

}
