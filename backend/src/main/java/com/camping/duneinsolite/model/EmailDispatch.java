package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.EmailDispatchStatus;
import com.camping.duneinsolite.model.enums.EmailType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One row per (reservation, email type). The idempotency anchor for
 * {@code ReservationEmailConsumer}: a redelivered RabbitMQ message that finds a
 * {@code SENT} row here skips the send instead of mailing the guest twice.
 *
 * <p>The unique constraint {@code (reservation_id, email_type)} makes the
 * "claim" race-safe - two concurrent deliveries cannot both insert.
 */
@Entity
@Table(name = "email_dispatch")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailDispatch {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "reservation_id")
    private UUID reservationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "email_type", nullable = false, length = 64)
    private EmailType emailType;

    @Column(name = "recipient", nullable = false, length = 320)
    private String recipient;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    @Builder.Default
    private EmailDispatchStatus status = EmailDispatchStatus.PENDING;

    @Column(name = "attempts", nullable = false)
    @Builder.Default
    private int attempts = 0;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "sent_at")
    private LocalDateTime sentAt;
}
