package com.camping.duneinsolite.privacy;

import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.dto.response.UserDataExport;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.PublicBookingService;
import com.camping.duneinsolite.service.UserDataExportService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.rabbitmq.RabbitMQContainer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Phase 5 — GDPR Art. 15 / 20 self-service export.
 *
 * Proves: the export is scoped to the JWT subject (never a request id), an
 * unauthenticated call fails closed, one user's export never contains another
 * user's data, and no credential / secret field is ever present.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false"
})
@Testcontainers
class UserDataExportIT {

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

    @Autowired UserDataExportService exportService;
    @Autowired PublicBookingService publicBookingService;
    @Autowired TourTypeRepository tourTypeRepository;
    @Autowired AccommodationTypeRepository accommodationTypeRepository;
    @Autowired ReservationRepository reservationRepository;
    @Autowired UserRepository userRepository;
    @Autowired SourceRepository sourceRepository;
    @Autowired NewsletterSubscriberRepository newsletterSubscriberRepository;

    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();

    private UUID ownerAId;
    private String ownerAEmail;
    private UUID strangerBId;
    private String strangerBEmail;

    @BeforeEach
    void seed() {
        String slug = "export-nuitee-" + UUID.randomUUID();
        sourceRepository.findByName("Site web")
                .orElseGet(() -> sourceRepository.save(Source.builder().name("Site web").build()));

        TourType stay = tourTypeRepository.save(TourType.builder()
                .name("Export nuitée").slug(slug).isActive(true)
                .passengerAdultPrice(new BigDecimal("100.0")).passengerChildPrice(new BigDecimal("100.0"))
                .partnerAdultPrice(new BigDecimal("100.0")).partnerChildPrice(new BigDecimal("100.0"))
                .tva(BigDecimal.ZERO).build());
        accommodationTypeRepository.save(AccommodationType.builder()
                .tourType(stay).slug("dune-suite").name("Dune Suite").capacity(4)
                .unitPriceTtc(new BigDecimal("165.000")).tvaRate(new BigDecimal("7"))
                .displayOrder(0).active(true).build());

        ownerAEmail = "ownerA-" + UUID.randomUUID() + "@example.com";
        Mockito.when(keycloakUserSyncService.createInvitedGuestUser(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenAnswer(inv -> userRepository.save(User.builder()
                        .userId(UUID.randomUUID()).name(inv.getArgument(0))
                        .email(ownerAEmail).role(UserRole.CLIENT).build()));

        PublicStayBookingRequest req = new PublicStayBookingRequest();
        req.setStaySlug(slug);
        req.setDate(LocalDate.now().plusDays(30));
        req.setPartySize(2);
        var accSelection = new com.camping.duneinsolite.dto.request.publicapi.PublicAccommodationSelectionRequest();
        accSelection.setAccommodationSlug("dune-suite");
        accSelection.setQuantity(1);
        req.setAccommodations(java.util.List.of(accSelection));
        req.setName("Owner A"); req.setEmail(ownerAEmail); req.setPhone("+21650000001");
        UUID reservationId = UUID.fromString(publicBookingService.createStayBooking(req).getId());
        ownerAId = reservationRepository.findById(reservationId).orElseThrow().getUser().getUserId();

        newsletterSubscriberRepository.save(
                NewsletterSubscriber.builder().email(ownerAEmail.toLowerCase()).build());

        strangerBEmail = "strangerB-" + UUID.randomUUID() + "@example.com";
        strangerBId = userRepository.save(User.builder()
                .userId(UUID.randomUUID()).name("Stranger B")
                .email(strangerBEmail).role(UserRole.CLIENT).build()).getUserId();
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    private void as(UUID userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken(userId.toString(), null, "ROLE_CLIENT"));
    }

    @Test
    void authenticatedUserExportsOwnData_scopedToTheJwtSubject() {
        as(ownerAId);
        UserDataExport export = exportService.exportForCurrentUser();

        assertThat(export.profile().getUserId()).isEqualTo(ownerAId);
        assertThat(export.profile().getEmail()).isEqualTo(ownerAEmail);
        assertThat(export.reservations()).hasSize(1);
        assertThat(export.newsletter().subscribed()).isTrue();
        assertThat(export.exportedAt()).isNotNull();
    }

    @Test
    void unauthenticatedExportIsRejected() {
        SecurityContextHolder.clearContext();
        assertThatThrownBy(() -> exportService.exportForCurrentUser())
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void oneUsersExportNeverContainsAnotherUsersData() throws Exception {
        as(strangerBId);
        UserDataExport bExport = exportService.exportForCurrentUser();

        assertThat(bExport.profile().getUserId()).isEqualTo(strangerBId);
        assertThat(bExport.reservations()).isEmpty();
        assertThat(bExport.invoices()).isEmpty();
        assertThat(bExport.transactions()).isEmpty();
        assertThat(bExport.newsletter().subscribed()).isFalse();

        String asJson = json.writeValueAsString(bExport);
        assertThat(asJson).doesNotContain(ownerAEmail).doesNotContain(ownerAId.toString());
    }

    @Test
    void exportCarriesNoCredentialOrSecretField() throws Exception {
        as(ownerAId);
        String asJson = json.writeValueAsString(exportService.exportForCurrentUser()).toLowerCase();

        assertThat(asJson)
                .doesNotContain("password")
                .doesNotContain("passwordhash")
                .doesNotContain("\"hash\"")
                .doesNotContain("secret")
                .doesNotContain("access_token").doesNotContain("accesstoken")
                .doesNotContain("refresh_token").doesNotContain("refreshtoken")
                .doesNotContain("credential")
                .doesNotContain("client-secret");
    }
}
