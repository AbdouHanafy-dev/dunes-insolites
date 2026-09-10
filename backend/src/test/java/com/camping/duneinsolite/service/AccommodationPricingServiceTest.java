package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.AccommodationPricingException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The pricing resolver is the authority on what an accommodation booking costs.
 * These exercise the real arithmetic (no mocked math) and the fail-closed rules.
 */
class AccommodationPricingServiceTest {

    private AccommodationTypeRepository repo;
    private AccommodationPricingService service;

    private final UUID tentId = UUID.randomUUID();
    private final UUID roomId = UUID.randomUUID();
    private final UUID suiteId = UUID.randomUUID();

    private AccommodationType tier(UUID id, String name, int capacity, String price, boolean active) {
        return AccommodationType.builder()
                .id(id).slug(name).name(name).capacity(capacity).active(active)
                .unitPriceTtc(price == null ? null : new BigDecimal(price))
                .tvaRate(new BigDecimal("7"))
                .build();
    }

    @BeforeEach
    void setUp() {
        repo = mock(AccommodationTypeRepository.class);
        service = new AccommodationPricingService(repo);
        when(repo.findById(tentId)).thenReturn(Optional.of(tier(tentId, "Desert Tent", 2, "95.000", true)));
        when(repo.findById(roomId)).thenReturn(Optional.of(tier(roomId, "Desert Room", 3, "125.000", true)));
        when(repo.findById(suiteId)).thenReturn(Optional.of(tier(suiteId, "Dune Suite", 4, "165.000", true)));
    }

    @Test
    void eachTierResolvesToItsOwnConfiguredUnitPrice() {
        assertThat(service.resolveById(tentId, 1, 1, 2).snapshotUnitPriceTtc()).isEqualByComparingTo("95.000");
        assertThat(service.resolveById(roomId, 1, 1, 3).snapshotUnitPriceTtc()).isEqualByComparingTo("125.000");
        assertThat(service.resolveById(suiteId, 1, 1, 4).snapshotUnitPriceTtc()).isEqualByComparingTo("165.000");
    }

    @Test
    void differentTierGivesADifferentAuthoritativeTotal() {
        var tent = service.resolveById(tentId, 1, 1, 2).lineTotalTtc();
        var suite = service.resolveById(suiteId, 1, 1, 2).lineTotalTtc();
        assertThat(suite).isGreaterThan(tent);
        assertThat(suite).isEqualByComparingTo("165.000");
    }

    @Test
    void totalIsUnitPriceTimesUnitsTimesNights() {
        var r = service.resolveById(tentId, 2, 3, 4);
        assertThat(r.lineTotalTtc()).isEqualByComparingTo("570.000"); // 95 × 2 × 3
        // 570 TTC at 7% → HT ≈ 532.710, TVA ≈ 37.290
        assertThat(r.lineTotalHt().add(r.lineTotalTva())).isEqualByComparingTo("570.000");
    }

    @Test
    void unpricedTierIsRejected_bookingCannotProceed() {
        UUID id = UUID.randomUUID();
        when(repo.findById(id)).thenReturn(Optional.of(tier(id, "Dune Suite", 4, null, true)));
        assertThatThrownBy(() -> service.resolveById(id, 1, 1, 2))
                .isInstanceOf(AccommodationPricingException.class)
                .hasMessageContaining("contact the camp");
    }

    @Test
    void inactiveTierIsRejected() {
        UUID id = UUID.randomUUID();
        when(repo.findById(id)).thenReturn(Optional.of(tier(id, "Desert Tent", 2, "95.000", false)));
        assertThatThrownBy(() -> service.resolveById(id, 1, 1, 2))
                .isInstanceOf(AccommodationPricingException.class)
                .hasMessageContaining("no longer available");
    }

    @Test
    void unknownTierIsNotFound() {
        UUID id = UUID.randomUUID();
        when(repo.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.resolveById(id, 1, 1, 2))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void partyThatDoesNotFitIsRejected() {
        // 1 Desert Tent sleeps 2; party of 3 → rejected
        assertThatThrownBy(() -> service.resolveById(tentId, 1, 1, 3))
                .isInstanceOf(AccommodationPricingException.class)
                .hasMessageContaining("not enough");
        // 2 tents sleep 4 → a party of 3 fits
        assertThat(service.resolveById(tentId, 2, 1, 3).units()).isEqualTo(2);
    }
}
