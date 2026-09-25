package com.camping.duneinsolite.dto.response;

import java.time.Instant;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        Instant occurredAt,
        String actorId,
        String actorEmail,
        String actorName,
        String actorRoles,
        String action,
        String verb,
        String method,
        String path,
        String entityType,
        String entityId,
        String entityLabel,
        Integer statusCode,
        String ip,
        String userAgent) {
}
