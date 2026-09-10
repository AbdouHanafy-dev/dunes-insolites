package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.DeadLetterMessage;
import com.camping.duneinsolite.model.enums.DeadLetterStatus;
import com.camping.duneinsolite.observability.CorrelationId;
import com.camping.duneinsolite.observability.EmailMetrics;
import com.camping.duneinsolite.repository.DeadLetterMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Inspect and act on {@code dead_letter_message} records.
 *
 * <p><b>Replay</b> re-publishes the stored payload to the ORIGINAL queue via the
 * default exchange - not the topic exchange - so only the consumer that failed
 * reprocesses it, never every consumer bound to {@code reservation.created}.
 * State transitions are explicit and one-way from {@code UNRESOLVED}:
 * {@code UNRESOLVED -> REPLAYED} or {@code UNRESOLVED -> DISCARDED}. Replaying an
 * already-resolved record is a 409, so a double-click cannot double-send.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeadLetterAdminService {

    private final DeadLetterMessageRepository repository;
    private final RabbitTemplate rabbitTemplate;
    private final EmailMetrics emailMetrics;

    @Transactional(readOnly = true)
    public Page<DeadLetterMessage> list(DeadLetterStatus status, Pageable pageable) {
        return status == null
                ? repository.findByOrderByRecordedAtDesc(pageable)
                : repository.findByStatusOrderByRecordedAtDesc(status, pageable);
    }

    @Transactional(readOnly = true)
    public DeadLetterMessage get(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dead-letter record not found: " + id));
    }

    @Transactional
    public DeadLetterMessage replay(UUID id, String actor) {
        DeadLetterMessage record = get(id);
        requireUnresolved(record, "replayed");

        String queue = record.getQueueName();
        if (queue == null || queue.isBlank()) {
            throw new ConflictException("Cannot replay: the original queue is unknown for record " + id);
        }

        MessageProperties props = new MessageProperties();
        props.setContentType(MessageProperties.CONTENT_TYPE_JSON);
        props.setContentEncoding(StandardCharsets.UTF_8.name());
        if (record.getCorrelationId() != null) {
            props.setHeader(CorrelationId.AMQP_HEADER, record.getCorrelationId());
        }
        Message message = MessageBuilder
                .withBody(record.getPayload().getBytes(StandardCharsets.UTF_8))
                .andProperties(props)
                .build();

        // default exchange ("") routes by routing key == queue name
        rabbitTemplate.send("", queue, message);

        record.setStatus(DeadLetterStatus.REPLAYED);
        record.setReplayedAt(LocalDateTime.now());
        record.setReplayedBy(actor);
        DeadLetterMessage saved = repository.save(record);
        emailMetrics.deadLetterReplayed();
        log.warn("Dead-letter {} replayed to queue '{}' by {} (correlationId={})",
                id, queue, actor, record.getCorrelationId());
        return saved;
    }

    @Transactional
    public DeadLetterMessage discard(UUID id, String actor) {
        DeadLetterMessage record = get(id);
        requireUnresolved(record, "discarded");
        record.setStatus(DeadLetterStatus.DISCARDED);
        record.setReplayedAt(LocalDateTime.now());
        record.setReplayedBy(actor);
        DeadLetterMessage saved = repository.save(record);
        emailMetrics.deadLetterDiscarded();
        log.warn("Dead-letter {} discarded by {}", id, actor);
        return saved;
    }

    private void requireUnresolved(DeadLetterMessage record, String verb) {
        if (record.getStatus() != DeadLetterStatus.UNRESOLVED) {
            throw new ConflictException(
                    "Dead-letter " + record.getId() + " is already " + record.getStatus()
                            + " and cannot be " + verb + " again.");
        }
    }
}
