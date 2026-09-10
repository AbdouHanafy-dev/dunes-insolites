package com.camping.duneinsolite.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.RetryInterceptorBuilder;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.retry.RejectAndDontRequeueRecoverer;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.aopalliance.intercept.MethodInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.amqp.autoconfigure.SimpleRabbitListenerContainerFactoryConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // ── 1. Constants — names of everything ───────────────────────
    public static final String NOTIFICATION_QUEUE    = "notification.queue";
    public static final String NOTIFICATION_DLQ      = "notification.dlq";
    public static final String NOTIFICATION_EXCHANGE = "notification.exchange";
    public static final String DLQ_EXCHANGE          = "notification.dlq.exchange";

    // Separate queue, same exchange - the topic exchange fans the same
    // published message out to both this queue and notification.queue.
    // Bound narrowly to reservation.created only (see notificationBinding's
    // "#" vs this one) because a confirmation email only exists for that
    // one event so far - no template exists yet for payment/staff events.
    public static final String EMAIL_QUEUE = "email.queue";

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

    // ── 6b. Email queue - reservation.created only (DI-014) ────────
    @Bean
    public Queue emailQueue() {
        return QueueBuilder
                .durable(EMAIL_QUEUE)
                .withArgument("x-dead-letter-exchange", DLQ_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", NOTIFICATION_DLQ)
                .build();
    }

    @Bean
    public Binding emailBinding() {
        return BindingBuilder.bind(emailQueue()).to(notificationExchange()).with(RESERVATION_CREATED);
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

    // ── 9. Email listener factory — real retry, then DLQ ──────────
    //
    // The default listener factory uses manual acks (application.yml) and the
    // consumers ack/nack by hand. The email consumer instead uses THIS factory:
    // AUTO ack + an in-process retry interceptor. On a send failure the listener
    // throws, the interceptor retries with backoff, and when attempts are
    // exhausted RejectAndDontRequeueRecoverer rejects the message without
    // requeue -> the queue's x-dead-letter-exchange routes it to notification.dlq.
    // No message is acked before its email actually succeeds.
    @Value("${app.email.retry.max-attempts:4}")
    private int emailRetryMaxAttempts;

    @Value("${app.email.retry.initial-interval-ms:2000}")
    private long emailRetryInitialInterval;

    @Value("${app.email.retry.multiplier:2.0}")
    private double emailRetryMultiplier;

    @Value("${app.email.retry.max-interval-ms:15000}")
    private long emailRetryMaxInterval;

    @Bean
    public MethodInterceptor emailRetryInterceptor() {
        // Spring AMQP 4 retry API: maxRetries = attempts beyond the first.
        return RetryInterceptorBuilder.stateless()
                .maxRetries(Math.max(0, emailRetryMaxAttempts - 1))
                .backOffOptions(emailRetryInitialInterval, emailRetryMultiplier, emailRetryMaxInterval)
                .recoverer(new RejectAndDontRequeueRecoverer())
                .build();
    }

    @Bean
    public SimpleRabbitListenerContainerFactory emailListenerContainerFactory(
            SimpleRabbitListenerContainerFactoryConfigurer configurer,
            ConnectionFactory connectionFactory,
            MethodInterceptor emailRetryInterceptor) {

        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        configurer.configure(factory, connectionFactory);
        factory.setMessageConverter(messageConverter());
        factory.setAcknowledgeMode(AcknowledgeMode.AUTO);
        factory.setDefaultRequeueRejected(false);
        factory.setAdviceChain(emailRetryInterceptor);
        return factory;
    }

    // ── 9b. Notification listener factory — retry, then DLQ ───────
    //
    // Phase 5 fix: NotificationConsumer previously used the default (manual-ack)
    // factory and caught every exception itself, so the yml `listener.simple.retry`
    // advice never fired — a single transient failure (DB blip, SSE hiccup) sent
    // the message straight to the DLQ with ZERO retries. It now uses this factory,
    // identical in shape to the email one: AUTO ack, an in-process retry
    // interceptor with backoff, and RejectAndDontRequeueRecoverer so an exhausted
    // message is rejected without requeue and the queue's
    // x-dead-letter-exchange routes it to notification.dlq. The consumer just
    // throws on failure; no message is acked before its work is durably done.
    @Bean
    public MethodInterceptor notificationRetryInterceptor() {
        return RetryInterceptorBuilder.stateless()
                .maxRetries(Math.max(0, emailRetryMaxAttempts - 1))
                .backOffOptions(emailRetryInitialInterval, emailRetryMultiplier, emailRetryMaxInterval)
                .recoverer(new RejectAndDontRequeueRecoverer())
                .build();
    }

    @Bean
    public SimpleRabbitListenerContainerFactory notificationListenerContainerFactory(
            SimpleRabbitListenerContainerFactoryConfigurer configurer,
            ConnectionFactory connectionFactory,
            MethodInterceptor notificationRetryInterceptor) {

        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        configurer.configure(factory, connectionFactory);
        factory.setMessageConverter(messageConverter());
        factory.setAcknowledgeMode(AcknowledgeMode.AUTO);
        factory.setDefaultRequeueRejected(false);
        factory.setAdviceChain(notificationRetryInterceptor);
        return factory;
    }

    // ── 10. DLQ listener factory — record then ack ────────────────
    // Manual ack: the DLQ consumer only acks once the durable record is
    // persisted; if persistence fails the message is requeued, never lost.
    @Bean
    public SimpleRabbitListenerContainerFactory deadLetterListenerContainerFactory(
            SimpleRabbitListenerContainerFactoryConfigurer configurer,
            ConnectionFactory connectionFactory) {

        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        configurer.configure(factory, connectionFactory);
        factory.setAcknowledgeMode(AcknowledgeMode.MANUAL);
        return factory;
    }
}