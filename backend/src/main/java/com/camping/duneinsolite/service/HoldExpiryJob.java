package com.camping.duneinsolite.service;

import com.camping.duneinsolite.observability.AvailabilityMetrics;
import com.camping.duneinsolite.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

/**
 * Moves PENDING public holds whose {@code holdExpiresAt} has passed to EXPIRED.
 *
 * <p>Housekeeping only — {@code sumConsumingUnits} already excludes a past-expiry
 * hold, so availability is correct whether or not this has run. The job keeps
 * the reservation list legible and drives the {@code reservation_hold_total{event="expired"}}
 * metric. Idempotent; a missed run is harmless.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HoldExpiryJob {

    private final ReservationRepository reservationRepository;
    private final AvailabilityMetrics metrics;
    private final Clock clock;

    @Scheduled(
            fixedDelayString = "${app.reservation.hold-expiry-sweep-ms:300000}",
            initialDelayString = "${app.reservation.hold-expiry-sweep-ms:300000}")
    @Transactional
    public void sweep() {
        int expired = reservationRepository.expireStaleHolds(LocalDateTime.now(clock));
        if (expired > 0) {
            metrics.holdsExpired(expired);
            log.info("Expired {} stale reservation hold(s)", expired);
        }
    }
}
