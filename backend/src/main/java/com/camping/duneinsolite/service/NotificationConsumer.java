package com.camping.duneinsolite.service;

import static com.camping.duneinsolite.observability.LogSanitizer.maskEmail;
import com.camping.duneinsolite.config.RabbitMQConfig;
import com.camping.duneinsolite.dto.message.NotificationMessage;
import com.camping.duneinsolite.model.Notification;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.repository.NotificationRepository;
import com.camping.duneinsolite.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * Turns a {@link NotificationMessage} into per-recipient {@code Notification}
 * rows (the bell-icon history) and a best-effort real-time SSE push.
 *
 * <p><b>Reliability (Phase 5):</b>
 * <ul>
 *   <li>Runs on {@code notificationListenerContainerFactory} — AUTO ack + an
 *       in-process retry interceptor with backoff, then
 *       {@code RejectAndDontRequeueRecoverer} → the queue's
 *       {@code x-dead-letter-exchange} → {@code notification.dlq}. A transient
 *       failure now <em>retries</em> instead of going straight to the DLQ (the
 *       previous manual-ack version caught every exception itself, so the yml
 *       retry advice never fired).</li>
 *   <li>The DB writes run in one transaction: a failure rolls all of them back,
 *       so a retry re-inserts cleanly and never leaves a half-delivered batch
 *       (the previous version could persist 3 of 5 recipients, then DLQ, then
 *       re-persist all 5 on replay).</li>
 *   <li>The SSE push is best-effort and <b>never</b> fails the message — the
 *       durable row is what the user reads on next login; a missed live push is
 *       cosmetic.</li>
 * </ul>
 *
 * <p><b>Idempotency (V6):</b> every message carries a {@code dedupeKey}
 * (publisher-set UUID). Each recipient row records it; the partial unique index
 * {@code ux_notifications_user_dedupe} on {@code (user_id, dedupe_key)} makes a
 * redelivery — broker replay after an ack timeout, a concurrent duplicate, a
 * DLQ replay, a consumer restart mid-batch — a no-op instead of a duplicate.
 * Covered by {@code NotificationReliabilityIT}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationConsumer {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SseService sseService;
    private final TransactionTemplate tx;

    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_QUEUE,
            containerFactory = "notificationListenerContainerFactory")
    public void consume(NotificationMessage message) {
        log.info("Consuming notification: routingKey={}, type={}", message.getRoutingKey(), message.getType());

        // All-or-nothing DB write. Any exception propagates → the listener's
        // retry interceptor kicks in → after exhaustion, the DLQ.
        List<Notification> saved = tx.execute(status -> persist(message));

        // Runs only after the transaction has committed — a failed push must
        // not roll back (or trigger a retry of) a delivery already recorded.
        for (Notification n : saved) {
            try {
                sseService.sendToUser(n.getUser().getUserId(), n.getTitle(), n.getMessage(), n.getReservationId());
            } catch (RuntimeException e) {
                log.warn("SSE push failed for user {} (notification already saved) — {}",
                        maskEmail(n.getUser().getEmail()), e.getMessage());
            }
        }
    }

    private List<Notification> persist(NotificationMessage message) {
        List<User> targets = resolveTargets(message);
        log.info("Resolved {} target user(s)", targets.size());
        String key = message.getDedupeKey();

        List<Notification> saved = new ArrayList<>();
        for (User user : targets) {
            // Idempotency (V6): a redelivery / replay of this same message must
            // not create a second row. Fast-path existence check; the partial
            // unique index (user_id, dedupe_key) is the real guarantee — if a
            // concurrent duplicate races past this check the second INSERT fails,
            // the whole batch rolls back, and the listener retry re-runs it (by
            // which point the row exists and is skipped).
            if (key != null && !key.isBlank()
                    && notificationRepository.existsByUser_UserIdAndDedupeKey(user.getUserId(), key)) {
                log.info("Notification already delivered to user {} (dedupeKey={}) — skipping",
                        maskEmail(user.getEmail()), key);
                continue;
            }
            Notification notification = notificationRepository.save(Notification.builder()
                    .user(user)
                    .reservationId(message.getReservationId())
                    .type(message.getType())
                    .title(message.getTitle())
                    .message(message.getMessage())
                    .dedupeKey(key)
                    .build());
            saved.add(notification);
            log.info("Notification saved for user {}", maskEmail(user.getEmail()));
        }
        return saved;
    }

    private List<User> resolveTargets(NotificationMessage message) {
        List<User> targets = new ArrayList<>();

        if (message.getTargetUserId() != null) {
            userRepository.findById(message.getTargetUserId()).ifPresent(targets::add);
            return targets;
        }

        if (message.getTargetRoles() != null && !message.getTargetRoles().isEmpty()) {
            message.getTargetRoles().forEach(role -> targets.addAll(userRepository.findAllByRole(role)));
        }
        return targets;
    }
}
