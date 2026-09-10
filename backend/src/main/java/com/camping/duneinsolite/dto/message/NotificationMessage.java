package com.camping.duneinsolite.dto.message;

import com.camping.duneinsolite.model.enums.NotificationType;
import com.camping.duneinsolite.model.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationMessage {

    // WHO gets notified
    // use targetUserId when notifying ONE specific user
    // example: owner of the reservation
    private UUID targetUserId;


    // use targetRoles when notifying ALL users of a role
    // example: all ADMIN users, all CAMPING users
    private List<UserRole> targetRoles;

    // WHAT type of notification
    private NotificationType type;

    // WHAT to display
    private String title;
    private String message;

    // CONTEXT — so frontend can navigate to the reservation
    private UUID reservationId;

    // WHICH event triggered this
    // example: "reservation.created", "reservation.confirmed"
    private String routingKey;

    // Follows the unit of work across HTTP -> broker -> consumer -> DLQ -> replay.
    // Stamped by NotificationPublisher from the request's X-Correlation-Id (or a
    // fresh id); consumers bind it to MDC for their own logging. See
    // com.camping.duneinsolite.observability.CorrelationId.
    private String correlationId;

    // Idempotency key — one UUID per publish, set by NotificationPublisher.
    // The consumer records it on every recipient row; the partial unique index
    // ux_notifications_user_dedupe (V6) makes a redelivery of this message a
    // no-op instead of a duplicate. A replay re-uses the SAME key on purpose
    // (a replayed message is the same message, not a new one).
    private String dedupeKey;
}
