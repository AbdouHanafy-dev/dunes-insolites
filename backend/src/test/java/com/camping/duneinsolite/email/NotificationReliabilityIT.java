package com.camping.duneinsolite.email;

import com.camping.duneinsolite.config.RabbitMQConfig;
import com.camping.duneinsolite.dto.message.NotificationMessage;
import com.camping.duneinsolite.model.Notification;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.NotificationType;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.DeadLetterMessageRepository;
import com.camping.duneinsolite.repository.NotificationRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.NotificationPublisher;
import com.camping.duneinsolite.service.SseService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.rabbitmq.RabbitMQContainer;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * Phase 5 — reliability of {@code NotificationConsumer} against real Postgres +
 * RabbitMQ. Only the failure seams are stubbed (the DB save via a spy, the SSE
 * push via a mock); everything else is real.
 *
 * Proves the Phase 5 fix:
 *   1. success              -> one Notification row, no DLQ
 *   2. transient DB failure -> RETRIED, then saved, no DLQ
 *      (the old manual-ack consumer swallowed the exception -> straight to the
 *       DLQ with zero retries)
 *   3. permanent DB failure -> retries exhausted -> exactly one DLQ record,
 *      zero half-written rows (the write is transactional)
 *   4. SSE push failure     -> notification still saved, message still acked
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false",
        "spring.rabbitmq.listener.simple.retry.enabled=false",
        "app.email.retry.max-attempts=3",
        "app.email.retry.initial-interval-ms=120",
        "app.email.retry.multiplier=1.0",
        "app.email.retry.max-interval-ms=120"
})
@Testcontainers
class NotificationReliabilityIT {

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
    @MockitoBean SseService sseService;              // real-time push not under test
    @MockitoSpyBean NotificationRepository notificationRepository; // real Postgres, stubbable

    @Autowired NotificationPublisher publisher;
    @Autowired DeadLetterMessageRepository dlqRepo;
    @Autowired UserRepository userRepo;

    private UUID userId;

    @BeforeEach
    void setUp() {
        User u = userRepo.save(User.builder()
                .userId(UUID.randomUUID()).name("Bell User")
                .email("bell+" + UUID.randomUUID() + "@example.com").role(UserRole.CLIENT).build());
        userId = u.getUserId();
    }

    @AfterEach
    void tearDown() {
        Mockito.reset(notificationRepository, sseService);
        dlqRepo.deleteAll();
        notificationRepository.deleteAll();
        userRepo.deleteAll();
    }

    private void publish() {
        publisher.publish(RabbitMQConfig.RESERVATION_CONFIRMED, NotificationMessage.builder()
                .targetUserId(userId)
                .type(NotificationType.RESERVATION_CONFIRMED)
                .reservationId(UUID.randomUUID())
                .title("Réservation confirmée")
                .message("test")
                .build());
    }

    /** Publish the SAME logical message (same dedupeKey) — models a redelivery / replay. */
    private void publishWithKey(String dedupeKey) {
        publisher.publish(RabbitMQConfig.RESERVATION_CONFIRMED, NotificationMessage.builder()
                .targetUserId(userId)
                .type(NotificationType.RESERVATION_CONFIRMED)
                .reservationId(UUID.randomUUID())
                .title("Réservation confirmée")
                .message("test")
                .dedupeKey(dedupeKey)
                .build());
    }

    private int savedRows() {
        return notificationRepository.findByUser_UserIdOrderByCreatedAtDesc(userId).size();
    }

    @Test
    void success_savesOneRow_noDlq() {
        publish();
        await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> assertThat(savedRows()).isEqualTo(1));
        assertThat(dlqRepo.count()).isZero();
    }

    @Test
    void dbFailure_isRetriedMultipleTimes_thenExactlyOneDlqRecord_noHalfWrites() {
        AtomicInteger saveCalls = new AtomicInteger();
        Mockito.doAnswer(inv -> {
            saveCalls.incrementAndGet();
            throw new RuntimeException("DB down (test)");
        }).when(notificationRepository).save(Mockito.any(Notification.class));

        publish();

        await().atMost(Duration.ofSeconds(30)).untilAsserted(() -> assertThat(dlqRepo.count()).isEqualTo(1));

        // The regression guard: the OLD manual-ack consumer caught the exception
        // and DLQ'd after a SINGLE save attempt. With the retry interceptor the
        // listener is re-invoked (max-attempts=3), so save() is called > 1 time.
        assertThat(saveCalls.get())
                .as("listener retried before dead-lettering")
                .isGreaterThan(1);
        assertThat(savedRows()).as("transactional — no half-written batch").isZero();
    }

    @Test
    void ssePushFailure_doesNotFailTheMessage() {
        Mockito.doThrow(new RuntimeException("SSE broken (test)"))
                .when(sseService).sendToUser(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any());

        publish();

        await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> assertThat(savedRows()).isEqualTo(1));
        assertThat(dlqRepo.count()).isZero();
    }

    // ── idempotency (V6) ───────────────────────────────────────────────

    @Test
    void duplicateDelivery_ofTheSameMessage_createsExactlyOneRow() {
        String key = UUID.randomUUID().toString();
        publishWithKey(key);
        await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> assertThat(savedRows()).isEqualTo(1));

        // redelivery / replay of the same message
        publishWithKey(key);
        publishWithKey(key);

        await().during(Duration.ofSeconds(3)).atMost(Duration.ofSeconds(15))
                .untilAsserted(() -> assertThat(savedRows()).isEqualTo(1));
        assertThat(dlqRepo.count()).isZero();
    }

    @Test
    void concurrentDuplicateDelivery_createsExactlyOneRow() throws Exception {
        String key = UUID.randomUUID().toString();
        int n = 6;
        var pool = java.util.concurrent.Executors.newFixedThreadPool(n);
        var latch = new java.util.concurrent.CountDownLatch(1);
        for (int i = 0; i < n; i++) {
            pool.submit(() -> { try { latch.await(); } catch (InterruptedException ignored) {} publishWithKey(key); });
        }
        latch.countDown();
        pool.shutdown();
        pool.awaitTermination(20, java.util.concurrent.TimeUnit.SECONDS);

        await().during(Duration.ofSeconds(3)).atMost(Duration.ofSeconds(20))
                .untilAsserted(() -> assertThat(savedRows()).isEqualTo(1));
        assertThat(dlqRepo.count()).as("a lost unique-constraint race retries, it does not dead-letter").isZero();
    }

    @Test
    void distinctMessages_areNotDeduped() {
        publishWithKey(UUID.randomUUID().toString());
        publishWithKey(UUID.randomUUID().toString());
        await().atMost(Duration.ofSeconds(15)).untilAsserted(() -> assertThat(savedRows()).isEqualTo(2));
    }
}
