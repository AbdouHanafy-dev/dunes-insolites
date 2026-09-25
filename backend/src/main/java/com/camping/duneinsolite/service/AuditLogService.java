package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.response.AuditLogResponse;
import com.camping.duneinsolite.model.AuditLogEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;

public interface AuditLogService {

    /** Appends one entry. Callers must not let a failure here fail the request they audit. */
    void record(AuditLogEntry entry);

    /**
     * @param actor      matches the actor's name or e-mail, case-insensitive, partial
     * @param action     exact: CREATE, UPDATE, DELETE or ACTION
     * @param entityType exact, e.g. {@code tours}
     * @param from       inclusive; {@code to} exclusive; either may be null
     */
    Page<AuditLogResponse> search(String actor, String action, String entityType, Instant from, Instant to,
                                  Pageable pageable);

    List<String> entityTypes();
}
