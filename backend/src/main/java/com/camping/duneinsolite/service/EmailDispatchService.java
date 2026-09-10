package com.camping.duneinsolite.service;

import com.camping.duneinsolite.model.EmailDispatch;
import com.camping.duneinsolite.model.enums.EmailDispatchStatus;
import com.camping.duneinsolite.model.enums.EmailType;
import com.camping.duneinsolite.repository.EmailDispatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * The state machine behind email idempotency. Every method runs in its own
 * {@code REQUIRES_NEW} transaction so the attempt count and last error are
 * durably recorded <b>even when the calling message listener then throws</b> to
 * trigger a RabbitMQ retry.
 *
 * <pre>
 *   claim()  -> PENDING (new)            first delivery
 *            -> PENDING (existing FAILED) a retry / DLQ replay
 *            -> returns alreadySent=true  duplicate delivery, caller skips
 *   markSent()   PENDING/FAILED -> SENT   terminal
 *   markFailed() PENDING        -> FAILED  caller then rethrows
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailDispatchService {

    private final EmailDispatchRepository repository;

    public record Claim(UUID dispatchId, boolean alreadySent, int attempts) {}

    /**
     * Race-safe claim: the unique constraint on {@code (reservation_id,
     * email_type)} means two concurrent deliveries cannot both insert - the
     * loser catches the violation and re-reads the winner's row.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Claim claim(UUID reservationId, EmailType type, String recipient, String correlationId) {
        var existing = repository.findByReservationIdAndEmailType(reservationId, type);
        if (existing.isPresent()) {
            EmailDispatch d = existing.get();
            if (d.getStatus() == EmailDispatchStatus.SENT) {
                return new Claim(d.getId(), true, d.getAttempts());
            }
            d.setAttempts(d.getAttempts() + 1);
            d.setStatus(EmailDispatchStatus.PENDING);
            d.setUpdatedAt(LocalDateTime.now());
            if (correlationId != null) d.setCorrelationId(correlationId);
            return new Claim(repository.save(d).getId(), false, d.getAttempts());
        }
        try {
            EmailDispatch created = repository.saveAndFlush(EmailDispatch.builder()
                    .reservationId(reservationId)
                    .emailType(type)
                    .recipient(recipient)
                    .status(EmailDispatchStatus.PENDING)
                    .attempts(1)
                    .correlationId(correlationId)
                    .build());
            return new Claim(created.getId(), false, 1);
        } catch (DataIntegrityViolationException race) {
            EmailDispatch d = repository.findByReservationIdAndEmailType(reservationId, type)
                    .orElseThrow(() -> race);
            if (d.getStatus() == EmailDispatchStatus.SENT) {
                return new Claim(d.getId(), true, d.getAttempts());
            }
            d.setAttempts(d.getAttempts() + 1);
            d.setUpdatedAt(LocalDateTime.now());
            return new Claim(repository.save(d).getId(), false, d.getAttempts());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markSent(UUID dispatchId) {
        repository.findById(dispatchId).ifPresent(d -> {
            d.setStatus(EmailDispatchStatus.SENT);
            d.setLastError(null);
            d.setSentAt(LocalDateTime.now());
            d.setUpdatedAt(LocalDateTime.now());
            repository.save(d);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(UUID dispatchId, String error) {
        repository.findById(dispatchId).ifPresent(d -> {
            d.setStatus(EmailDispatchStatus.FAILED);
            d.setLastError(truncate(error));
            d.setUpdatedAt(LocalDateTime.now());
            repository.save(d);
        });
    }

    private static String truncate(String s) {
        if (s == null) return null;
        return s.length() <= 4000 ? s : s.substring(0, 4000);
    }
}
