package com.camping.duneinsolite.service;

import com.camping.duneinsolite.config.RabbitMQConfig;
import com.camping.duneinsolite.dto.message.NotificationMessage;
import com.camping.duneinsolite.observability.CorrelationId;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationPublisher {

    // RabbitTemplate is the tool Spring gives us to send messages
    // it is configured in RabbitMQConfig with JSON converter
    private final RabbitTemplate rabbitTemplate;

    public void publish(String routingKey, NotificationMessage message) {

        // attach the routingKey to the message itself
        // useful later for logging in consumer
        message.setRoutingKey(routingKey);

        // Carry the current unit-of-work id onto the message so every consumer
        // (and any DLQ record / replay) logs under the same correlation id.
        String correlationId = message.getCorrelationId() != null
                ? message.getCorrelationId()
                : CorrelationId.currentOrNew();
        message.setCorrelationId(correlationId);

        // Idempotency key — one per publish. A caller that re-publishes the very
        // same message object (a replay) keeps its key, so the consumer treats
        // it as the same message and does not duplicate the recipient rows.
        if (message.getDedupeKey() == null || message.getDedupeKey().isBlank()) {
            message.setDedupeKey(java.util.UUID.randomUUID().toString());
        }

        log.info("Publishing notification: routingKey={}, title={}",
                routingKey, message.getTitle());

        // convertAndSend converts the object to JSON (Jackson2JsonMessageConverter)
        // and routes it through the topic exchange. The MessagePostProcessor also
        // puts the correlation id in an AMQP header so it survives even if the
        // body can't be parsed (e.g. in the raw DLQ consumer).
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.NOTIFICATION_EXCHANGE,
                routingKey,
                message,
                m -> {
                    m.getMessageProperties().setHeader(CorrelationId.AMQP_HEADER, correlationId);
                    return m;
                }
        );

        log.info("Notification published successfully: {}", routingKey);
    }
}
