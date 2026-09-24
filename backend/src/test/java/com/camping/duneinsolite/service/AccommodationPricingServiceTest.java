package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.AccommodationPricingException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.PricingRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.PricingRuleRepository;
import com.camping.duneinsolite.service.AccommodationPricingService.Guests;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The pricing resolver is the authority on what an accommodation booking costs.
 * A tier is priced per person per night, one price per guest type. These exercise
 * the real arithmetic (no mocked math) and the fail-closed rules.
 */
class AccommodationPricingServiceTest {

    private AccommodationTypeRepository repo;
    private PricingRuleRepository pricingRuleRepo;
    private AccommodationPricingService service;

    private final UUID tentId = UUID.randomUUID();
    private final UUID roomId = UUID.randomUUID();
    private final UUID suiteId = UUID.randomUUID();
    private final LocalDate day = LocalDate.of(2026, 10, 15);

    private AccommodationType tier(UUID id, String name, int capacity, String adult, String child, String infant,
                                   boolean active) {
        return AccommodationType.builder()
                .id(id).slug(name).name(name).capacity(capacity).active(active)
                .adultPriceTtc(adult == null ? null : new BigDecimal(adult))
                .childPriceTtc(child == null ? null : new BigDecimal(child))
                .infantPriceTtc(infant == null ? null : new BigDecimal(infant))
                .tvaRate(new BigDecimal("7"))
                .build();
    }

    private PricingRule rule(PricingRuleType type, String price) {
        return PricingRule.builder()
                .ruleType(type)
                .startDate(day.minusDays(5))
                .endDate(day.plusDays(5))
                .priceTtc(new BigDecimal(price))
                .active(true)
                .build();
    }

    @BeforeEach
    void setUp() {
        repo = mock(AccommodationTypeRepository.class);
        pricingRuleRepo = mock(PricingRuleRepository.class);
        service = new AccommodationPricingService(repo, pricingRuleRepo);
        when(repo.findById(tentId)).thenReturn(Optional.of(tier(tentId, "Desert Tent", 2, "50.000", "30.000", "0.000", true)));
        when(repo.findById(roomId)).thenReturn(Optional.of(tier(roomId, "Desert Room", 3, "45.000", "30.000", "0.000", true)));
        when(repo.findById(suiteId)).thenReturn(Optional.of(tier(suiteId, "Dune Suite", 4, "80.000", "50.000", "10.000", true)));
        when(pricingRuleRepo.findActiveCovering(any(), any())).thenReturn(List.of());
    }

    @Test
    void eachTierResolvesToItsOwnPricePerGuestType() {
        var suite = service.resolveById(suiteId, 1, 1, new Guests(2, 1, 1), day);
        assertThat(suite.adultPrice()).isEqualByComparingTo("80.000");
        assertThat(suite.childPrice()).isEqualByComparingTo("50.000");
        assertThat(suite.infantPrice()).isEqualByComparingTo("10.000");
        assertThat(service.resolveById(tentId, 1, 1, new Guests(1, 1, 0), day).adultPrice()).isEqualByComparingTo("50.000");
    }

    @Test
    void totalIsEachGuestTypeTimesItsPriceTimesNights() {
        // 2 adults × 80 + 1 child × 50 + 1 infant × 10 = 220 per night, × 3 nights
        var r = service.resolveById(suiteId, 1, 3, new Guests(2, 1, 1), day);
        assertThat(r.lineTotalTtc()).isEqualByComparingTo("660.000");
        assertThat(r.lineTotalHt().add(r.lineTotalTva())).isEqualByComparingTo("660.000");
    }

    @Test
    void anInfantWithNoPriceIsFree() {
        var r = service.resolveById(tentId, 1, 1, new Guests(2, 0, 1), day);
        assertThat(r.lineTotalTtc()).isEqualByComparingTo("100.000");
    }

    @Test
    void aMissingChildPriceFallsBackToTheAdultPriceNeverToFree() {
        UUID id = UUID.randomUUID();
        when(repo.findById(id)).thenReturn(Optional.of(tier(id, "Desert Tent", 2, "50.000", null, null, true)));
        var r = service.resolveById(id, 1, 1, new Guests(1, 1, 1), day);
        assertThat(r.childPrice()).isEqualByComparingTo("50.000");
        assertThat(r.infantPrice()).isEqualByComparingTo("0.000");
        assertThat(r.lineTotalTtc()).isEqualByComparingTo("100.000");
    }

    @Test
    void infantsDoNotCountTowardCapacity() {
        // 1 tent sleeps 2: two seated guests plus an infant fits
        assertThat(service.resolveById(tentId, 1, 1, new Guests(1, 1, 3), day).units()).isEqualTo(1);
        // but three seated guests do not
        assertThatThrownBy(() -> service.resolveById(tentId, 1, 1, new Guests(2, 1, 0), day))
                .isInstanceOf(AccommodationPricingException.class)
                .hasMessageContaining("not enough");
    }

    @Test
    void moreUnitsFitALargerParty() {
        assertThat(service.resolveById(tentId, 2, 1, new Guests(2, 1, 0), day).units()).isEqualTo(2);
    }

    @Test
    void aTierNeedsAtLeastOneSeatedGuest() {
        assertThatThrownBy(() -> service.resolveById(tentId, 1, 1, new Guests(0, 0, 2), day))
                .isInstanceOf(AccommodationPricingException.class)
                .hasMessageContaining("at least one guest");
    }

    @Test
    void unpricedTierIsRejected_bookingCannotProceed() {
        UUID id = UUID.randomUUID();
        when(repo.findById(id)).thenReturn(Optional.of(tier(id, "Dune Suite", 4, null, null, null, true)));
        assertThatThrownBy(() -> service.resolveById(id, 1, 1, new Guests(2, 0, 0), day))
                .isInstanceOf(AccommodationPricingException.class)
                .hasMessageContaining("contact the camp");
    }

    @Test
    void inactiveTierIsRejected() {
        UUID id = UUID.randomUUID();
        when(repo.findById(id)).thenReturn(Optional.of(tier(id, "Desert Tent", 2, "50.000", "30.000", "0.000", false)));
        assertThatThrownBy(() -> service.resolveById(id, 1, 1, new Guests(2, 0, 0), day))
                .isInstanceOf(AccommodationPricingException.class)
                .hasMessageContaining("no longer available");
    }

    @Test
    void unknownTierIsNotFound() {
        UUID id = UUID.randomUUID();
        when(repo.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.resolveById(id, 1, 1, new Guests(2, 0, 0), day))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void aDateRuleSetsTheAdultPriceAndChildAndInfantFollowByTheSameRatio() {
        // Standard adult 80 → rule 120 = ×1.5, so child 50 → 75 and infant 10 → 15
        when(pricingRuleRepo.findActiveCovering(eq(suiteId), eq(day)))
                .thenReturn(List.of(rule(PricingRuleType.DATE, "120.000")));
        var r = service.resolveById(suiteId, 1, 1, new Guests(1, 1, 1), day);
        assertThat(r.adultPrice()).isEqualByComparingTo("120.000");
        assertThat(r.childPrice()).isEqualByComparingTo("75.000");
        assertThat(r.infantPrice()).isEqualByComparingTo("15.000");
        assertThat(r.lineTotalTtc()).isEqualByComparingTo("210.000");
    }

    @Test
    void aPeriodRuleAppliesWhenNoDateRuleExists() {
        when(pricingRuleRepo.findActiveCovering(eq(tentId), eq(day)))
                .thenReturn(List.of(rule(PricingRuleType.PERIOD, "100.000")));
        assertThat(service.resolveById(tentId, 1, 1, new Guests(1, 0, 0), day).adultPrice()).isEqualByComparingTo("100.000");
    }

    @Test
    void aDateRuleWinsOverAnOverlappingPeriodRule() {
        when(pricingRuleRepo.findActiveCovering(eq(tentId), eq(day)))
                .thenReturn(List.of(rule(PricingRuleType.PERIOD, "100.000"), rule(PricingRuleType.DATE, "150.000")));
        assertThat(service.resolveById(tentId, 1, 1, new Guests(1, 0, 0), day).adultPrice()).isEqualByComparingTo("150.000");
    }

    @Test
    void aDateOutsideAnyRuleFallsBackToTheStandardPrice() {
        when(pricingRuleRepo.findActiveCovering(eq(tentId), eq(day.plusMonths(6)))).thenReturn(List.of());
        assertThat(service.resolveById(tentId, 1, 1, new Guests(1, 0, 0), day.plusMonths(6)).adultPrice())
                .isEqualByComparingTo("50.000");
    }

    // ── splitting the party across several tiers ─────────────────────────────

    @Test
    void aSingleTierTakesTheWholePartyEvenIfItDidNotSayWho() {
        var party = new Guests(2, 1, 1);
        assertThat(AccommodationPricingService.splitGuests(Arrays.asList((Guests) null), party)).containsExactly(party);
    }

    @Test
    void severalTiersMustAddUpToTheParty() {
        var party = new Guests(3, 1, 1);
        var split = AccommodationPricingService.splitGuests(
                List.of(new Guests(2, 0, 0), new Guests(1, 1, 1)), party);
        assertThat(split).hasSize(2);

        assertThatThrownBy(() -> AccommodationPricingService.splitGuests(
                List.of(new Guests(2, 0, 0), new Guests(0, 1, 1)), party))
                .isInstanceOf(AccommodationPricingException.class)
                .hasMessageContaining("add up to your party");
    }

    @Test
    void severalTiersMustEachSayWhoSleepsThere() {
        assertThatThrownBy(() -> AccommodationPricingService.splitGuests(
                Arrays.asList(new Guests(2, 0, 0), null), new Guests(2, 0, 0)))
                .isInstanceOf(AccommodationPricingException.class)
                .hasMessageContaining("who sleeps in each");
    }
}
