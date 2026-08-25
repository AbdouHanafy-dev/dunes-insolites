package com.camping.duneinsolite.service;

import com.camping.duneinsolite.config.RabbitMQConfig;
import com.camping.duneinsolite.dto.message.NotificationMessage;
import com.camping.duneinsolite.model.Notification;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.repository.NotificationRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationConsumer {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SseService sseService;

    // @RabbitListener tells Spring:
    // "watch notification.queue constantly"
    // "when a message arrives, call this method automatically"
    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_QUEUE)
    public void consume(
            NotificationMessage message,  // JSON automatically deserialized
            Channel channel,              // raw RabbitMQ channel for ACK/NACK
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag // message ID for ACK/NACK
    ) throws IOException {
        log.info("Consumed notification: routingKey={}, title={}",
                message.getRoutingKey(), message.getTitle());

        try {
            // ── STEP 1: resolve who gets notified ────────────────
            List<User> targets = resolveTargets(message);
            log.info("Resolved {} target users", targets.size());

            // ── STEP 2: for each target user ─────────────────────
            for (User user : targets) {

                // 2a. save notification to DB
                // this is the notification history
                // user sees this when they click the bell icon
                Notification notification = Notification.builder()
                        .user(user)
                        .reservationId(message.getReservationId())
                        .type(message.getType())
                        .title(message.getTitle())
                        .message(message.getMessage())
                        .build();

                notificationRepository.save(notification);
                log.info("Notification saved to DB for user {}", user.getEmail());

                // 2b. push real-time via SSE
                // if user has browser open → they see it instantly
                // if user is offline → they see it next login from DB
                sseService.sendToUser(
                        user.getUserId(),
                        message.getTitle(),
                        message.getMessage(),
                        message.getReservationId()
                );
            }

            // ── STEP 3: ACK ───────────────────────────────────────
            // tell RabbitMQ: "I processed this successfully"
            // RabbitMQ removes message from queue
            // false = only ACK this specific message, not all pending
            channel.basicAck(deliveryTag, false);
            log.info("Message ACKed successfully");

        } catch (Exception e) {
            log.error("Failed to process notification: {}", e.getMessage());

            // NACK = tell RabbitMQ processing failed
            // param 2 (multiple) = false → only this message
            // param 3 (requeue)  = false → do NOT requeue
            //                              send to DLQ instead
            // Spring retry config in yml handles retries before this
            channel.basicNack(deliveryTag, false, false);
        }
    }

    private List<User> resolveTargets(NotificationMessage message) {
        List<User> targets = new ArrayList<>();

        // CASE 1: notify one specific user
        // used for: owner of reservation (confirmed/rejected)
        if (message.getTargetUserId() != null) {
            userRepository.findById(message.getTargetUserId())
                    .ifPresent(targets::add);
            return targets;
        }

        // CASE 2: notify all users of given roles
        // used for: all ADMIN, all CAMPING
        if (message.getTargetRoles() != null && !message.getTargetRoles().isEmpty()) {
            message.getTargetRoles().forEach(role ->
                    targets.addAll(userRepository.findAllByRole(role))
            );
        }

        return targets;
    }
}