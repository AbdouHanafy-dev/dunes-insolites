package com.camping.duneinsolite.security;

import com.camping.duneinsolite.dto.request.PaymentRequest;
import com.camping.duneinsolite.dto.request.ReservationUpdateRequest;
import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.*;
import org.junit.jupiter.api.*;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
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
 * Phase 4 — per-user IDOR matrix, real Postgres.
 *
 * There is no company dimension on operational entities yet (business-blocked,
 * see docs/adr/0002-company-scoping.md), so "isolation" here is owner vs
 * non-owner vs staff. Proves a CLIENT cannot reach another customer's
 * reservation, invoice or payment by changing the id in the request, and that
 * {@code generateFactureLater} no longer trusts a caller-supplied CompanyType.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false"
})
@Testcontainers
class ReservationOwnershipIdorIT {

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
    @Autowired InvoiceService invoiceService;
    @Autowired PaymentService paymentService;
    @Autowired TourTypeRepository tourTypeRepository;
    @Autowired AccommodationTypeRepository accommodationTypeRepository;
    @Autowired ReservationRepository reservationRepository;
    @Autowired UserRepository userRepository;
    @Autowired SourceRepository sourceRepository;
    @Autowired TransactionTemplate tx;

    private String staySlug;
    private UUID reservationId;
    private UUID ownerAId;   // the guest who made the booking
    private UUID strangerBId; // an unrelated CLIENT

    @BeforeEach
    void seed() {
        staySlug = "idor-nuitee-" + UUID.randomUUID();
        sourceRepository.findByName("Site web")
                .orElseGet(() -> sourceRepository.save(Source.builder().name("Site web").build()));

        TourType stay = tourTypeRepository.save(TourType.builder()
                .name("IDOR nuitée").slug(staySlug).isActive(true)
                .passengerAdultPrice(new BigDecimal("999.0")).passengerChildPrice(new BigDecimal("999.0"))
                .partnerAdultPrice(new BigDecimal("999.0")).partnerChildPrice(new BigDecimal("999.0"))
                .tva(BigDecimal.ZERO).build());
        accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("dune-suite").name("Dune Suite").capacity(4)
                .unitPriceTtc(new BigDecimal("165.000")).tvaRate(new BigDecimal("7"))
                .displayOrder(0).active(true).build());

        Mockito.when(keycloakUserSyncService.createInvitedGuestUser(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenAnswer(inv -> userRepository.save(User.builder()
                        .userId(UUID.randomUUID()).name(inv.getArgument(0))
                        .email("g" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build()));

        PublicStayBookingRequest req = new PublicStayBookingRequest();
        req.setStaySlug(staySlug);
        req.setDate(LocalDate.now().plusDays(30));
        req.setPartySize(2);
        var accSelection = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        accSelection.setAccommodationSlug("dune-suite");
        accSelection.setQuantity(1);
        req.setAccommodations(java.util.List.of(accSelection));
        req.setName("Owner A"); req.setEmail("ownerA@example.com"); req.setPhone("+21650000000");
        reservationId = UUID.fromString(publicBookingService.createStayBooking(req).getId());

        ownerAId = tx.execute(t -> reservationRepository.findByIdWithTourTypes(reservationId)
                .orElseThrow().getUser().getUserId());

        strangerBId = userRepository.save(User.builder()
                .userId(UUID.randomUUID()).name("Stranger B")
                .email("strangerB-" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build()).getUserId();
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    private void as(UUID userId, String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken(userId.toString(), null, role));
    }

    private void asAdmin() {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("admin", null, "ROLE_ADMIN"));
    }

    // ── READ reservation ────────────────────────────────────────────────

    @Test
    void reservationRead_ownerAllowed_strangerRejected_staffAllowed() {
        as(ownerAId, "ROLE_CLIENT");
        assertThat(reservationService.getReservationById(reservationId)).isNotNull();

        as(strangerBId, "ROLE_CLIENT");
        assertThatThrownBy(() -> reservationService.getReservationById(reservationId))
                .isInstanceOf(AccessDeniedException.class);

        asAdmin();
        assertThat(reservationService.getReservationById(reservationId)).isNotNull();
    }

    // ── UPDATE reservation ──────────────────────────────────────────────

    @Test
    void reservationUpdate_strangerRejected_ownerAllowed() {
        ReservationUpdateRequest upd = new ReservationUpdateRequest();
        upd.setGroupName("renamed");

        as(strangerBId, "ROLE_CLIENT");
        assertThatThrownBy(() -> reservationService.updateReservation(reservationId, upd))
                .isInstanceOf(AccessDeniedException.class);

        as(ownerAId, "ROLE_CLIENT");
        assertThat(reservationService.updateReservation(reservationId, upd).getGroupName()).isEqualTo("renamed");
    }

    // ── CANCEL reservation ──────────────────────────────────────────────

    @Test
    void reservationCancel_strangerCannotCancelSomeoneElsesBooking() {
        as(strangerBId, "ROLE_CLIENT");
        assertThatThrownBy(() -> reservationService.updateReservationStatus(
                reservationId, ReservationStatus.CANCELLED, null, null, null))
                .isInstanceOf(AccessDeniedException.class);

        // the reservation is untouched
        ReservationStatus status = tx.execute(t ->
                reservationRepository.findById(reservationId).orElseThrow().getStatus());
        assertThat(status).isNotEqualTo(ReservationStatus.CANCELLED);
    }

    // ── INVOICE read ────────────────────────────────────────────────────

    @Test
    void invoiceRead_strangerRejected_ownerAndStaffAllowed() {
        asAdmin();
        reservationService.updateReservationStatus(
                reservationId, ReservationStatus.CONFIRMED, null, CompanyType.DUNES_INSOLITES, null);
        UUID invoiceId = invoiceService.getInvoicesByReservation(reservationId).get(0).getInvoiceId();

        as(strangerBId, "ROLE_CLIENT");
        assertThatThrownBy(() -> invoiceService.getInvoiceById(invoiceId))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> invoiceService.getInvoicesByReservation(reservationId))
                .isInstanceOf(AccessDeniedException.class);

        as(ownerAId, "ROLE_CLIENT");
        assertThat(invoiceService.getInvoiceById(invoiceId)).isNotNull();

        asAdmin();
        assertThat(invoiceService.getInvoiceById(invoiceId)).isNotNull();
    }

    // ── PAYMENT ─────────────────────────────────────────────────────────

    @Test
    void payment_recordPayment_isStaffOnly_noCustomerCanTouchTheLedger() {
        PaymentRequest pay = new PaymentRequest();
        pay.setAmount(new BigDecimal("10.000"));
        pay.setPaymentMethod(PaymentMethod.CASH);
        pay.setCurrency(Currency.TND);

        // A stranger — denied (IDOR).
        as(strangerBId, "ROLE_CLIENT");
        assertThatThrownBy(() -> paymentService.recordPayment(reservationId, pay))
                .isInstanceOf(AccessDeniedException.class);

        // The OWNER — also denied. recordPayment writes a COMPLETED ledger row;
        // a customer marking their own reservation PAID for free is the P-1
        // finding (security assessment 2026-09-10). Staff record manual
        // payments; online payment lands via a verified provider webhook.
        as(ownerAId, "ROLE_CLIENT");
        assertThatThrownBy(() -> paymentService.recordPayment(reservationId, pay))
                .isInstanceOf(AccessDeniedException.class);

        // Staff can.
        asAdmin();
        assertThat(paymentService.recordPayment(reservationId, pay).getPaymentSummary()).isNotNull();
    }

    // ── generateFactureLater — no longer trusts caller-supplied company ──

    @Test
    void generateFacture_rejectsRouteInsolite_defaultsToDunesWhenAbsent() {
        asAdmin();
        assertThatThrownBy(() -> reservationService.generateFactureLater(reservationId, CompanyType.ROUTE_INSOLITE))
                .isInstanceOf(AccessDeniedException.class);

        var invoice = reservationService.generateFactureLater(reservationId, null);
        assertThat(invoice.getCompanyType()).isEqualTo(CompanyType.DUNES_INSOLITES);
    }

    @Test
    void listByUser_isAlreadyScopedByTheControllerButServiceReturnsOnlyThatUsersRows() {
        // getReservationsByUser is called only behind a controller @PreAuthorize
        // that pins #userId to the caller; assert the query itself is per-user.
        var aRows = reservationService.getReservationsByUser(ownerAId);
        var bRows = reservationService.getReservationsByUser(strangerBId);
        assertThat(aRows).hasSize(1);
        assertThat(bRows).isEmpty();
    }

    @Test
    void authenticatedCreate_cannotAttributeAReservationToAnotherUser() {
        // stranger B is authenticated and POSTs a reservation whose userId is
        // owner A. The server must force it back to B (mass-assignment guard).
        as(strangerBId, "ROLE_CLIENT");

        com.camping.duneinsolite.model.Extra e = new com.camping.duneinsolite.model.Extra();
        e.setName("Quad"); e.setSlug("quad-" + java.util.UUID.randomUUID());
        e.setUnitPrice(new java.math.BigDecimal("30.000")); e.setTva(java.math.BigDecimal.ZERO);
        e.setIsActive(true);
        var extra = extraRepository.save(e);

        var req = new com.camping.duneinsolite.dto.request.ReservationRequest();
        req.setUserId(ownerAId);                                   // ← the attack
        req.setSourceId(sourceRepository.findByName("Site web").orElseThrow().getSourceId());
        req.setReservationType(com.camping.duneinsolite.model.enums.ReservationType.EXTRAS);
        req.setServiceDate(java.time.LocalDate.now().plusDays(10));
        req.setNumberOfAdults(1);
        var er = new com.camping.duneinsolite.dto.request.ReservationExtraRequest();
        er.setExtraId(extra.getExtraId());
        er.setQuantity(1);
        er.setActivityDate(java.time.LocalDate.now().plusDays(10));
        req.setExtras(java.util.List.of(er));

        var created = reservationService.createReservation(req);

        assertThat(created.getUserId()).as("forced back to the caller").isEqualTo(strangerBId);
        assertThat(created.getUserId()).isNotEqualTo(ownerAId);
    }

    // ── RESERVATION EXTRAS (final-hardening pass — this path had no owner check) ──

    @Test
    void reservationExtras_strangerCannotAddToOrReadAnotherCustomersReservation() {
        com.camping.duneinsolite.model.Extra e = new com.camping.duneinsolite.model.Extra();
        e.setName("Camel trek"); e.setSlug("camel-" + java.util.UUID.randomUUID());
        e.setUnitPrice(new java.math.BigDecimal("40.000")); e.setTva(java.math.BigDecimal.ZERO);
        e.setIsActive(true);
        var catalog = extraRepository.save(e);

        var addReq = new com.camping.duneinsolite.dto.request.ReservationExtraRequest();
        addReq.setReservationId(reservationId);          // owner A's reservation
        addReq.setExtraId(catalog.getExtraId());
        addReq.setQuantity(1);
        addReq.setActivityDate(LocalDate.now().plusDays(31));

        // Stranger B may not add a paid extra to owner A's booking …
        as(strangerBId, "ROLE_CLIENT");
        assertThatThrownBy(() -> reservationExtraService.createExtra(addReq))
                .isInstanceOf(AccessDeniedException.class);
        // … nor read the reservation's extras.
        assertThatThrownBy(() -> reservationExtraService.getExtrasByReservation(reservationId))
                .isInstanceOf(AccessDeniedException.class);

        // Owner A can. Staff can.
        as(ownerAId, "ROLE_CLIENT");
        var created = reservationExtraService.createExtra(addReq);
        assertThat(created.getReservationExtraId()).isNotNull();

        asAdmin();
        assertThat(reservationExtraService.getExtrasByReservation(reservationId).getExtras()).isNotEmpty();

        // Stranger B still can't read the individual line by id.
        UUID lineId = created.getReservationExtraId();
        as(strangerBId, "ROLE_CLIENT");
        assertThatThrownBy(() -> reservationExtraService.getExtraById(lineId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @org.springframework.beans.factory.annotation.Autowired
    com.camping.duneinsolite.repository.ExtraRepository extraRepository;
    @org.springframework.beans.factory.annotation.Autowired
    com.camping.duneinsolite.service.ReservationExtraService reservationExtraService;
}
