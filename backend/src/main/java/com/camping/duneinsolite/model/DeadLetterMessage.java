package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.DeadLetterStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A durable operational record of a message that exhausted its retries and
 * landed on {@code notification.dlq}. Holds everything needed to replay it -
 * original exchange, routing key, raw payload, headers - plus the failure
 * reason and dead-letter metadata. Written by {@code DeadLetterConsumer};
 * inspected and replayed via {@code DeadLetterAdminController}.
 */
@Entity
@Table(name = "dead_letter_message")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeadLetterMessage {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "original_exchange")
    private String originalExchange;

    @Column(name = "original_routing_key")
    private String originalRoutingKey;

    @Column(name = "queue_name")
    private String queueName;

    @Column(name = "amqp_message_id")
    private String amqpMessageId;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "reservation_id")
    private UUID reservationId;

    @Column(name = "message_type", length = 64)
    private String messageType;

    /** The raw message body, kept so the message can be republished verbatim. */
    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "headers", columnDefinition = "TEXT")
    private String headers;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "death_count", nullable = false)
    @Builder.Default
    private int deathCount = 1;

    @Column(name = "first_failed_at")
    private LocalDateTime firstFailedAt;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime recordedAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    @Builder.Default
    private DeadLetterStatus status = DeadLetterStatus.UNRESOLVED;

    @Column(name = "replayed_at")
    private LocalDateTime replayedAt;

    /** JWT subject of the admin who replayed or discarded it. */
    @Column(name = "replayed_by")
    private String replayedBy;
}
