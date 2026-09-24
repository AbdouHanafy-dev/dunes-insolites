package com.camping.duneinsolite.accommodation;

import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.exception.AccommodationUnavailableException;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.AccommodationAvailabilityService;
import com.camping.duneinsolite.service.AccommodationAvailabilityService.Status;
import com.camping.duneinsolite.service.HoldExpiryJob;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.PublicBookingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.rabbitmq.RabbitMQContainer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Phase 2 — accommodation availability, holds and date overlap against real
 * Postgres. Concurrency has its own test (AccommodationConcurrencyIT).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false",
        "app.reservation.hold-expiry-sweep-ms=3600000"
})
@Testcontainers
class AccommodationAvailabilityIT {

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
    @Autowired AccommodationAvailabilityService availabilityService;
    @Autowired HoldExpiryJob holdExpiryJob;
    @Autowired TourTypeRepository tourTypeRepository;
    @Autowired AccommodationTypeRepository accommodationTypeRepository;
    @Autowired ReservationRepository reservationRepository;
    @Autowired ReservationTourTypeRepository reservationTourTypeRepository;
    @Autowired UserRepository userRepository;
    @Autowired SourceRepository sourceRepository;
    @Autowired TransactionTemplate tx;

    private String staySlug;
    private TourType stay;
    private final LocalDate date = LocalDate.now().plusDays(30);

    @BeforeEach
    void seed() {
        staySlug = "p2-" + UUID.randomUUID();
        sourceRepository.findByName("Site web")
                .orElseGet(() -> sourceRepository.save(Source.builder().name("Site web").build()));
        stay = tourTypeRepository.save(TourType.builder()
                .name("P2 nuitée").slug(staySlug).isActive(true)
                .passengerAdultPrice(new java.math.BigDecimal("999.0")).passengerChildPrice(new java.math.BigDecimal("999.0"))
                .partnerAdultPrice(new java.math.BigDecimal("999.0")).partnerChildPrice(new java.math.BigDecimal("999.0")).tva(java.math.BigDecimal.ZERO).build());
        Mockito.when(keycloakUserSyncService.createInvitedGuestUser(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenAnswer(inv -> userRepository.save(User.builder().userId(UUID.randomUUID())
                        .name("G").email("g" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build()));
    }

    private AccommodationType tier(String slug, int capacity, Integer maxUnits, boolean active) {
        return accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug(slug).name(slug).capacity(capacity)
                .adultPriceTtc(new BigDecimal("50.000")).childPriceTtc(new BigDecimal("50.000")).infantPriceTtc(BigDecimal.ZERO).tvaRate(BigDecimal.ZERO)
                .maxUnits(maxUnits).active(active).build());
    }

    /** A reservation consuming `units` of `acc` over [in,out) in a given state. */
    private Reservation seedConsuming(AccommodationType acc, int units, LocalDate in, LocalDate out,
                                      ReservationStatus status, LocalDateTime holdExpiresAt) {
        return tx.execute(t -> {
            User u = userRepository.save(User.builder().userId(UUID.randomUUID())
                    .name("Seed").email("s" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build());
            Reservation r = Reservation.builder()
                    .user(u).sourceRef(sourceRepository.findByName("Site web").orElseThrow())
                    .reservationType(ReservationType.HEBERGEMENT)
                    .checkInDate(in).checkOutDate(out).numberOfAdults(units * acc.getCapacity())
                    .status(status).holdExpiresAt(holdExpiresAt).currency(Currency.TND)
                    .totalAmount(java.math.BigDecimal.valueOf(100L * units)).build();
            ReservationTourType line = ReservationTourType.builder()
                    .reservation(r).name("P2").catalogTourTypeId(stay.getTourTypeId())
                    .adultPrice(java.math.BigDecimal.ZERO).childPrice(java.math.BigDecimal.ZERO).numberOfAdults(0).numberOfChildren(0)
                    .numberOfNights(1).activityDate(in)
                    .build();
            line.getAccommodations().add(com.camping.duneinsolite.model.ReservationAccommodation.builder()
                    .reservationTourType(line).accommodationTypeId(acc.getId()).accommodationName(acc.getName())
                    .accommodationUnits(units).accommodationUnitPriceTtc(new BigDecimal("100.000"))
                    .build());
            r.getTourTypes().add(line);
            return reservationRepository.save(r);
        });
    }

    private PublicStayBookingRequest req(String accSlug, int units, int party, LocalDate d) {
        PublicStayBookingRequest r = new PublicStayBookingRequest();
        r.setStaySlug(staySlug); r.setDate(d); r.setPartySize(party);
        var sel = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        sel.setAccommodationSlug(accSlug); sel.setQuantity(units);
        r.setAccommodations(java.util.List.of(sel));
        r.setName("Guest"); r.setEmail("guest@example.com"); r.setPhone("+21650000000");
        return r;
    }

    private Status statusOf(AccommodationType acc, LocalDate in, LocalDate out) {
        return tx.execute(t -> availabilityService.status(
                accommodationTypeRepository.findById(acc.getId()).orElseThrow(), in, out).status());
    }

    // ── basic ───────────────────────────────────────────────────────────
    @Test
    void freeInventory_bookingSucceeds() {
        tier("tent", 2, 3, true);
        var resp = publicBookingService.createStayBooking(req("tent", 1, 2, date));
        assertThat(resp.getId()).isNotBlank();
        assertThat(statusOf(accommodationTypeRepository.findByTourTypeAndSlug(stay.getTourTypeId(), "tent").orElseThrow(),
                date, date.plusDays(1))).isEqualTo(Status.AVAILABLE);
    }

    @Test
    void fullInventory_bookingRejected() {
        AccommodationType tent = tier("tent", 2, 3, true);
        seedConsuming(tent, 3, date, date.plusDays(1), ReservationStatus.CONFIRMED, null);
        assertThat(statusOf(tent, date, date.plusDays(1))).isEqualTo(Status.UNAVAILABLE);
        assertThatThrownBy(() -> publicBookingService.createStayBooking(req("tent", 1, 2, date)))
                .isInstanceOf(AccommodationUnavailableException.class);
    }

    @Test
    void unknownInventory_whenMaxUnitsNull_bookingStillAllowed() {
        tier("tent", 2, null, true);
        assertThat(statusOf(accommodationTypeRepository.findByTourTypeAndSlug(stay.getTourTypeId(), "tent").orElseThrow(),
                date, date.plusDays(1))).isEqualTo(Status.UNKNOWN);
        assertThat(publicBookingService.createStayBooking(req("tent", 1, 2, date)).getId()).isNotBlank();
    }

    // ── holds ───────────────────────────────────────────────────────────
    @Test
    void expiredHold_doesNotConsume() {
        AccommodationType tent = tier("tent", 2, 1, true);
        seedConsuming(tent, 1, date, date.plusDays(1), ReservationStatus.PENDING,
                LocalDateTime.now().minusHours(1));
        assertThat(statusOf(tent, date, date.plusDays(1))).isEqualTo(Status.AVAILABLE);
        assertThat(publicBookingService.createStayBooking(req("tent", 1, 2, date)).getId()).isNotBlank();
    }

    @Test
    void activeHold_consumes() {
        AccommodationType tent = tier("tent", 2, 1, true);
        seedConsuming(tent, 1, date, date.plusDays(1), ReservationStatus.PENDING,
                LocalDateTime.now().plusHours(1));
        assertThat(statusOf(tent, date, date.plusDays(1))).isEqualTo(Status.UNAVAILABLE);
        assertThatThrownBy(() -> publicBookingService.createStayBooking(req("tent", 1, 2, date)))
                .isInstanceOf(AccommodationUnavailableException.class);
    }

    @Test
    void nullExpiryHold_neverExpires_consumes() {
        AccommodationType tent = tier("tent", 2, 1, true);
        seedConsuming(tent, 1, date, date.plusDays(1), ReservationStatus.PENDING, null);
        assertThat(statusOf(tent, date, date.plusDays(1))).isEqualTo(Status.UNAVAILABLE);
    }

    @Test
    void cancelledReservation_releasesInventory() {
        AccommodationType tent = tier("tent", 2, 1, true);
        Reservation r = seedConsuming(tent, 1, date, date.plusDays(1), ReservationStatus.CONFIRMED, null);
        assertThat(statusOf(tent, date, date.plusDays(1))).isEqualTo(Status.UNAVAILABLE);
        tx.executeWithoutResult(t -> {
            Reservation rr = reservationRepository.findById(r.getReservationId()).orElseThrow();
            rr.setStatus(ReservationStatus.CANCELLED);
            reservationRepository.save(rr);
        });
        assertThat(statusOf(tent, date, date.plusDays(1))).isEqualTo(Status.AVAILABLE);
    }

    @Test
    void holdExpiryJob_flipsPendingToExpired() {
        AccommodationType tent = tier("tent", 2, 1, true);
        Reservation r = seedConsuming(tent, 1, date, date.plusDays(1), ReservationStatus.PENDING,
                LocalDateTime.now().minusMinutes(5));
        holdExpiryJob.sweep();
        assertThat(reservationRepository.findById(r.getReservationId()).orElseThrow().getStatus())
                .isEqualTo(ReservationStatus.EXPIRED);
    }

    // ── per-tier independence ──────────────────────────────────────────
    @Test
    void tiersHaveIndependentInventory() {
        AccommodationType tent = tier("tent", 2, 1, true);
        AccommodationType suite = tier("suite", 4, 1, true);
        seedConsuming(tent, 1, date, date.plusDays(1), ReservationStatus.CONFIRMED, null);
        assertThat(statusOf(tent, date, date.plusDays(1))).isEqualTo(Status.UNAVAILABLE);
        assertThat(statusOf(suite, date, date.plusDays(1))).isEqualTo(Status.AVAILABLE);
        assertThat(publicBookingService.createStayBooking(req("suite", 1, 4, date)).getId()).isNotBlank();
    }

    // ── date overlap ───────────────────────────────────────────────────
    @Test
    void dateOverlapMatrix() {
        AccommodationType tent = tier("tent", 2, 1, true);
        LocalDate d10 = date, d12 = date.plusDays(2);
        seedConsuming(tent, 1, d10, d12, ReservationStatus.CONFIRMED, null); // occupies 10,11

        // non-overlapping later
        assertThat(statusOf(tent, date.plusDays(3), date.plusDays(5))).isEqualTo(Status.AVAILABLE);
        // adjacent: new check-in == existing check-out (check-out exclusive) → free
        assertThat(statusOf(tent, d12, date.plusDays(4))).isEqualTo(Status.AVAILABLE);
        // adjacent before: new check-out == existing check-in → free
        assertThat(statusOf(tent, date.minusDays(2), d10)).isEqualTo(Status.AVAILABLE);
        // overlap at start
        assertThat(statusOf(tent, date.minusDays(1), date.plusDays(1))).isEqualTo(Status.UNAVAILABLE);
        // overlap at end
        assertThat(statusOf(tent, date.plusDays(1), date.plusDays(3))).isEqualTo(Status.UNAVAILABLE);
        // fully contains
        assertThat(statusOf(tent, date.minusDays(1), date.plusDays(3))).isEqualTo(Status.UNAVAILABLE);
    }

    // ── multi-unit ─────────────────────────────────────────────────────
    @Test
    void multiUnitConsumesCorrectly() {
        AccommodationType tent = tier("tent", 2, 5, true);
        seedConsuming(tent, 2, date, date.plusDays(1), ReservationStatus.CONFIRMED, null);
        // 2 used, request 3 → fits exactly
        var resp = publicBookingService.createStayBooking(req("tent", 3, 6, date));
        assertThat(resp.getId()).isNotBlank();
        assertThat(statusOf(tent, date, date.plusDays(1))).isEqualTo(Status.UNAVAILABLE);
        // now 5/5, request 1 → rejected
        assertThatThrownBy(() -> publicBookingService.createStayBooking(req("tent", 1, 2, date)))
                .isInstanceOf(AccommodationUnavailableException.class);
    }

    // ── inactive ───────────────────────────────────────────────────────
    @Test
    void inactiveTier_cannotBook() {
        tier("tent", 2, 5, false);
        assertThatThrownBy(() -> publicBookingService.createStayBooking(req("tent", 1, 2, date)))
                .isInstanceOf(com.camping.duneinsolite.exception.BusinessException.class);
    }

    // ── public revalidation ────────────────────────────────────────────
    @Test
    void bookingRevalidates_lastUnitTakenAfterAvailabilityWasRead() {
        AccommodationType tent = tier("tent", 2, 1, true);
        // customer "saw" AVAILABLE
        assertThat(statusOf(tent, date, date.plusDays(1))).isEqualTo(Status.AVAILABLE);
        // another booking consumes the unit
        seedConsuming(tent, 1, date, date.plusDays(1), ReservationStatus.CONFIRMED, null);
        // the customer's POST is rejected — no reservation created
        long before = reservationRepository.count();
        assertThatThrownBy(() -> publicBookingService.createStayBooking(req("tent", 1, 2, date)))
                .isInstanceOf(AccommodationUnavailableException.class);
        assertThat(reservationRepository.count()).isEqualTo(before);
    }
}
