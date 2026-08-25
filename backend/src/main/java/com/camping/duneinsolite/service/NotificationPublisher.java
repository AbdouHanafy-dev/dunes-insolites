package com.camping.duneinsolite.service;

import com.camping.duneinsolite.config.RabbitMQConfig;
import com.camping.duneinsolite.dto.message.NotificationMessage;
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

        log.info("Publishing notification: routingKey={}, title={}",
                routingKey, message.getTitle());

        // convertAndSend does 3 things:
        // 1. takes our Java NotificationMessage object
        // 2. converts it to JSON using Jackson2JsonMessageConverter
        // 3. sends it to the exchange with the given routingKey
        // exchange then routes it to notification.queue via "#" binding
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.NOTIFICATION_EXCHANGE, // which exchange
                routingKey,                           // routing key label
                message                               // the message object
        );

        log.info("Notification published successfully: {}", routingKey);
    }
}
