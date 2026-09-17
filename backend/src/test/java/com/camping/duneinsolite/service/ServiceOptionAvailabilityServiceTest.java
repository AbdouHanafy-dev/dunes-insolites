package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.ServiceOptionUnavailableException;
import com.camping.duneinsolite.model.ServiceOption;
import com.camping.duneinsolite.model.enums.PricingUnit;
import com.camping.duneinsolite.model.enums.ServiceOptionCategory;
import com.camping.duneinsolite.observability.AvailabilityMetrics;
import com.camping.duneinsolite.repository.ReservationServiceOptionRepository;
import com.camping.duneinsolite.repository.ServiceOptionRepository;
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

/** Twin of ExtraAvailabilityServiceTest - same cases, for guide/transport options. */
class ServiceOptionAvailabilityServiceTest {

    private ServiceOptionRepository optionRepo;
    private ReservationServiceOptionRepository rsoRepo;
    private ServiceOptionAvailabilityService service;

    private final UUID id = UUID.randomUUID();
    private final LocalDate day = LocalDate.of(2026, 10, 20);

    private ServiceOption option(Integer maxUnitsPerDay, boolean active) {
        return ServiceOption.builder()
                .id(id).slug("guide-support").name("Guide with Support Vehicle")
                .category(ServiceOptionCategory.GUIDE).type("GUIDE_WITH_SUPPORT_VEHICLE")
                .pricingUnit(PricingUnit.PER_DAY).active(active)
                .maxUnitsPerDay(maxUnitsPerDay)
                .build();
    }

    @BeforeEach
    void setUp() {
        optionRepo = mock(ServiceOptionRepository.class);
        rsoRepo = mock(ReservationServiceOptionRepository.class);
        service = new ServiceOptionAvailabilityService(optionRepo, rsoRepo,
                new AvailabilityMetrics(new SimpleMeterRegistry()), Clock.systemUTC());
    }

    @Test
    void status_UNKNOWN_whenCapacityNotConfigured() {
        var a = service.status(option(null, true), day);
        assertThat(a.status()).isEqualTo(ServiceOptionAvailabilityService.Status.UNKNOWN);
        assertThat(a.unitsAvailable()).isNull();
    }

    @Test
    void status_UNAVAILABLE_whenDeactivated() {
        assertThat(service.status(option(4, false), day).status())
                .isEqualTo(ServiceOptionAvailabilityService.Status.UNAVAILABLE);
    }

    @Test
    void status_AVAILABLE_whenPartiallyBooked() {
        // 4 guides total, 3 already booked -> 1 remaining
        when(rsoRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), isNull())).thenReturn(3L);
        var a = service.status(option(4, true), day);
        assertThat(a.status()).isEqualTo(ServiceOptionAvailabilityService.Status.AVAILABLE);
        assertThat(a.unitsAvailable()).isEqualTo(1);
    }

    @Test
    void status_UNAVAILABLE_whenFullyBooked() {
        when(rsoRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), isNull())).thenReturn(4L);
        assertThat(service.status(option(4, true), day).status())
                .isEqualTo(ServiceOptionAvailabilityService.Status.UNAVAILABLE);
    }

    @Test
    void allocate_isNoOp_whenCapacityNotConfigured() {
        when(optionRepo.lockById(id)).thenReturn(Optional.of(option(null, true)));
        assertThatCode(() -> service.allocate(id, 1, day, null)).doesNotThrowAnyException();
        verify(rsoRepo, never()).sumConsumingQuantity(any(), any(), any(), any());
    }

    @Test
    void allocate_accepts_whenItFits() {
        when(optionRepo.lockById(id)).thenReturn(Optional.of(option(4, true)));
        when(rsoRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), isNull())).thenReturn(3L);
        service.allocate(id, 1, day, null); // 3 + 1 == 4, fits exactly
        verify(optionRepo).lockById(id);
    }

    @Test
    void allocate_throws_whenRequestExceedsCapacity() {
        when(optionRepo.lockById(id)).thenReturn(Optional.of(option(4, true)));
        when(rsoRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), isNull())).thenReturn(3L);
        assertThatThrownBy(() -> service.allocate(id, 2, day, null)) // 3 + 2 > 4
                .isInstanceOf(ServiceOptionUnavailableException.class)
                .hasMessageContaining("Only 1");
    }

    @Test
    void allocate_throws_whenFullyBooked() {
        when(optionRepo.lockById(id)).thenReturn(Optional.of(option(4, true)));
        when(rsoRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), isNull())).thenReturn(4L);
        assertThatThrownBy(() -> service.allocate(id, 1, day, null))
                .isInstanceOf(ServiceOptionUnavailableException.class)
                .hasMessageContaining("fully booked");
    }

    @Test
    void allocate_throws_whenDeactivated() {
        when(optionRepo.lockById(id)).thenReturn(Optional.of(option(4, false)));
        assertThatThrownBy(() -> service.allocate(id, 1, day, null))
                .isInstanceOf(ServiceOptionUnavailableException.class)
                .hasMessageContaining("no longer available");
        verify(rsoRepo, never()).sumConsumingQuantity(any(), any(), any(), any());
    }

    @Test
    void allocate_excludesTheReservationBeingConfirmed() {
        UUID resId = UUID.randomUUID();
        when(optionRepo.lockById(id)).thenReturn(Optional.of(option(1, true)));
        when(rsoRepo.sumConsumingQuantity(eq(id), eq(day), any(LocalDateTime.class), eq(resId))).thenReturn(0L);
        assertThatCode(() -> service.allocate(id, 1, day, resId)).doesNotThrowAnyException();
    }
}
