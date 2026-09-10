package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.AccommodationUnavailableException;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.observability.AvailabilityMetrics;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.ReservationTourTypeRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AccommodationAvailabilityServiceTest {

    private AccommodationTypeRepository accRepo;
    private ReservationTourTypeRepository rttRepo;
    private AccommodationAvailabilityService service;

    private final UUID id = UUID.randomUUID();
    private final LocalDate in = LocalDate.of(2026, 9, 20);
    private final LocalDate out = LocalDate.of(2026, 9, 21);

    private AccommodationType tier(Integer maxUnits, boolean active, String price) {
        return AccommodationType.builder()
                .id(id).slug("dune-suite").name("Dune Suite").capacity(4).active(active)
                .unitPriceTtc(price == null ? null : new BigDecimal(price))
                .maxUnits(maxUnits).build();
    }

    @BeforeEach
    void setUp() {
        accRepo = mock(AccommodationTypeRepository.class);
        rttRepo = mock(ReservationTourTypeRepository.class);
        service = new AccommodationAvailabilityService(accRepo, rttRepo,
                new AvailabilityMetrics(new SimpleMeterRegistry()), Clock.systemUTC());
    }

    @Test
    void status_UNKNOWN_whenMaxUnitsNotConfigured() {
        var a = service.status(tier(null, true, "165.000"), in, out);
        assertThat(a.status()).isEqualTo(AccommodationAvailabilityService.Status.UNKNOWN);
        assertThat(a.unitsAvailable()).isNull();
    }

    @Test
    void status_UNAVAILABLE_whenTierNotBookable() {
        assertThat(service.status(tier(3, false, "165.000"), in, out).status())
                .isEqualTo(AccommodationAvailabilityService.Status.UNAVAILABLE);
        assertThat(service.status(tier(3, true, null), in, out).status())
                .isEqualTo(AccommodationAvailabilityService.Status.UNAVAILABLE);
    }

    @Test
    void status_AVAILABLE_and_UNAVAILABLE_fromConsumingCount() {
        when(rttRepo.sumConsumingUnits(eq(id), eq(in), eq(out), any(LocalDateTime.class), isNull())).thenReturn(1L);
        var a = service.status(tier(3, true, "165.000"), in, out);
        assertThat(a.status()).isEqualTo(AccommodationAvailabilityService.Status.AVAILABLE);
        assertThat(a.unitsAvailable()).isEqualTo(2);

        when(rttRepo.sumConsumingUnits(eq(id), eq(in), eq(out), any(LocalDateTime.class), isNull())).thenReturn(3L);
        assertThat(service.status(tier(3, true, "165.000"), in, out).status())
                .isEqualTo(AccommodationAvailabilityService.Status.UNAVAILABLE);
    }

    @Test
    void allocate_isNoOp_whenMaxUnitsNull() {
        when(accRepo.lockById(id)).thenReturn(Optional.of(tier(null, true, "165.000")));
        assertThatCode(() -> service.allocate(id, 2, in, out, null)).doesNotThrowAnyException();
        verify(rttRepo, never()).sumConsumingUnits(any(), any(), any(), any(), any());
    }

    @Test
    void allocate_locksTheTierRow_thenChecks() {
        when(accRepo.lockById(id)).thenReturn(Optional.of(tier(3, true, "165.000")));
        when(rttRepo.sumConsumingUnits(eq(id), eq(in), eq(out), any(LocalDateTime.class), isNull())).thenReturn(1L);
        service.allocate(id, 2, in, out, null); // 1 + 2 == 3 → ok
        verify(accRepo).lockById(id);
    }

    @Test
    void allocate_throws_whenRequestExceedsInventory() {
        when(accRepo.lockById(id)).thenReturn(Optional.of(tier(3, true, "165.000")));
        when(rttRepo.sumConsumingUnits(eq(id), eq(in), eq(out), any(LocalDateTime.class), isNull())).thenReturn(2L);
        assertThatThrownBy(() -> service.allocate(id, 2, in, out, null)) // 2 + 2 > 3
                .isInstanceOf(AccommodationUnavailableException.class)
                .hasMessageContaining("Only 1");
    }

    @Test
    void allocate_excludesTheReservationBeingConfirmed() {
        UUID resId = UUID.randomUUID();
        when(accRepo.lockById(id)).thenReturn(Optional.of(tier(1, true, "165.000")));
        when(rttRepo.sumConsumingUnits(eq(id), eq(in), eq(out), any(LocalDateTime.class), eq(resId))).thenReturn(0L);
        assertThatCode(() -> service.allocate(id, 1, in, out, resId)).doesNotThrowAnyException();
    }
}
