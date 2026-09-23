package com.camping.duneinsolite.accommodation;

import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.PublicBookingService;
import org.junit.jupiter.api.*;
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

import static org.assertj.core.api.Assertions.*;

/**
 * Phase-hardening: a network retry of a public booking must not create a second
 * reservation (or a second inventory-consuming hold). Real Postgres + RabbitMQ.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false"
})
@Testcontainers
class PublicBookingIdempotencyIT {

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
    @Autowired TourTypeRepository tourTypeRepository;
    @Autowired AccommodationTypeRepository accommodationTypeRepository;
    @Autowired ReservationRepository reservationRepository;
    @Autowired UserRepository userRepository;
    @Autowired SourceRepository sourceRepository;
    @Autowired AccountActionTokenRepository accountActionTokenRepository;

    private String staySlug;

    @BeforeEach
    void seed() {
        staySlug = "idem-nuitee-" + UUID.randomUUID();
        sourceRepository.findByName("Site web")
                .orElseGet(() -> sourceRepository.save(Source.builder().name("Site web").build()));

        TourType stay = tourTypeRepository.save(TourType.builder()
                .name("Idem nuitée").slug(staySlug).isActive(true)
                .passengerAdultPrice(new BigDecimal("100.0")).passengerChildPrice(new BigDecimal("100.0"))
                .partnerAdultPrice(new BigDecimal("100.0")).partnerChildPrice(new BigDecimal("100.0"))
                .tva(BigDecimal.ZERO).build());
        accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("dune-suite").name("Dune Suite").capacity(4)
                .unitPriceTtc(new BigDecimal("165.000")).tvaRate(new BigDecimal("7"))
                .maxUnits(3).displayOrder(0).active(true).build());

        // The guest user is pre-created so the mock is a plain, thread-safe
        // lookup — the guest-user creation race is covered by
        // KeycloakUserSyncServiceGuestCheckoutTest, not here.
        User guest = userRepository.save(User.builder()
                .userId(UUID.randomUUID()).name("Guest")
                .email("idem@example.com").role(UserRole.CLIENT).build());
        Mockito.when(keycloakUserSyncService.createInvitedGuestUser(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenAnswer(inv -> userRepository.findByEmail(inv.getArgument(1)).orElse(guest));
    }

    private PublicStayBookingRequest req(String idempotencyKey) {
        PublicStayBookingRequest r = new PublicStayBookingRequest();
        r.setStaySlug(staySlug);
        r.setDate(LocalDate.now().plusDays(30));
        r.setPartySize(2);
        var accSelection = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        accSelection.setAccommodationSlug("dune-suite");
        accSelection.setQuantity(1);
        r.setAccommodations(java.util.List.of(accSelection));
        r.setName("Guest"); r.setEmail("idem@example.com"); r.setPhone("+21650000000");
        r.setIdempotencyKey(idempotencyKey);
        return r;
    }

    @AfterEach
    void cleanup() {
        reservationRepository.deleteAll();
        accountActionTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    private long reservationCount() {
        return reservationRepository.findByStatus(ReservationStatus.PENDING).size();
    }

    @Test
    void retryWithTheSameKey_returnsTheSameReservation_noDuplicate() {
        String key = UUID.randomUUID().toString();

        var first = publicBookingService.createStayBooking(req(key));
        var retry1 = publicBookingService.createStayBooking(req(key));
        var retry2 = publicBookingService.createStayBooking(req(key));

        assertThat(retry1.getId()).isEqualTo(first.getId());
        assertThat(retry2.getId()).isEqualTo(first.getId());
        assertThat(reservationCount()).isEqualTo(1);
    }

    @Test
    void noKey_stillCreatesEachTime_backwardCompatible() {
        var a = publicBookingService.createStayBooking(req(null));
        var b = publicBookingService.createStayBooking(req(null));
        assertThat(b.getId()).isNotEqualTo(a.getId());
        assertThat(reservationCount()).isEqualTo(2);
    }

    @Test
    void concurrentDoubleSubmitWithTheSameKey_createsExactlyOneReservation() throws Exception {
        String key = UUID.randomUUID().toString();
        int n = 8;
        var pool = Executors.newFixedThreadPool(n);
        var start = new CountDownLatch(1);
        List<Future<String>> ids = new java.util.ArrayList<>();
        for (int i = 0; i < n; i++) {
            ids.add(pool.submit(() -> {
                start.await();
                return publicBookingService.createStayBooking(req(key)).getId();
            }));
        }
        start.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();

        java.util.Set<String> distinct = new java.util.HashSet<>();
        for (Future<String> f : ids) distinct.add(f.get());

        assertThat(distinct).as("every concurrent submit resolved to one reservation").hasSize(1);
        assertThat(reservationCount()).isEqualTo(1);
    }

    @Test
    void retryAfterTheHoldFilledUp_stillReturnsTheOriginalBooking() {
        // book the original
        String key = UUID.randomUUID().toString();
        var original = publicBookingService.createStayBooking(req(key));

        // fill the remaining inventory with other bookings (maxUnits = 3, 1 taken)
        publicBookingService.createStayBooking(req(UUID.randomUUID().toString()));
        publicBookingService.createStayBooking(req(UUID.randomUUID().toString()));
        // a 4th fresh booking now fails
        assertThatThrownBy(() -> publicBookingService.createStayBooking(req(UUID.randomUUID().toString())))
                .isInstanceOf(RuntimeException.class);

        // but the ORIGINAL booker's retry still works — it returns the existing reservation
        var retry = publicBookingService.createStayBooking(req(key));
        assertThat(retry.getId()).isEqualTo(original.getId());
    }
}
