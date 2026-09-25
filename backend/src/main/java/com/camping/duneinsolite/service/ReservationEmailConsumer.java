package com.camping.duneinsolite.service;

import com.camping.duneinsolite.config.RabbitMQConfig;
import com.camping.duneinsolite.dto.message.NotificationMessage;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.EmailType;
import com.camping.duneinsolite.observability.CorrelationId;
import com.camping.duneinsolite.observability.EmailMetrics;
import com.camping.duneinsolite.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

/**
 * Sends the "we received your booking request" email (DI-014).
 *
 * <p>Reliability contract (production-hardening item 2):
 * <ul>
 *   <li>Runs on {@code emailListenerContainerFactory} (AUTO ack + retry). The
 *       message is acked only when this method returns normally - i.e. after the
 *       email was actually sent or was provably a duplicate.</li>
 *   <li>On failure it rethrows: the container retries with backoff, then
 *       dead-letters to {@code notification.dlq} where {@code DeadLetterConsumer}
 *       records it for replay.</li>
 *   <li>Idempotent via {@code email_dispatch} - a redelivered message whose
 *       dispatch row is already {@code SENT} is skipped, never re-mailed.</li>
 *   <li>Carries the correlation id from the message into MDC for its logs.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationEmailConsumer {

    private final ReservationRepository reservationRepository;
    private final EmailDispatchService emailDispatchService;
    private final com.camping.duneinsolite.mail.ReservationMailer reservationMailer;
    private final EmailMetrics emailMetrics;
    private final com.camping.duneinsolite.service.impl.ReservationOverviewFactory overviewFactory;

    @RabbitListener(queues = RabbitMQConfig.EMAIL_QUEUE, containerFactory = "emailListenerContainerFactory")
    public void consume(NotificationMessage message) {
        try (CorrelationId.Scope ignored = CorrelationId.scope(message.getCorrelationId())) {
            RecipientView view = loadRecipient(message);

            var claim = emailDispatchService.claim(
                    message.getReservationId(), EmailType.RESERVATION_RECEIVED,
                    view.email(), message.getCorrelationId());

            if (claim.alreadySent()) {
                log.info("reservation-received email already sent for reservation {} - skipping duplicate delivery",
                        message.getReservationId());
                emailMetrics.emailSkippedDuplicate();
                return;
            }

            try {
                reservationMailer.sendReceived(
                        view.email(), view.name(), view.locale(), view.date(), view.total(), view.currency(),
                        overviewOrNull(message));
                emailDispatchService.markSent(claim.dispatchId());
                emailMetrics.emailSent();
                log.info("reservation-received email delivered for reservation {} (attempt {})",
                        message.getReservationId(), claim.attempts());
            } catch (RuntimeException sendFailure) {
                emailDispatchService.markFailed(claim.dispatchId(), sendFailure.toString());
                emailMetrics.emailFailed();
                log.error("reservation-received email FAILED for reservation {} (attempt {}) - {}",
                        message.getReservationId(), claim.attempts(), sendFailure.getMessage());
                throw sendFailure; // -> container retry -> DLQ
            }
        }
    }

    /** The booking summary is a nicety: if it cannot be built the plain confirmation still goes out. */
    private com.camping.duneinsolite.mail.ReservationOverview overviewOrNull(NotificationMessage message) {
        try {
            return overviewFactory.forReservation(message.getReservationId());
        } catch (RuntimeException e) {
            log.warn("could not build the booking overview for reservation {}: {}",
                    message.getReservationId(), e.getMessage());
            return null;
        }
    }

    private record RecipientView(String email, String name, com.camping.duneinsolite.model.enums.MailLocale locale,
                                 LocalDate date, java.math.BigDecimal total, String currency) {}

    private RecipientView loadRecipient(NotificationMessage message) {
        Reservation reservation = reservationRepository.findByIdWithUser(message.getReservationId())
                .orElseThrow(() -> new IllegalStateException(
                        "Reservation not found: " + message.getReservationId()));
        User user = reservation.getUser();
        LocalDate date = reservation.getCheckInDate() != null
                ? reservation.getCheckInDate() : reservation.getServiceDate();
        java.math.BigDecimal total = com.camping.duneinsolite.money.Money.add(
                reservation.getTotalAmount(), reservation.getTotalExtrasAmount());
        String currency = reservation.getCurrency() != null ? reservation.getCurrency().name() : "EUR";
        return new RecipientView(user.getEmail(), user.getName(),
                com.camping.duneinsolite.model.enums.MailLocale.from(reservation.getLocale()), date, total, currency);
    }
}
