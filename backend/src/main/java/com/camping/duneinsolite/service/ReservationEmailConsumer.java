package com.camping.duneinsolite.service;

import com.camping.duneinsolite.config.RabbitMQConfig;
import com.camping.duneinsolite.dto.message.NotificationMessage;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.ReservationType;
import com.camping.duneinsolite.repository.ReservationRepository;
import com.camping.duneinsolite.service.impl.EmailService;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDate;

/**
 * Sends the "we received your booking request" email (DI-014). Separate
 * queue/consumer from NotificationConsumer (which persists + fans out over
 * SSE to staff) - same published message, routed to both via the topic
 * exchange's fan-out, see RabbitMQConfig.emailBinding().
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationEmailConsumer {

    private final ReservationRepository reservationRepository;
    private final EmailService emailService;

    @RabbitListener(queues = RabbitMQConfig.EMAIL_QUEUE)
    @Transactional(readOnly = true)
    public void consume(
            NotificationMessage message,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag
    ) throws IOException {
        try {
            Reservation reservation = reservationRepository.findById(message.getReservationId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Reservation not found: " + message.getReservationId()));

            User user = reservation.getUser();
            emailService.sendReservationReceivedEmail(
                    user.getEmail(),
                    user.getName(),
                    reservationDate(reservation),
                    reservationTotal(reservation),
                    reservation.getCurrency() != null ? reservation.getCurrency().name() : "TND"
            );

            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Failed to send reservation-received email: {}", e.getMessage());
            channel.basicNack(deliveryTag, false, false);
        }
    }

    private LocalDate reservationDate(Reservation reservation) {
        if (reservation.getCheckInDate() != null) return reservation.getCheckInDate();
        return reservation.getServiceDate();
    }

    private Double reservationTotal(Reservation reservation) {
        return reservation.getReservationType() == ReservationType.EXTRAS
                ? reservation.getTotalExtrasAmount()
                : reservation.getTotalAmount();
    }
}
