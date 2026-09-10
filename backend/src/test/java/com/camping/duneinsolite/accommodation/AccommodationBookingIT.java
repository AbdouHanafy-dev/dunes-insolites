package com.camping.duneinsolite.accommodation;

import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.dto.response.publicapi.PublicStayResponse;
import com.camping.duneinsolite.exception.AccommodationPricingException;
import com.camping.duneinsolite.mapper.publicapi.PublicStayMapper;
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
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.rabbitmq.RabbitMQContainer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Phase 1 — accommodation pricing, end to end against real Postgres.
 *
 * Proves: the guest is charged the AUTHORITATIVE per-tier price (not the
 * per-person TourType rate), the choice is server-resolved (client sends only a
 * tier + count), unpriced/undersized selections fail closed with no side effect,
 * the price is snapshotted (a later catalogue change never moves an existing
 * booking), a booking with no accommodation keeps legacy per-person pricing, and
 * the vitrine only ever shows priced+active tiers.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false"
})
@Testcontainers
class AccommodationBookingIT {

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
    @Autowired PublicStayMapper publicStayMapper;
    @Autowired com.camping.duneinsolite.service.ReservationService reservationService;
    @Autowired TransactionTemplate tx;

    private String staySlug;
    private UUID tentId, suiteId;

    @BeforeEach
    void seed() {
        staySlug = "phase1-nuitee-" + UUID.randomUUID();
        sourceRepository.findByName("Site web")
                .orElseGet(() -> sourceRepository.save(Source.builder().name("Site web").build()));

        TourType stay = tourTypeRepository.save(TourType.builder()
                .name("Phase 1 nuitée").slug(staySlug).isActive(true)
                // deliberately absurd per-person rate: must NOT be used when a tier is picked
                .passengerAdultPrice(new java.math.BigDecimal("999.0")).passengerChildPrice(new java.math.BigDecimal("999.0"))
                .partnerAdultPrice(new java.math.BigDecimal("999.0")).partnerChildPrice(new java.math.BigDecimal("999.0"))
                .tva(java.math.BigDecimal.ZERO).build());

        tentId = accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("desert-tent").name("Desert Tent").capacity(2)
                .unitPriceTtc(new BigDecimal("95.000")).tvaRate(new BigDecimal("7"))
                .displayOrder(0).active(true).build()).getId();
        suiteId = accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("dune-suite").name("Dune Suite").capacity(4)
                .unitPriceTtc(new BigDecimal("165.000")).tvaRate(new BigDecimal("7"))
                .displayOrder(2).active(true).build()).getId();
        accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("gold-yurt").name("Gold Yurt").capacity(2)
                .unitPriceTtc(null).displayOrder(3).active(true).build());

        Mockito.when(keycloakUserSyncService.findOrCreateGuestUser(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenAnswer(inv -> userRepository.save(User.builder()
                        .userId(UUID.randomUUID()).name(inv.getArgument(0))
                        .email("g" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build()));
    }

    private PublicStayBookingRequest req(String accSlug, Integer qty, int party) {
        PublicStayBookingRequest r = new PublicStayBookingRequest();
        r.setStaySlug(staySlug);
        r.setDate(LocalDate.now().plusDays(30));
        r.setPartySize(party);
        r.setAccommodationSlug(accSlug);
        r.setAccommodationQty(qty);
        r.setName("Guest"); r.setEmail("guest@example.com"); r.setPhone("+21650000000");
        return r;
    }

    @Test
    void guestIsChargedTheTierPrice_perUnit_notThePerPersonRate() {
        var resp = publicBookingService.createStayBooking(req("dune-suite", 1, 2));
        Reservation res = tx.execute(t -> reservationRepository.findByIdWithTourTypes(UUID.fromString(resp.getId())).orElseThrow());
        assertThat(res.getTotalAmount()).isEqualByComparingTo("165.000");                 // suite, not 999 × 2
        var line = res.getTourTypes().get(0);
        assertThat(line.isAccommodationPriced()).isTrue();
        assertThat(line.getAccommodationName()).isEqualTo("Dune Suite");
        assertThat(line.getAccommodationUnitPriceTtc()).isEqualByComparingTo("165.000");
    }

    @Test
    void partySizeDoesNotInflateAnAccommodationPricedLine() {
        var resp = publicBookingService.createStayBooking(req("dune-suite", 1, 4));
        Reservation res = tx.execute(t -> reservationRepository.findByIdWithTourTypes(UUID.fromString(resp.getId())).orElseThrow());
        assertThat(res.getTotalAmount()).isEqualByComparingTo("165.000"); // 1 suite, still 165 — not × party
    }

    @Test
    void twoTentsAreChargedAsTwoUnits() {
        var resp = publicBookingService.createStayBooking(req("desert-tent", 2, 3));
        Reservation res = tx.execute(t -> reservationRepository.findByIdWithTourTypes(UUID.fromString(resp.getId())).orElseThrow());
        assertThat(res.getTotalAmount()).isEqualByComparingTo("190.000"); // 95 × 2
    }

    @Test
    void partyThatDoesNotFitIsRejected_noReservationCreated() {
        long before = reservationRepository.count();
        assertThatThrownBy(() -> publicBookingService.createStayBooking(req("dune-suite", 1, 5)))
                .isInstanceOf(AccommodationPricingException.class);
        assertThat(reservationRepository.count()).isEqualTo(before);
    }

    @Test
    void unpricedTierIsRejected_noReservationCreated() {
        long before = reservationRepository.count();
        assertThatThrownBy(() -> publicBookingService.createStayBooking(req("gold-yurt", 1, 2)))
                .isInstanceOf(AccommodationPricingException.class)
                .hasMessageContaining("contact the camp");
        assertThat(reservationRepository.count()).isEqualTo(before);
    }

    @Test
    void bookingWithoutAnAccommodationKeepsLegacyPerPersonPricing() {
        var r = req(null, null, 2);
        var resp = publicBookingService.createStayBooking(r);
        Reservation res = tx.execute(t -> reservationRepository.findByIdWithTourTypes(UUID.fromString(resp.getId())).orElseThrow());
        assertThat(res.getTourTypes().get(0).isAccommodationPriced()).isFalse();
        assertThat(res.getTotalAmount()).isEqualByComparingTo("1998.000"); // 999 × 2, unchanged behaviour
    }

    @Test
    void priceIsSnapshotted_aLaterCatalogueChangeDoesNotMoveAnExistingBooking() {
        var resp = publicBookingService.createStayBooking(req("dune-suite", 1, 2));
        UUID resId = UUID.fromString(resp.getId());

        AccommodationType suite = accommodationTypeRepository.findById(suiteId).orElseThrow();
        suite.setUnitPriceTtc(new BigDecimal("999.000"));
        accommodationTypeRepository.saveAndFlush(suite);

        Reservation reloaded = tx.execute(t -> reservationRepository.findByIdWithTourTypes(resId).orElseThrow());
        assertThat(reloaded.getTotalAmount()).isEqualByComparingTo("165.000");
        assertThat(reloaded.getTourTypes().get(0).getAccommodationUnitPriceTtc()).isEqualByComparingTo("165.000");
    }

    @Test
    void publicStayResponseExposesOnlyPricedActiveTiers() {
        TourType stay = tourTypeRepository.findBySlugAndIsActiveTrue(staySlug).orElseThrow();
        PublicStayResponse resp = tx.execute(t -> publicStayMapper.toResponse(tourTypeRepository.findBySlugAndIsActiveTrue(staySlug).orElseThrow(), "fr"));
        List<String> slugs = resp.getAccommodations().stream()
                .map(PublicStayResponse.Accommodation::getSlug).toList();
        assertThat(slugs).containsExactlyInAnyOrder("desert-tent", "dune-suite"); // NOT gold-yurt (unpriced)
        assertThat(resp.getAccommodations()).allSatisfy(a -> assertThat(a.getPriceFrom()).isNotNull());
    }

    // ── Phase 1 regression: admin updates must preserve the accommodation snapshot ──

    @org.junit.jupiter.api.AfterEach
    void clearAuth() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    private void asAdmin() {
        var token = new org.springframework.security.authentication.TestingAuthenticationToken(
                "admin@test", null, "ROLE_ADMIN");
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(token);
    }

    @Test
    void adminUpdateOfAnUnrelatedField_keepsTheAccommodationSnapshotAndTotal() {
        var resp = publicBookingService.createStayBooking(req("dune-suite", 1, 2));
        UUID resId = UUID.fromString(resp.getId());
        asAdmin();

        var upd = new com.camping.duneinsolite.dto.request.ReservationUpdateRequest();
        upd.setGroupName("Renamed by admin"); // no tourTypes in the request
        reservationService.updateReservation(resId, upd);

        Reservation r = tx.execute(t -> reservationRepository.findByIdWithTourTypes(resId).orElseThrow());
        assertThat(r.getTourTypes().get(0).isAccommodationPriced()).isTrue();
        assertThat(r.getTotalAmount()).isEqualByComparingTo("165.000");
    }

    @Test
    void adminUpdateThatRoundTripsTourTypes_stillKeepsTheAccommodationSnapshot() {
        var resp = publicBookingService.createStayBooking(req("dune-suite", 1, 2));
        UUID resId = UUID.fromString(resp.getId());
        asAdmin();

        // the admin form sends the tourTypes array back (without accommodation info)
        var sel = new com.camping.duneinsolite.dto.request.TourTypeSelectionRequest();
        Reservation before = tx.execute(t -> reservationRepository.findByIdWithTourTypes(resId).orElseThrow());
        sel.setTourTypeId(before.getTourTypes().get(0).getCatalogTourTypeId());
        sel.setNumberOfAdults(2);
        sel.setActivityDate(before.getCheckInDate());
        var upd = new com.camping.duneinsolite.dto.request.ReservationUpdateRequest();
        upd.setTourTypes(java.util.List.of(sel));
        reservationService.updateReservation(resId, upd);

        Reservation r = tx.execute(t -> reservationRepository.findByIdWithTourTypes(resId).orElseThrow());
        var line = r.getTourTypes().get(0);
        assertThat(line.isAccommodationPriced()).as("snapshot carried forward").isTrue();
        assertThat(line.getAccommodationName()).isEqualTo("Dune Suite");
        assertThat(line.getAccommodationUnitPriceTtc()).isEqualByComparingTo("165.000");
        assertThat(r.getTotalAmount()).isEqualByComparingTo("165.000");
    }

    @Test
    void catalogueAccommodationPriceChange_doesNotMoveAnExistingReservationOnUpdate() {
        var resp = publicBookingService.createStayBooking(req("dune-suite", 1, 2));
        UUID resId = UUID.fromString(resp.getId());

        tx.executeWithoutResult(t -> {
            AccommodationType s = accommodationTypeRepository.findById(suiteId).orElseThrow();
            s.setUnitPriceTtc(new BigDecimal("999.000"));
            accommodationTypeRepository.save(s);
        });

        asAdmin();
        var upd = new com.camping.duneinsolite.dto.request.ReservationUpdateRequest();
        upd.setGroupName("Edited after a price change");
        reservationService.updateReservation(resId, upd);

        Reservation r = tx.execute(t -> reservationRepository.findByIdWithTourTypes(resId).orElseThrow());
        assertThat(r.getTotalAmount()).as("historical reservation stays financially stable").isEqualByComparingTo("165.000");
    }

    @Test
    void anInactiveTierIsAlsoHiddenAndUnbookable() {
        AccommodationType tent = accommodationTypeRepository.findById(tentId).orElseThrow();
        tent.setActive(false);
        accommodationTypeRepository.saveAndFlush(tent);
        try {
            TourType stay = tourTypeRepository.findBySlugAndIsActiveTrue(staySlug).orElseThrow();
            assertThat(tx.execute(t -> publicStayMapper.toResponse(tourTypeRepository.findBySlugAndIsActiveTrue(staySlug).orElseThrow(), "fr")).getAccommodations())
                    .noneMatch(a -> a.getSlug().equals("desert-tent"));
            assertThatThrownBy(() -> publicBookingService.createStayBooking(req("desert-tent", 1, 2)))
                    .isInstanceOf(AccommodationPricingException.class);
        } finally {
            tent.setActive(true);
            accommodationTypeRepository.saveAndFlush(tent);
        }
    }
}
