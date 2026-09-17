package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.ServiceOptionPricingException;
import com.camping.duneinsolite.model.ServiceOption;
import com.camping.duneinsolite.model.ServiceOptionPricingRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;
import com.camping.duneinsolite.model.enums.PricingUnit;
import com.camping.duneinsolite.model.enums.ServiceOptionCategory;
import com.camping.duneinsolite.repository.ServiceOptionPricingRuleRepository;
import com.camping.duneinsolite.repository.ServiceOptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ServiceOptionPricingServiceTest {

    private ServiceOptionRepository repo;
    private ServiceOptionPricingRuleRepository ruleRepo;
    private ServiceOptionPricingService service;

    private final UUID guideId = UUID.randomUUID();
    private final LocalDate day = LocalDate.of(2026, 10, 20);

    private ServiceOption option(PricingUnit unit, String price, boolean active) {
        return ServiceOption.builder()
                .id(guideId).slug("guide-support").name("Guide with Support Vehicle")
                .category(ServiceOptionCategory.GUIDE).type("GUIDE_WITH_SUPPORT_VEHICLE")
                .pricingUnit(unit).unitPriceTtc(price == null ? null : new BigDecimal(price))
                .tvaRate(BigDecimal.ZERO).active(active)
                .build();
    }

    @BeforeEach
    void setUp() {
        repo = mock(ServiceOptionRepository.class);
        ruleRepo = mock(ServiceOptionPricingRuleRepository.class);
        service = new ServiceOptionPricingService(repo, ruleRepo);
        when(repo.findById(guideId)).thenReturn(Optional.of(option(PricingUnit.PER_DAY, "100.000", true)));
        when(ruleRepo.findActiveCovering(guideId, day)).thenReturn(List.of());
    }

    @Test
    void perDay_multipliesByQuantity() {
        // 100 TND/day x 3 days = 300 TND
        var priced = service.resolveById(guideId, 3, day);
        assertThat(priced.quantity()).isEqualTo(3);
        assertThat(priced.lineTotalTtc()).isEqualByComparingTo("300.000");
    }

    @Test
    void perBooking_ignoresRequestedQuantity_alwaysOne() {
        when(repo.findById(guideId)).thenReturn(Optional.of(option(PricingUnit.PER_BOOKING, "150.000", true)));
        // client asks for 5 - never trusted for PER_BOOKING
        var priced = service.resolveById(guideId, 5, day);
        assertThat(priced.quantity()).isEqualTo(1);
        assertThat(priced.lineTotalTtc()).isEqualByComparingTo("150.000");
    }

    @Test
    void perPerson_multipliesByParticipantCount() {
        when(repo.findById(guideId)).thenReturn(Optional.of(option(PricingUnit.PER_PERSON, "20.000", true)));
        var priced = service.resolveById(guideId, 4, day);
        assertThat(priced.lineTotalTtc()).isEqualByComparingTo("80.000");
    }

    @Test
    void perVehicle_multipliesByVehicleCount() {
        when(repo.findById(guideId)).thenReturn(Optional.of(option(PricingUnit.PER_VEHICLE, "150.000", true)));
        var priced = service.resolveById(guideId, 2, day);
        assertThat(priced.lineTotalTtc()).isEqualByComparingTo("300.000");
    }

    @Test
    void dateRuleOverridesTheStandardPrice() {
        ServiceOptionPricingRule rule = ServiceOptionPricingRule.builder()
                .ruleType(PricingRuleType.DATE).startDate(day).endDate(day)
                .priceTtc(new BigDecimal("180.000")).active(true).build();
        when(ruleRepo.findActiveCovering(guideId, day)).thenReturn(List.of(rule));
        assertThat(service.resolveById(guideId, 1, day).snapshotUnitPriceTtc()).isEqualByComparingTo("180.000");
    }

    @Test
    void periodRuleOverridesTheStandardPriceWhenNoDateRuleExists() {
        ServiceOptionPricingRule rule = ServiceOptionPricingRule.builder()
                .ruleType(PricingRuleType.PERIOD).startDate(day.minusDays(5)).endDate(day.plusDays(5))
                .priceTtc(new BigDecimal("120.000")).active(true).build();
        when(ruleRepo.findActiveCovering(guideId, day)).thenReturn(List.of(rule));
        assertThat(service.resolveById(guideId, 1, day).snapshotUnitPriceTtc()).isEqualByComparingTo("120.000");
    }

    @Test
    void unpricedOptionIsRejected() {
        when(repo.findById(guideId)).thenReturn(Optional.of(option(PricingUnit.PER_DAY, null, true)));
        assertThatThrownBy(() -> service.resolveById(guideId, 1, day))
                .isInstanceOf(ServiceOptionPricingException.class)
                .hasMessageContaining("contact the camp");
    }

    @Test
    void deactivatedOptionIsRejected() {
        when(repo.findById(guideId)).thenReturn(Optional.of(option(PricingUnit.PER_DAY, "100.000", false)));
        assertThatThrownBy(() -> service.resolveById(guideId, 1, day))
                .isInstanceOf(ServiceOptionPricingException.class)
                .hasMessageContaining("no longer available");
    }

    @Test
    void priceChangeAfterBookingDoesNotAffectTheSnapshot() {
        // resolveById returns a plain value object - the caller snapshots it
        // onto ReservationServiceOption at booking time (see
        // ReservationServiceImpl#applyServiceOptions). Simulate the
        // catalogue price changing between two resolutions of the SAME
        // option and confirm each call is independently priced against
        // whatever the catalogue says at that moment - proving nothing here
        // secretly caches or re-reads a stale value.
        var firstBooking = service.resolveById(guideId, 1, day);
        assertThat(firstBooking.snapshotUnitPriceTtc()).isEqualByComparingTo("100.000");

        when(repo.findById(guideId)).thenReturn(Optional.of(option(PricingUnit.PER_DAY, "130.000", true)));
        var secondBooking = service.resolveById(guideId, 1, day);
        assertThat(secondBooking.snapshotUnitPriceTtc()).isEqualByComparingTo("130.000");
        // The first booking's own already-returned record is unaffected -
        // it's an immutable value, not a live view of the catalogue.
        assertThat(firstBooking.snapshotUnitPriceTtc()).isEqualByComparingTo("100.000");
    }
}
