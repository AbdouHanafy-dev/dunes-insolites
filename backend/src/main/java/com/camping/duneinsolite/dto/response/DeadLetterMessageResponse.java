package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.DeadLetterMessage;
import com.camping.duneinsolite.model.enums.DeadLetterStatus;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Operational view of a dead-lettered message. Deliberately excludes the raw
 * payload, headers and recipient address (item 2, constraint 7) - it carries
 * enough to triage and decide on a replay, not the customer's data.
 */
public record DeadLetterMessageResponse(
        UUID id,
        String queueName,
        String originalExchange,
        String originalRoutingKey,
        String messageType,
        UUID reservationId,
        String correlationId,
        String failureReason,
        int deathCount,
        LocalDateTime firstFailedAt,
        LocalDateTime recordedAt,
        DeadLetterStatus status,
        LocalDateTime replayedAt,
        String replayedBy
) {
    public static DeadLetterMessageResponse from(DeadLetterMessage m) {
        return new DeadLetterMessageResponse(
                m.getId(), m.getQueueName(), m.getOriginalExchange(), m.getOriginalRoutingKey(),
                m.getMessageType(), m.getReservationId(), m.getCorrelationId(), m.getFailureReason(),
                m.getDeathCount(), m.getFirstFailedAt(), m.getRecordedAt(), m.getStatus(),
                m.getReplayedAt(), m.getReplayedBy());
    }
}
