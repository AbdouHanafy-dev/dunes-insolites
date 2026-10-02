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
    @Autowired com.camping.duneinsolite.service.AccommodationTypeAdminService tierAdmin;

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
                .adultPriceTtc(new BigDecimal("47.500")).childPriceTtc(new BigDecimal("47.500")).infantPriceTtc(BigDecimal.ZERO).tvaRate(new BigDecimal("7"))
                .displayOrder(0).active(true).build()).getId();
        suiteId = accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("dune-suite").name("Dune Suite").capacity(4)
                .adultPriceTtc(new BigDecimal("82.500")).childPriceTtc(new BigDecimal("82.500")).infantPriceTtc(BigDecimal.ZERO).tvaRate(new BigDecimal("7"))
                .displayOrder(2).active(true).build()).getId();
        accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("gold-yurt").name("Gold Yurt").capacity(2)
                .adultPriceTtc(null).displayOrder(3).active(true).build());

        Mockito.when(keycloakUserSyncService.createInvitedGuestUser(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenAnswer(inv -> userRepository.save(User.builder()
                        .userId(UUID.randomUUID()).name(inv.getArgument(0))
                        .email("g" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build()));
    }

    private PublicStayBookingRequest req(String accSlug, Integer qty, int party) {
        PublicStayBookingRequest r = new PublicStayBookingRequest();
        r.setStaySlug(staySlug);
        r.setDate(LocalDate.now().plusDays(30));
        r.setPartySize(party);
        var accSelection = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        accSelection.setAccommodationSlug(accSlug);
        accSelection.setQuantity(qty);
        r.setAccommodations(accSlug == null ? java.util.List.of() : java.util.List.of(accSelection));
        r.setName("Guest"); r.setEmail("guest@example.com"); r.setPhone("+21650000000");
        return r;
    }

    /**
     * Loads a reservation with its lines AND each line's accommodation snapshot
     * while the session is still open: getAccommodations() is lazy, so reading
     * it after the transaction closed threw LazyInitializationException.
     */
    private Reservation load(UUID id) {
        return tx.execute(t -> {
            Reservation r = reservationRepository.findByIdWithTourTypes(id).orElseThrow();
            r.getTourTypes().forEach(line -> line.getAccommodations().size());
            return r;
        });
    }

    @Test
    void guestIsChargedTheTierPricePerPerson_notTheStayRate() {
        var resp = publicBookingService.createStayBooking(req("dune-suite", 1, 2));
        Reservation res = load(UUID.fromString(resp.getId()));
        assertThat(res.getTotalAmount()).isEqualByComparingTo("165.000");                 // 2 adults × 82.5, not the stay's 999 × 2
        var line = res.getTourTypes().get(0);
        assertThat(line.isAccommodationPriced()).isTrue();
        assertThat(line.getAccommodations().get(0).getAccommodationName()).isEqualTo("Dune Suite");
        assertThat(line.getAccommodations().get(0).getAdultPriceTtc()).isEqualByComparingTo("82.500");
    }

    @Test
    void aPerPersonTierIsChargedForEveryGuestThatSleepsThere() {
        var resp = publicBookingService.createStayBooking(req("dune-suite", 1, 4));
        Reservation res = load(UUID.fromString(resp.getId()));
        assertThat(res.getTotalAmount()).isEqualByComparingTo("330.000"); // 4 adults × 82.5
    }

    @Test
    void twoTentsForThreeGuestsAreChargedPerGuest() {
        var resp = publicBookingService.createStayBooking(req("desert-tent", 2, 3));
        Reservation res = load(UUID.fromString(resp.getId()));
        assertThat(res.getTotalAmount()).isEqualByComparingTo("142.500"); // 3 adults × 47.5
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
        Reservation res = load(UUID.fromString(resp.getId()));
        assertThat(res.getTourTypes().get(0).isAccommodationPriced()).isFalse();
        assertThat(res.getTotalAmount()).isEqualByComparingTo("1998.000"); // 999 × 2, unchanged behaviour
    }

    @Test
    void priceIsSnapshotted_aLaterCatalogueChangeDoesNotMoveAnExistingBooking() {
        var resp = publicBookingService.createStayBooking(req("dune-suite", 1, 2));
        UUID resId = UUID.fromString(resp.getId());

        AccommodationType suite = accommodationTypeRepository.findById(suiteId).orElseThrow();
        suite.setAdultPriceTtc(new BigDecimal("999.000"));
        accommodationTypeRepository.saveAndFlush(suite);

        Reservation reloaded = load(resId);
        assertThat(reloaded.getTotalAmount()).isEqualByComparingTo("165.000");
        assertThat(reloaded.getTourTypes().get(0).getAccommodations().get(0).getAdultPriceTtc()).isEqualByComparingTo("82.500");
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

        Reservation r = load(resId);
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
        Reservation before = load(resId);
        sel.setTourTypeId(before.getTourTypes().get(0).getCatalogTourTypeId());
        sel.setNumberOfAdults(2);
        sel.setActivityDate(before.getCheckInDate());
        var upd = new com.camping.duneinsolite.dto.request.ReservationUpdateRequest();
        upd.setTourTypes(java.util.List.of(sel));
        reservationService.updateReservation(resId, upd);

        Reservation r = load(resId);
        var line = r.getTourTypes().get(0);
        assertThat(line.isAccommodationPriced()).as("snapshot carried forward").isTrue();
        assertThat(line.getAccommodations().get(0).getAccommodationName()).isEqualTo("Dune Suite");
        assertThat(line.getAccommodations().get(0).getAdultPriceTtc()).isEqualByComparingTo("82.500");
        assertThat(r.getTotalAmount()).isEqualByComparingTo("165.000");
    }

    @Test
    void catalogueAccommodationPriceChange_doesNotMoveAnExistingReservationOnUpdate() {
        var resp = publicBookingService.createStayBooking(req("dune-suite", 1, 2));
        UUID resId = UUID.fromString(resp.getId());

        tx.executeWithoutResult(t -> {
            AccommodationType s = accommodationTypeRepository.findById(suiteId).orElseThrow();
            s.setAdultPriceTtc(new BigDecimal("999.000"));
            accommodationTypeRepository.save(s);
        });

        asAdmin();
        var upd = new com.camping.duneinsolite.dto.request.ReservationUpdateRequest();
        upd.setGroupName("Edited after a price change");
        reservationService.updateReservation(resId, upd);

        Reservation r = load(resId);
        assertThat(r.getTotalAmount()).as("historical reservation stays financially stable").isEqualByComparingTo("165.000");
    }

    private void allowNights(int max) {
        tx.executeWithoutResult(t -> {
            TourType stay = tourTypeRepository.findBySlugAndIsActiveTrue(staySlug).orElseThrow();
            stay.setMaxNights(max);
            tourTypeRepository.save(stay);
        });
    }

    @Test
    void aTwoNightStayIsStoredAndChargedForTwoNights() {
        allowNights(2);
        var r = req("dune-suite", 1, 2);
        r.setNights(2);
        Reservation res = load(UUID.fromString(publicBookingService.createStayBooking(r).getId()));

        assertThat(res.getCheckOutDate()).isEqualTo(res.getCheckInDate().plusDays(2));
        assertThat(res.getTourTypes().get(0).getNumberOfNights()).as("the line says what the dates say").isEqualTo(2);
        assertThat(res.getTotalAmount()).as("2 adults x 82.5 x 2 nights").isEqualByComparingTo("330.000");
    }

    @Test
    void editingATwoNightStayWithoutTouchingItsDatesKeepsTwoNightsAndTheTotal() {
        allowNights(2);
        var r = req("dune-suite", 1, 2);
        r.setNights(2);
        UUID resId = UUID.fromString(publicBookingService.createStayBooking(r).getId());
        asAdmin();

        // the admin form sends the tourTypes array back, without dates
        var sel = new com.camping.duneinsolite.dto.request.TourTypeSelectionRequest();
        Reservation before = load(resId);
        sel.setTourTypeId(before.getTourTypes().get(0).getCatalogTourTypeId());
        sel.setNumberOfAdults(2);
        sel.setActivityDate(before.getCheckInDate());
        var upd = new com.camping.duneinsolite.dto.request.ReservationUpdateRequest();
        upd.setTourTypes(java.util.List.of(sel));
        reservationService.updateReservation(resId, upd);

        Reservation after = load(resId);
        assertThat(after.getTourTypes().get(0).getNumberOfNights()).isEqualTo(2);
        assertThat(after.getTotalAmount()).isEqualByComparingTo("330.000");
    }

    @Test
    void aStayBookedBeforeTheFixKeepsItsStoredNightsWhenEditedWithoutDates() {
        allowNights(2);
        var r = req("dune-suite", 1, 2);
        r.setNights(2);
        UUID resId = UUID.fromString(publicBookingService.createStayBooking(r).getId());
        // Reproduce the legacy shape: 2 nights of dates, but a line stored (and priced) as 1 night.
        tx.executeWithoutResult(t -> {
            Reservation res = reservationRepository.findByIdWithTourTypes(resId).orElseThrow();
            res.getTourTypes().get(0).setNumberOfNights(1);
            res.setTotalAmount(new BigDecimal("165.000"));
            reservationRepository.save(res);
        });
        asAdmin();

        var sel = new com.camping.duneinsolite.dto.request.TourTypeSelectionRequest();
        Reservation before = load(resId);
        sel.setTourTypeId(before.getTourTypes().get(0).getCatalogTourTypeId());
        sel.setNumberOfAdults(2);
        sel.setActivityDate(before.getCheckInDate());
        var upd = new com.camping.duneinsolite.dto.request.ReservationUpdateRequest();
        upd.setTourTypes(java.util.List.of(sel));
        reservationService.updateReservation(resId, upd);

        Reservation after = load(resId);
        assertThat(after.getTourTypes().get(0).getNumberOfNights()).as("an unrelated edit must not reprice history").isEqualTo(1);
        assertThat(after.getTotalAmount()).isEqualByComparingTo("165.000");
    }

    private com.camping.duneinsolite.dto.request.AccommodationTypeRequest tierRequest(
            java.util.List<com.camping.duneinsolite.dto.CatalogTranslationDto> translations) {
        var r = new com.camping.duneinsolite.dto.request.AccommodationTypeRequest();
        r.setTourTypeId(tourTypeRepository.findBySlugAndIsActiveTrue(staySlug).orElseThrow().getTourTypeId());
        r.setSlug("dune-suite");
        r.setName("Dune Suite");
        r.setDescription("Suite en dur");
        r.setCapacity(4);
        r.setAdultPriceTtc(new BigDecimal("82.500"));
        r.setFeatures(java.util.List.of("Climatisation"));
        r.setTranslations(translations);
        return r;
    }

    private com.camping.duneinsolite.dto.CatalogTranslationDto german() {
        var t = new com.camping.duneinsolite.dto.CatalogTranslationDto();
        t.setLocale(ContentLocale.DE);
        t.setName("Dünen-Suite");
        t.setDescription("Suite aus Stein");
        t.setHighlights(java.util.List.of("Klimaanlage")); // the feature list travels as highlights
        return t;
    }

    private PublicStayResponse.Accommodation publicTier(String locale) {
        return tx.execute(t -> publicStayMapper.toResponse(tourTypeRepository.findBySlugAndIsActiveTrue(staySlug).orElseThrow(), locale))
                .getAccommodations().stream().filter(a -> a.getSlug().equals("dune-suite")).findFirst().orElseThrow();
    }

    @Test
    void aTiersTranslationIsStoredAndServedInTheVisitorsLanguage() {
        tierAdmin.update(suiteId, tierRequest(java.util.List.of(german())));

        var de = publicTier("de");
        assertThat(de.getTitle()).isEqualTo("Dünen-Suite");
        assertThat(de.getDescription()).isEqualTo("Suite aus Stein");
        assertThat(de.getFeatures()).containsExactly("Klimaanlage");
        assertThat(de.getSleeps()).isEqualTo("Bis zu 4 Gäste");

        // No Italian copy: French original for the texts, but the "sleeps" line still follows the language.
        var it = publicTier("it");
        assertThat(it.getTitle()).isEqualTo("Dune Suite");
        assertThat(it.getDescription()).isEqualTo("Suite en dur");
        assertThat(it.getSleeps()).isEqualTo("Fino a 4 ospiti");

        var fr = publicTier("fr");
        assertThat(fr.getTitle()).isEqualTo("Dune Suite");
        assertThat(fr.getSleeps()).isEqualTo("Jusqu'à 4 personnes");

        // The admin read returns what was saved.
        var saved = tierAdmin.get(suiteId).translations();
        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).getName()).isEqualTo("Dünen-Suite");
    }

    @Test
    void savingATierWithoutTranslationsNeverWipesTheOnesAlreadySaved() {
        tierAdmin.update(suiteId, tierRequest(java.util.List.of(german())));

        tierAdmin.update(suiteId, tierRequest(null)); // a client that does not know about translations

        assertThat(publicTier("de").getTitle()).isEqualTo("Dünen-Suite");
        // Only an explicit list changes them: an empty list removes them all.
        tierAdmin.update(suiteId, tierRequest(java.util.List.of()));
        assertThat(publicTier("de").getTitle()).isEqualTo("Dune Suite");
    }

    @Test
    void replacingATiersTranslationUpdatesItInPlace() {
        tierAdmin.update(suiteId, tierRequest(java.util.List.of(german())));
        var again = german();
        again.setName("Dünen-Suite Deluxe");
        tierAdmin.update(suiteId, tierRequest(java.util.List.of(again))); // same language again: no unique-key clash

        assertThat(publicTier("de").getTitle()).isEqualTo("Dünen-Suite Deluxe");
    }

    @Test
    void deletingATierAlsoRemovesItsTranslations() {
        tierAdmin.update(suiteId, tierRequest(java.util.List.of(german())));
        tierAdmin.delete(suiteId);
        assertThat(accommodationTypeRepository.findById(suiteId)).isEmpty();
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
