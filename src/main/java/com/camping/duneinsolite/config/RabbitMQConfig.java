package com.camping.duneinsolite.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // ── 1. Constants — names of everything ───────────────────────
    public static final String NOTIFICATION_QUEUE    = "notification.queue";
    public static final String NOTIFICATION_DLQ      = "notification.dlq";
    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";
    public static final String DLQ_EXCHANGE          = "notification.dlq.exchange";

    // ── 2. Routing keys ───────────────────────────────────────────
    public static final String RESERVATION_CREATED   = "reservation.created";
    public static final String RESERVATION_CONFIRMED = "reservation.confirmed";
    public static final String RESERVATION_REJECTED  = "reservation.rejected";
    public static final String RESERVATION_UPDATED   = "reservation.updated";

    // ── NEW — Payment routing keys ────────────────────────────────
    public static final String PAYMENT_RECEIVED      = "payment.received";
    public static final String PAYMENT_COMPLETED     = "payment.completed";

    public static final String STAFF_ASSIGNED = "staff.assigned";
    public static final String STAFF_UPDATED  = "staff.updated";

    // ── 3. Dead Letter Queue setup ────────────────────────────────
    @Bean
    public Queue notificationDLQ() {
        return QueueBuilder.durable(NOTIFICATION_DLQ).build();
    }

    @Bean
    public DirectExchange dlqExchange() {
        return new DirectExchange(DLQ_EXCHANGE);
    }

    @Bean
    public Binding dlqBinding() {
        return BindingBuilder.bind(notificationDLQ()).to(dlqExchange()).with(NOTIFICATION_DLQ);
    }

    // ── 4. Main notification queue ────────────────────────────────
    @Bean
    public Queue notificationQueue() {
        return QueueBuilder
                .durable(NOTIFICATION_QUEUE)
                .withArgument("x-dead-letter-exchange", DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", NOTIFICATION_DLQ)
                .build();
    }

    // ── 5. Topic Exchange ─────────────────────────────────────────
    // pattern "#" matches everything — payment.received, payment.completed
    // are automatically routed with zero changes here
    @Bean
    public TopicExchange notificationExchange() {
        return new TopicExchange(NOTIFICATION_EXCHANGE);
    }

    // ── 6. Binding ────────────────────────────────────────────────
    @Bean
    public Binding notificationBinding() {
        return BindingBuilder.bind(notificationQueue()).to(notificationExchange()).with("#");
    }

    // ── 7. JSON Converter ─────────────────────────────────────────
    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    // ── 8. RabbitTemplate ─────────────────────────────────────────
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }
}