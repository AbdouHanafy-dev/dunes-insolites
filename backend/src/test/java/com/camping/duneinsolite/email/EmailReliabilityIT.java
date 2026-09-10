package com.camping.duneinsolite.email;

import com.camping.duneinsolite.config.RabbitMQConfig;
import com.camping.duneinsolite.dto.message.NotificationMessage;
import com.camping.duneinsolite.model.DeadLetterMessage;
import com.camping.duneinsolite.model.EmailDispatch;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.observability.EmailMetrics;
import com.camping.duneinsolite.repository.DeadLetterMessageRepository;
import com.camping.duneinsolite.repository.EmailDispatchRepository;
import com.camping.duneinsolite.repository.ReservationRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.DeadLetterAdminService;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.NotificationPublisher;
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.rabbitmq.RabbitMQContainer;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * End-to-end reliability of the transactional-email pipeline against REAL
 * infrastructure - Postgres + RabbitMQ in containers, nothing mocked but the
 * SMTP transport (whose success/failure is the variable under test).
 *
 * Proves item 2's contract:
 *   1. success            -> email_dispatch SENT, no DLQ, message acked
 *   2. transient failure  -> retried, then SENT, still no DLQ
 *   3. permanent failure  -> retries exhausted -> notification.dlq
 *                            -> durable dead_letter_message row
 *   4. duplicate delivery -> second message sends NO second email
 *   5. replay             -> message re-published, delivered, record REPLAYED
 *   6. metric names       -> email_dispatch_total / email_dead_letter_total on
 *                            the Prometheus scrape
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.endpoints.web.exposure.include=health,metrics,prometheus",
        "management.health.mail.enabled=false",
        "spring.rabbitmq.listener.simple.retry.enabled=false",
        "app.email.retry.max-attempts=3",
        "app.email.retry.initial-interval-ms=150",
        "app.email.retry.multiplier=1.0",
        "app.email.retry.max-interval-ms=150"
})
@Testcontainers
class EmailReliabilityIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

    @Container
    static final RabbitMQContainer RABBIT = new RabbitMQContainer("rabbitmq:3-management");

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

    @MockitoBean
    JavaMailSender mailSender;
    @MockitoBean
    KeycloakUserSyncService keycloakUserSyncService;

    @Autowired NotificationPublisher publisher;
    @Autowired EmailDispatchRepository dispatchRepo;
    @Autowired DeadLetterMessageRepository dlqRepo;
    @Autowired UserRepository userRepo;
    @Autowired ReservationRepository reservationRepo;
    @Autowired DeadLetterAdminService deadLetterAdminService;
    @Autowired PrometheusMeterRegistry prometheus;
    @Autowired EmailMetrics emailMetrics;

    @org.springframework.boot.test.web.server.LocalServerPort
    int port;

    private final java.net.http.HttpClient http = java.net.http.HttpClient.newHttpClient();

    private int statusOf(String method, String path) throws Exception {
        var req = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create("http://localhost:" + port + path))
                .method(method, java.net.http.HttpRequest.BodyPublishers.noBody())
                .build();
        return http.send(req, java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    private final AtomicInteger sendCalls = new AtomicInteger();
    private UUID reservationId;

    @BeforeEach
    void setUp() {
        sendCalls.set(0);
        MimeMessage stub = new MimeMessage(jakarta.mail.Session.getInstance(new Properties()));
        Mockito.when(mailSender.createMimeMessage()).thenReturn(stub);

        User user = userRepo.save(User.builder()
                .userId(UUID.randomUUID())
                .name("Test Guest")
                .email("guest+" + UUID.randomUUID() + "@example.com")
                .role(UserRole.CLIENT)
                .build());
        Reservation reservation = reservationRepo.save(Reservation.builder()
                .user(user)
                .reservationType(ReservationType.HEBERGEMENT)
                .checkInDate(LocalDate.now().plusDays(10))
                .checkOutDate(LocalDate.now().plusDays(11))
                .numberOfAdults(2)
                .status(ReservationStatus.PENDING)
                .totalAmount(new java.math.BigDecimal("190.0"))
                .currency(Currency.TND)
                .build());
        reservationId = reservation.getReservationId();
    }

    @AfterEach
    void tearDown() {
        dlqRepo.deleteAll();
        dispatchRepo.deleteAll();
        reservationRepo.deleteAll();
        userRepo.deleteAll();
        Mockito.reset(mailSender);
    }

    private void publishCreated() {
        publisher.publish(RabbitMQConfig.RESERVATION_CREATED, NotificationMessage.builder()
                .type(NotificationType.RESERVATION_CREATED)
                .reservationId(reservationId)
                .title("Nouvelle réservation")
                .message("test")
                .build());
    }

    private void sendSucceeds() {
        Mockito.doAnswer(i -> { sendCalls.incrementAndGet(); return null; })
                .when(mailSender).send(Mockito.any(MimeMessage.class));
    }

    private void sendAlwaysFails() {
        Mockito.doAnswer(i -> {
            sendCalls.incrementAndGet();
            throw new MailSendException("SMTP unavailable (test)");
        }).when(mailSender).send(Mockito.any(MimeMessage.class));
    }

    // ── 1 ───────────────────────────────────────────────────────────────
    @Test
    void successfulSend_marksDispatchSent_noDeadLetter() {
        sendSucceeds();
        publishCreated();

        await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> {
            EmailDispatch d = dispatchRepo.findByReservationIdAndEmailType(
                    reservationId, EmailType.RESERVATION_RECEIVED).orElseThrow();
            assertThat(d.getStatus()).isEqualTo(EmailDispatchStatus.SENT);
            assertThat(d.getAttempts()).isEqualTo(1);
        });
        assertThat(sendCalls.get()).isEqualTo(1);
        assertThat(dlqRepo.count()).isZero();
    }

    // ── 2 ───────────────────────────────────────────────────────────────
    @Test
    void transientFailureThenSuccess_retriesAndSendsExactlyOnce_noDeadLetter() {
        Mockito.doAnswer(i -> {
            int n = sendCalls.incrementAndGet();
            if (n == 1) throw new MailSendException("first attempt fails (test)");
            return null;
        }).when(mailSender).send(Mockito.any(MimeMessage.class));

        publishCreated();

        await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> {
            EmailDispatch d = dispatchRepo.findByReservationIdAndEmailType(
                    reservationId, EmailType.RESERVATION_RECEIVED).orElseThrow();
            assertThat(d.getStatus()).isEqualTo(EmailDispatchStatus.SENT);
            assertThat(d.getAttempts()).isGreaterThanOrEqualTo(2);
        });
        assertThat(sendCalls.get()).isGreaterThanOrEqualTo(2);
        assertThat(dlqRepo.count()).isZero();
    }

    // ── 3 ───────────────────────────────────────────────────────────────
    @Test
    void permanentFailure_exhaustsRetries_thenDurableDeadLetterRecord() {
        sendAlwaysFails();
        publishCreated();

        await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> {
            assertThat(dlqRepo.count()).isEqualTo(1);
            DeadLetterMessage dl = dlqRepo.findAll().get(0);
            assertThat(dl.getQueueName()).isEqualTo(RabbitMQConfig.EMAIL_QUEUE);
            assertThat(dl.getStatus()).isEqualTo(DeadLetterStatus.UNRESOLVED);
            assertThat(dl.getReservationId()).isEqualTo(reservationId);
            assertThat(dl.getPayload()).contains(reservationId.toString());
        });
        EmailDispatch d = dispatchRepo.findByReservationIdAndEmailType(
                reservationId, EmailType.RESERVATION_RECEIVED).orElseThrow();
        assertThat(d.getStatus()).isEqualTo(EmailDispatchStatus.FAILED);
        // 3 attempts configured (maxRetries = 2)
        assertThat(sendCalls.get()).isEqualTo(3);
    }

    // ── 4 ───────────────────────────────────────────────────────────────
    @Test
    void duplicateDelivery_afterSuccess_sendsNoSecondEmail() {
        sendSucceeds();
        publishCreated();
        await().atMost(Duration.ofSeconds(20)).until(() ->
                dispatchRepo.findByReservationIdAndEmailType(reservationId, EmailType.RESERVATION_RECEIVED)
                        .map(d -> d.getStatus() == EmailDispatchStatus.SENT).orElse(false));
        assertThat(sendCalls.get()).isEqualTo(1);

        publishCreated(); // exact same event again

        // give the consumer time to process and (correctly) skip
        await().during(Duration.ofSeconds(3)).atMost(Duration.ofSeconds(6))
                .untilAsserted(() -> assertThat(sendCalls.get()).isEqualTo(1));
        assertThat(dispatchRepo.count()).isEqualTo(1);
        assertThat(dlqRepo.count()).isZero();
    }

    // ── 5 ───────────────────────────────────────────────────────────────
    @Test
    void replay_reprocessesAndReachesSent_recordMarkedReplayed() {
        sendAlwaysFails();
        publishCreated();
        await().atMost(Duration.ofSeconds(30)).until(() -> dlqRepo.count() == 1);
        UUID dlId = dlqRepo.findAll().get(0).getId();

        sendCalls.set(0);
        sendSucceeds();
        DeadLetterMessage replayed = deadLetterAdminService.replay(dlId, "admin-test");
        assertThat(replayed.getStatus()).isEqualTo(DeadLetterStatus.REPLAYED);
        assertThat(replayed.getReplayedBy()).isEqualTo("admin-test");

        await().atMost(Duration.ofSeconds(20)).untilAsserted(() -> {
            EmailDispatch d = dispatchRepo.findByReservationIdAndEmailType(
                    reservationId, EmailType.RESERVATION_RECEIVED).orElseThrow();
            assertThat(d.getStatus()).isEqualTo(EmailDispatchStatus.SENT);
        });
        assertThat(sendCalls.get()).isGreaterThanOrEqualTo(1);
    }

    // ── 6 — the replay/inspect endpoint is server-side authorized ───────
    @Test
    void deadLetterAdminEndpointRejectsUnauthenticatedCallers() throws Exception {
        assertThat(statusOf("GET", "/api/admin/ops/dead-letters")).isEqualTo(401);
        assertThat(statusOf("POST", "/api/admin/ops/dead-letters/" + UUID.randomUUID() + "/replay"))
                .isIn(401, 403);
    }

    // ── 7 ───────────────────────────────────────────────────────────────
    @Test
    void metricsAreExportedWithPrometheusNames() {
        emailMetrics.emailSent();
        emailMetrics.deadLetterRecorded();
        String scrape = prometheus.scrape();
        assertThat(scrape).contains("email_dispatch_total");
        assertThat(scrape).contains("result=\"sent\"");
        assertThat(scrape).contains("email_dead_letter_total");
        assertThat(scrape).contains("action=\"recorded\"");
    }
}
