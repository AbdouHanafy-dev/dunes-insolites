package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.ActivityUnavailableException;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.observability.AvailabilityMetrics;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.ReservationExtraRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Twin of AccommodationAvailabilityServiceTest - same cases, keyed on one
 * day instead of a night range. Covers the "activité disponible / complète /
 * partielle / fermée / quantité > restant" cases from the availability
 * brief (concurrency itself is exercised by a real Testcontainers IT, not
 * here — this is the pure decision logic under mocks).
 */
class ExtraAvailabilityServiceTest {

    private ExtraRepository extraRepo;
    private ReservationExtraRepository reRepo;
    private ExtraAvailabilityService service;

    private final UUID id = UUID.randomUUID();
    private final LocalDate day = LocalDate.of(2026, 10, 20);

    private Extra activity(Integer maxUnitsPerDay, boolean active) {
        return Extra.builder()
                .extraId(id).name("Quad").isActive(active)
                .maxUnitsPerDay(maxUnitsPerDay)
                .build();
    }

    @BeforeEach
    void setUp() {
        extraRepo = mock(ExtraRepository.class);
        reRepo = mock(ReservationExtraRepository.class);
        service = new ExtraAvailabilityService(extraRepo, reRepo,
                new AvailabilityMetrics(new SimpleMeterRegistry()), Clock.systemUTC());
    }

    @Test
    void status_UNKNOWN_whenCapacityNotConfigured() {
        var a = service.status(activity(null, true), day);
        assertThat(a.status()).isEqualTo(ExtraAvailabilityService.Status.UNKNOWN);
        assertThat(a.unitsAvailable()).isNull();
    }

    @Test
    void status_UNAVAILABLE_whenActivityDeactivated() {
        assertThat(service.status(activity(8, false), day).status())
                .isEqualTo(ExtraAvailabilityService.Status.UNAVAILABLE);
    }

    @Test
    void status_AVAILABLE_whenPartiallyBooked() {
        // 8 total, 6 already reserved → 2 available
        when(reRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), isNull())).thenReturn(6L);
        var a = service.status(activity(8, true), day);
        assertThat(a.status()).isEqualTo(ExtraAvailabilityService.Status.AVAILABLE);
        assertThat(a.unitsAvailable()).isEqualTo(2);
    }

    @Test
    void status_UNAVAILABLE_whenFullyBooked() {
        when(reRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), isNull())).thenReturn(8L);
        var a = service.status(activity(8, true), day);
        assertThat(a.status()).isEqualTo(ExtraAvailabilityService.Status.UNAVAILABLE);
        assertThat(a.unitsAvailable()).isEqualTo(0);
    }

    @Test
    void allocate_isNoOp_whenCapacityNotConfigured() {
        when(extraRepo.lockById(id)).thenReturn(Optional.of(activity(null, true)));
        assertThatCode(() -> service.allocate(id, 3, day, null)).doesNotThrowAnyException();
        verify(reRepo, never()).sumConsumingQuantity(any(), any(), any(), any());
    }

    @Test
    void allocate_locksTheActivityRow_thenAccepts_whenItFits() {
        when(extraRepo.lockById(id)).thenReturn(Optional.of(activity(8, true)));
        when(reRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), isNull())).thenReturn(6L);
        // client A asks for 2 → 6 + 2 == 8, fits exactly
        service.allocate(id, 2, day, null);
        verify(extraRepo).lockById(id);
    }

    @Test
    void allocate_throws_whenRequestedQuantityExceedsRemaining() {
        // 8 total, 6 already consumed, client B asks for 4 → 6 + 4 > 8, rejected
        when(extraRepo.lockById(id)).thenReturn(Optional.of(activity(8, true)));
        when(reRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), isNull())).thenReturn(6L);
        assertThatThrownBy(() -> service.allocate(id, 4, day, null))
                .isInstanceOf(ActivityUnavailableException.class)
                .hasMessageContaining("Only 2");
    }

    @Test
    void allocate_throws_whenActivityIsFullyBooked() {
        when(extraRepo.lockById(id)).thenReturn(Optional.of(activity(8, true)));
        when(reRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), isNull())).thenReturn(8L);
        assertThatThrownBy(() -> service.allocate(id, 1, day, null))
                .isInstanceOf(ActivityUnavailableException.class)
                .hasMessageContaining("fully booked");
    }

    @Test
    void allocate_throws_whenActivityIsClosed() {
        when(extraRepo.lockById(id)).thenReturn(Optional.of(activity(8, false)));
        assertThatThrownBy(() -> service.allocate(id, 1, day, null))
                .isInstanceOf(ActivityUnavailableException.class)
                .hasMessageContaining("no longer available");
        // Closed is rejected before the capacity sum is even read.
        verify(reRepo, never()).sumConsumingQuantity(any(), any(), any(), any());
    }

    @Test
    void allocate_isScopedPerDay_anotherDateIsUnaffected() {
        LocalDate otherDay = day.plusDays(1);
        when(extraRepo.lockById(id)).thenReturn(Optional.of(activity(8, true)));
        when(reRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), isNull())).thenReturn(8L);
        when(reRepo.sumConsumingQuantity(eq(id), eq(otherDay), any(LocalDateTime.class), isNull())).thenReturn(0L);

        assertThatThrownBy(() -> service.allocate(id, 1, day, null))
                .isInstanceOf(ActivityUnavailableException.class);
        assertThatCode(() -> service.allocate(id, 5, otherDay, null)).doesNotThrowAnyException();
    }

    @Test
    void allocate_excludesTheReservationBeingConfirmed() {
        UUID resId = UUID.randomUUID();
        when(extraRepo.lockById(id)).thenReturn(Optional.of(activity(2, true)));
        when(reRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), eq(resId))).thenReturn(0L);
        assertThatCode(() -> service.allocate(id, 2, day, resId)).doesNotThrowAnyException();
    }
}
