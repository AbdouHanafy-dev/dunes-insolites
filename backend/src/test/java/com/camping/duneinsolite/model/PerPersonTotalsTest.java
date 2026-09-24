package com.camping.duneinsolite.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** What a reservation line totals to once infants are a third guest type. */
class PerPersonTotalsTest {

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    @Test
    void aStayLineWithoutTiersPricesAdultsChildrenAndInfantsPerNight() {
        var line = ReservationTourType.builder()
                .adultPrice(bd("40.000")).childPrice(bd("25.000")).infantPrice(bd("5.000"))
                .numberOfAdults(2).numberOfChildren(1).numberOfInfants(2)
                .numberOfNights(2).build();
        // (2×40 + 1×25 + 2×5) × 2 nights = 230
        assertThat(line.getTotalPrice()).isEqualByComparingTo("230.000");
    }

    @Test
    void infantsAreFreeWhenTheirPriceIsZero() {
        var line = ReservationTourType.builder()
                .adultPrice(bd("40.000")).childPrice(bd("25.000"))
                .numberOfAdults(2).numberOfChildren(0).numberOfInfants(3)
                .numberOfNights(1).build();
        assertThat(line.getTotalPrice()).isEqualByComparingTo("80.000");
    }

    @Test
    void aPerPersonTierTotalsEachGuestTypeTimesNights() {
        var tier = ReservationAccommodation.builder()
                .accommodationUnits(2)
                .adults(3).children(1).infants(1)
                .adultPriceTtc(bd("50.000")).childPriceTtc(bd("30.000")).infantPriceTtc(bd("0.000"))
                .build();
        assertThat(tier.isPerPerson()).isTrue();
        // (3×50 + 1×30) × 2 nights, the 2 units do not multiply a per-person price
        assertThat(tier.lineTotal(2)).isEqualByComparingTo("360.000");
    }

    @Test
    void anOlderPerUnitTierStillTotalsUnitsTimesUnitPrice() {
        var tier = ReservationAccommodation.builder()
                .accommodationUnits(2).accommodationUnitPriceTtc(bd("95.000")).build();
        assertThat(tier.isPerPerson()).isFalse();
        assertThat(tier.lineTotal(3)).isEqualByComparingTo("570.000");
    }

    @Test
    void aTierPricedStayLineSumsItsTiers() {
        var line = ReservationTourType.builder()
                .adultPrice(bd("0")).childPrice(bd("0"))
                .numberOfAdults(3).numberOfChildren(0).numberOfInfants(0).numberOfNights(1).build();
        line.getAccommodations().add(ReservationAccommodation.builder().accommodationUnits(1)
                .adults(2).children(0).infants(0)
                .adultPriceTtc(bd("80.000")).childPriceTtc(bd("50.000")).infantPriceTtc(bd("0")).build());
        line.getAccommodations().add(ReservationAccommodation.builder().accommodationUnits(1)
                .adults(1).children(0).infants(0)
                .adultPriceTtc(bd("50.000")).childPriceTtc(bd("30.000")).infantPriceTtc(bd("0")).build());
        assertThat(line.getTotalPrice()).isEqualByComparingTo("210.000");
    }
}
