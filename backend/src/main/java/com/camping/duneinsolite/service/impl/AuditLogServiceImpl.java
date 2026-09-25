package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.response.AuditLogResponse;
import com.camping.duneinsolite.model.AuditLogEntry;
import com.camping.duneinsolite.repository.AuditLogRepository;
import com.camping.duneinsolite.service.AuditLogService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository repository;

    @Override
    @Transactional
    public void record(AuditLogEntry entry) {
        if (entry.getOccurredAt() == null) entry.setOccurredAt(Instant.now());
        repository.save(entry);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> search(String actor, String action, String entityType, Instant from, Instant to,
                                         Pageable pageable) {
        Specification<AuditLogEntry> spec = (root, query, cb) -> {
            List<Predicate> all = new ArrayList<>();
            if (actor != null && !actor.isBlank()) {
                String like = "%" + escapeLike(actor.trim().toLowerCase(Locale.ROOT)) + "%";
                all.add(cb.or(
                        cb.like(cb.lower(root.get("actorEmail")), like, '\\'),
                        cb.like(cb.lower(root.get("actorName")), like, '\\')));
            }
            if (action != null && !action.isBlank()) all.add(cb.equal(root.get("action"), action.trim()));
            if (entityType != null && !entityType.isBlank()) all.add(cb.equal(root.get("entityType"), entityType.trim()));
            if (from != null) all.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
            if (to != null) all.add(cb.lessThan(root.get("occurredAt"), to));
            return cb.and(all.toArray(new Predicate[0]));
        };
        return repository.findAll(spec, pageable).map(AuditLogServiceImpl::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> entityTypes() {
        return repository.findDistinctEntityTypes();
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static AuditLogResponse toResponse(AuditLogEntry e) {
        return new AuditLogResponse(e.getId(), e.getOccurredAt(), e.getActorId(), e.getActorEmail(), e.getActorName(),
                e.getActorRoles(), e.getAction(), e.getVerb(), e.getMethod(), e.getPath(), e.getEntityType(),
                e.getEntityId(), e.getEntityLabel(), e.getStatusCode(), e.getIp(), e.getUserAgent());
    }
}
