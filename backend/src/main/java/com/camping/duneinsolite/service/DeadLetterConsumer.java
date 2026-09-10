package com.camping.duneinsolite.service;

import com.camping.duneinsolite.config.RabbitMQConfig;
import com.camping.duneinsolite.model.DeadLetterMessage;
import com.camping.duneinsolite.model.enums.DeadLetterStatus;
import com.camping.duneinsolite.observability.CorrelationId;
import com.camping.duneinsolite.observability.EmailMetrics;
import com.camping.duneinsolite.repository.DeadLetterMessageRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Consumes {@code notification.dlq} - every message that exhausted its retries
 * on {@code notification.queue} or {@code email.queue} - and turns it into a
 * durable, replayable {@code dead_letter_message} row.
 *
 * <p><b>Ack discipline (item 2, constraint 5):</b> the message is acknowledged
 * only after its record is committed. If persistence fails the message is
 * requeued (not dropped) and an operator alert fires via the ERROR log +
 * the {@code email_dead_letter} metric is NOT incremented.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeadLetterConsumer {

    private final DeadLetterMessageRepository repository;
    private final EmailMetrics emailMetrics;

    // The message body is plain JSON produced by Jackson2JsonMessageConverter;
    // a stock mapper reads it. Not the (Jackson 3) autoconfigured bean.
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @org.springframework.amqp.rabbit.annotation.RabbitListener(
            queues = RabbitMQConfig.NOTIFICATION_DLQ,
            containerFactory = "deadLetterListenerContainerFactory")
    public void consume(Message message, Channel channel,
                        @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {

        String payload = new String(message.getBody(), StandardCharsets.UTF_8);
        var props = message.getMessageProperties();
        String correlationId = header(props.getHeaders(), CorrelationId.AMQP_HEADER);

        try (CorrelationId.Scope ignored = CorrelationId.scope(correlationId)) {
            try {
                DeathInfo death = parseXDeath(props.getHeaders());
                BodyInfo body = parseBody(payload);

                record(payload, props.getHeaders(), correlationId, death, body,
                        props.getMessageId());

                channel.basicAck(deliveryTag, false);
                emailMetrics.deadLetterRecorded();
                log.error("Dead-lettered message recorded: queue={}, routingKey={}, reason={}, reservation={}",
                        death.queue(), death.routingKey(), death.reason(), body.reservationId());

            } catch (Exception persistFailure) {
                // Keep it on the broker - do NOT ack. An operator must see this.
                // The raw payload (a NotificationMessage — carries the guest's
                // group name and the notification text) is deliberately NOT
                // logged here: identifiers are enough to find the stuck message
                // on the broker, and it is still safely queued for retry.
                log.error("FAILED to persist a dead-letter record - requeueing, message is NOT lost. "
                                + "messageId={}, correlationId={}, bytes={}",
                        props.getMessageId(), correlationId, payload.length(), persistFailure);
                channel.basicNack(deliveryTag, false, true);
            }
        }
    }

    private void record(String payload, Map<String, Object> headers, String correlationId,
                        DeathInfo death, BodyInfo body, String messageId) {
        if (repository.existsByQueueNameAndPayloadAndStatus(
                death.queue(), payload, DeadLetterStatus.UNRESOLVED)) {
            log.info("Dead-letter already recorded and unresolved - skipping redelivery");
            return;
        }
        try {
            repository.save(DeadLetterMessage.builder()
                    .originalExchange(death.exchange())
                    .originalRoutingKey(death.routingKey())
                    .queueName(death.queue())
                    .amqpMessageId(messageId)
                    .correlationId(correlationId)
                    .reservationId(body.reservationId())
                    .messageType(body.type())
                    .payload(payload)
                    .headers(safeJson(headers))
                    .failureReason(death.reason())
                    .deathCount(death.count())
                    .firstFailedAt(death.time())
                    .status(DeadLetterStatus.UNRESOLVED)
                    .build());
        } catch (DataIntegrityViolationException raceOnPartialIndex) {
            log.info("Dead-letter already recorded (unique index) - skipping redelivery");
        }
    }

    // ── header / body parsing ────────────────────────────────────

    record DeathInfo(String exchange, String routingKey, String queue, String reason,
                     int count, LocalDateTime time) {}

    record BodyInfo(UUID reservationId, String type) {}

    @SuppressWarnings("unchecked")
    private DeathInfo parseXDeath(Map<String, Object> headers) {
        Object raw = headers.get("x-death");
        if (!(raw instanceof List<?> list) || list.isEmpty() || !(list.get(0) instanceof Map)) {
            return new DeathInfo(null, null, null, null, 1, LocalDateTime.now());
        }
        Map<String, Object> first = (Map<String, Object>) list.get(0);
        String exchange = str(first.get("exchange"));
        String queue = str(first.get("queue"));
        String reason = str(first.get("reason"));
        String routingKey = null;
        if (first.get("routing-keys") instanceof List<?> rks && !rks.isEmpty()) {
            routingKey = str(rks.get(0));
        }
        int count = first.get("count") instanceof Number n ? n.intValue() : 1;
        LocalDateTime time = LocalDateTime.now();
        if (first.get("time") instanceof java.util.Date d) {
            time = LocalDateTime.ofInstant(d.toInstant(), ZoneId.systemDefault());
        } else if (first.get("time") instanceof Number secs) {
            time = LocalDateTime.ofInstant(Instant.ofEpochSecond(secs.longValue()), ZoneId.systemDefault());
        }
        return new DeathInfo(exchange, routingKey, queue, reason, count, time);
    }

    private BodyInfo parseBody(String payload) {
        try {
            JsonNode node = objectMapper.readTree(payload);
            UUID reservationId = node.hasNonNull("reservationId")
                    ? UUID.fromString(node.get("reservationId").asText()) : null;
            String type = node.hasNonNull("type") ? node.get("type").asText() : null;
            return new BodyInfo(reservationId, type);
        } catch (Exception e) {
            return new BodyInfo(null, null);
        }
    }

    private String safeJson(Map<String, Object> headers) {
        try {
            return objectMapper.writeValueAsString(headers);
        } catch (Exception e) {
            return null;
        }
    }

    private static String header(Map<String, Object> headers, String key) {
        Object v = headers == null ? null : headers.get(key);
        return v == null ? null : v.toString();
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }
}
