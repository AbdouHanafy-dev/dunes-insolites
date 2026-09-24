package com.camping.duneinsolite.accommodation;

import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.dto.response.InvoiceResponse;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.InvoiceService;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.PublicBookingService;
import com.camping.duneinsolite.service.ReservationService;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Phase 3 — the money path end to end, against real Postgres:
 * accommodation booking → CONFIRM → auto-generated proforma invoice.
 *
 * Proves: invoice lines / HT / TVA / TTC are computed with {@code BigDecimal}
 * via {@code Money}, HT + TVA reconciles to the authoritative TTC to the millime,
 * and a later catalogue price change never moves an already-issued invoice or
 * its reservation (historical financial stability).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false"
})
@Testcontainers
class ReservationInvoiceIT {

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
    @Autowired TourTypeRepository tourTypeRepository;
    @Autowired AccommodationTypeRepository accommodationTypeRepository;
    @Autowired ReservationRepository reservationRepository;
    @Autowired UserRepository userRepository;
    @Autowired SourceRepository sourceRepository;
    @Autowired TransactionTemplate tx;

    private String staySlug;
    private UUID suiteId;

    @BeforeEach
    void seed() {
        staySlug = "phase3-nuitee-" + UUID.randomUUID();
        sourceRepository.findByName("Site web")
                .orElseGet(() -> sourceRepository.save(Source.builder().name("Site web").build()));

        TourType stay = tourTypeRepository.save(TourType.builder()
                .name("Phase 3 nuitée").slug(staySlug).isActive(true)
                .passengerAdultPrice(new BigDecimal("999.0")).passengerChildPrice(new BigDecimal("999.0"))
                .partnerAdultPrice(new BigDecimal("999.0")).partnerChildPrice(new BigDecimal("999.0"))
                .tva(BigDecimal.ZERO).build());

        suiteId = accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("dune-suite").name("Dune Suite").capacity(4)
                .unitPriceTtc(new BigDecimal("165.000")).tvaRate(new BigDecimal("7"))
                .displayOrder(0).active(true).build()).getId();

        Mockito.when(keycloakUserSyncService.createInvitedGuestUser(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenAnswer(inv -> userRepository.save(User.builder()
                        .userId(UUID.randomUUID()).name(inv.getArgument(0))
                        .email("g" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build()));
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    private PublicStayBookingRequest req() {
        PublicStayBookingRequest r = new PublicStayBookingRequest();
        r.setStaySlug(staySlug);
        r.setDate(LocalDate.now().plusDays(30));
        r.setPartySize(2);
        var accSelection = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        accSelection.setAccommodationSlug("dune-suite");
        accSelection.setQuantity(1);
        r.setAccommodations(java.util.List.of(accSelection));
        r.setName("Guest"); r.setEmail("guest@example.com"); r.setPhone("+21650000000");
        return r;
    }

    private void asAdmin() {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken(UUID.randomUUID().toString(), null, "ROLE_ADMIN"));
    }

    private InvoiceResponse confirmAndGetProforma(UUID resId) {
        asAdmin();
        reservationService.updateReservationStatus(
                resId, ReservationStatus.CONFIRMED, null, CompanyType.DUNES_INSOLITES, null);
        List<InvoiceResponse> invoices = invoiceService.getInvoicesByReservation(resId);
        assertThat(invoices).isNotEmpty();
        return invoices.get(invoices.size() - 1);
    }

    private UUID book() {
        var previous = SecurityContextHolder.getContext().getAuthentication();
        SecurityContextHolder.clearContext();
        try {
            return UUID.fromString(publicBookingService.createStayBooking(req()).getId());
        } finally {
            if (previous != null) {
                SecurityContextHolder.getContext().setAuthentication(previous);
            }
        }
    }

    private InvoiceResponse latestInvoice(UUID resId) {
        List<InvoiceResponse> invoices = invoiceService.getInvoicesByReservation(resId);
        return invoices.get(invoices.size() - 1);
    }

    private InvoiceResponse invoiceOfType(UUID resId, InvoiceType type) {
        return invoiceService.getInvoicesByReservation(resId).stream()
                .filter(i -> i.getInvoiceType() == type).reduce((a, b) -> b).orElseThrow();
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
    void confirmGeneratesAProformaWhoseHtPlusTvaReconcilesToTheAuthoritativeTtc() {
        var resp = publicBookingService.createStayBooking(req());
        UUID resId = UUID.fromString(resp.getId());

        InvoiceResponse proforma = confirmAndGetProforma(resId);

        assertThat(proforma.getInvoiceType()).isEqualTo(InvoiceType.PROFORMA);
        assertThat(proforma.getTotalTtc()).isEqualByComparingTo("165.000");
        // 165.000 TTC @ 7% → 154.206 HT + 10.794 TVA
        assertThat(proforma.getTotalHt()).isEqualByComparingTo("154.206");
        assertThat(proforma.getTvaAmount()).isEqualByComparingTo("10.794");
        assertThat(proforma.getTotalHt().add(proforma.getTvaAmount()))
                .as("HT + TVA reconciles to TTC to the millime")
                .isEqualByComparingTo(proforma.getTotalTtc());

        assertThat(proforma.getItems()).hasSize(1);
        var item = proforma.getItems().get(0);
        assertThat(item.getItemType()).isEqualTo("HEBERGEMENT");
        assertThat(item.getQuantity()).isEqualTo(1);
        assertThat(item.getUnitPrice()).isEqualByComparingTo("154.206"); // HT
        assertThat(item.getTva()).isEqualByComparingTo("7");
    }

    @Test
    void aLaterCataloguePriceChangeDoesNotMoveTheIssuedInvoiceOrItsReservation() {
        var resp = publicBookingService.createStayBooking(req());
        UUID resId = UUID.fromString(resp.getId());
        InvoiceResponse proforma = confirmAndGetProforma(resId);
        UUID invoiceId = proforma.getInvoiceId();

        tx.executeWithoutResult(t -> {
            AccommodationType suite = accommodationTypeRepository.findById(suiteId).orElseThrow();
            suite.setUnitPriceTtc(new BigDecimal("999.000"));
            accommodationTypeRepository.save(suite);
        });

        InvoiceResponse reloaded = invoiceService.getInvoiceById(invoiceId);
        assertThat(reloaded.getTotalTtc()).as("issued invoice is immutable to catalogue changes")
                .isEqualByComparingTo("165.000");

        Reservation res = load(resId);
        assertThat(res.getTotalAmount()).isEqualByComparingTo("165.000");
        assertThat(res.getTourTypes().get(0).getAccommodations().get(0).getAccommodationUnitPriceTtc()).isEqualByComparingTo("165.000");
    }

    // ── Characterization net added before the ReservationInvoiceService
    //    extraction (final-hardening pass). These lock in the behaviour of the
    //    FACTURE path, the manual generateFactureLater path, the document
    //    sequence and the invoice payment-status derivation so the extraction
    //    is provably behaviour-identical. ──────────────────────────────────────

    @Test
    void completingAConfirmedReservationGeneratesAStandardFactureWithTimbreFiscal() {
        UUID resId = book();
        asAdmin();
        reservationService.updateReservationStatus(
                resId, ReservationStatus.CONFIRMED, null, CompanyType.DUNES_INSOLITES, null);
        reservationService.updateReservationStatus(
                resId, ReservationStatus.COMPLETED, null, CompanyType.DUNES_INSOLITES, null);

        InvoiceResponse facture = invoiceOfType(resId, InvoiceType.STANDARD);
        assertThat(facture.getInvoiceType()).isEqualTo(InvoiceType.STANDARD);
        // 165.000 TTC @ 7% → 154.206 HT + 10.794 TVA, plus the timbre fiscal: 1 TND
        // expressed in the reservation currency (EUR, base) = 1 / 3.4 = 0.294
        assertThat(facture.getTotalHt()).isEqualByComparingTo("154.206");
        assertThat(facture.getTvaAmount()).isEqualByComparingTo("10.794");
        assertThat(facture.getTimbreFiscal()).isEqualByComparingTo("0.294");
        assertThat(facture.getTotalTtc())
                .as("FACTURE TTC = HT + TVA + timbre fiscal, to the millime")
                .isEqualByComparingTo("165.294");
        assertThat(facture.getInvoiceDate()).isEqualTo(LocalDate.now());
        assertThat(facture.getPaymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        assertThat(facture.getPaidAmount()).isEqualByComparingTo("0.000");

        // The proforma from CONFIRM is still there and unchanged.
        InvoiceResponse proforma = invoiceOfType(resId, InvoiceType.PROFORMA);
        assertThat(proforma.getTotalTtc()).isEqualByComparingTo("165.000");
    }

    @Test
    void generateFactureLater_isRejectedForRouteInsolite_defaultsToDunes_andReturnsTheFacture() {
        UUID resId = book();
        asAdmin();
        reservationService.updateReservationStatus(
                resId, ReservationStatus.CONFIRMED, null, CompanyType.DUNES_INSOLITES, null);

        // Phase-4 fail-closed guard: nobody can mint a Route Insolite invoice yet.
        assertThatThrownBy(() ->
                reservationService.generateFactureLater(resId, CompanyType.ROUTE_INSOLITE))
                .isInstanceOf(AccessDeniedException.class);

        // null companyType resolves to DUNES_INSOLITES and produces a STANDARD facture.
        InvoiceResponse facture = reservationService.generateFactureLater(resId, null);
        assertThat(facture.getInvoiceType()).isEqualTo(InvoiceType.STANDARD);
        assertThat(facture.getCompanyType()).isEqualTo(CompanyType.DUNES_INSOLITES);
        assertThat(facture.getTotalTtc()).isEqualByComparingTo("165.294");
        assertThat(facture.getInvoiceDate())
                .as("not completed → invoice date is today")
                .isEqualTo(LocalDate.now());
    }

    @Test
    void documentSequenceNumbersAreYearScopedAndIncrementPerType() {
        asAdmin();
        UUID a = book();
        reservationService.updateReservationStatus(
                a, ReservationStatus.CONFIRMED, null, CompanyType.DUNES_INSOLITES, null);
        String firstProforma = invoiceOfType(a, InvoiceType.PROFORMA).getInvoiceNumber();

        UUID b = book();
        reservationService.updateReservationStatus(
                b, ReservationStatus.CONFIRMED, null, CompanyType.DUNES_INSOLITES, null);
        String secondProforma = invoiceOfType(b, InvoiceType.PROFORMA).getInvoiceNumber();

        int year = LocalDate.now().getYear();
        assertThat(firstProforma).matches("\\d{3}/" + year);
        assertThat(secondProforma).matches("\\d{3}/" + year);

        int n1 = Integer.parseInt(firstProforma.substring(0, 3));
        int n2 = Integer.parseInt(secondProforma.substring(0, 3));
        assertThat(n2).as("proforma counter increments").isEqualTo(n1 + 1);
    }

}
