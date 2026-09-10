package com.camping.duneinsolite.service;

import com.camping.duneinsolite.observability.AvailabilityMetrics;
import com.camping.duneinsolite.repository.ReservationRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class HoldExpiryJobTest {

    private final ReservationRepository repo = mock(ReservationRepository.class);
    private final SimpleMeterRegistry registry = new SimpleMeterRegistry();
    private final AvailabilityMetrics metrics = new AvailabilityMetrics(registry);

    private final Clock fixed = Clock.fixed(
            LocalDateTime.of(2026, 9, 20, 12, 0).toInstant(ZoneOffset.UTC), ZoneOffset.UTC);

    private double expiredCount() {
        return registry.get("reservation.hold").tag("event", "expired").counter().count();
    }

    @Test
    void sweep_expiresStaleHolds_atTheClockInstant_andCountsThem() {
        when(repo.expireStaleHolds(eq(LocalDateTime.of(2026, 9, 20, 12, 0)))).thenReturn(3);

        new HoldExpiryJob(repo, metrics, fixed).sweep();

        verify(repo).expireStaleHolds(LocalDateTime.of(2026, 9, 20, 12, 0));
        assertThat(expiredCount()).isEqualTo(3.0);
    }

    @Test
    void sweep_incrementsNothing_whenNoHoldsExpired() {
        when(repo.expireStaleHolds(any())).thenReturn(0);
        new HoldExpiryJob(repo, metrics, fixed).sweep();
        assertThat(expiredCount()).isZero();
    }
}
