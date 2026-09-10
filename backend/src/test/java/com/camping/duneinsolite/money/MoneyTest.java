package com.camping.duneinsolite.money;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MoneyTest {

    @Test
    void roundsToTheMillimeHalfUp() {
        assertThat(Money.round(new BigDecimal("1.2345"))).isEqualByComparingTo("1.235");
        assertThat(Money.round(new BigDecimal("1.2344"))).isEqualByComparingTo("1.234");
        assertThat(Money.round(new BigDecimal("1.2"))).isEqualByComparingTo("1.200");
        assertThat(Money.round(null)).isNull();
    }

    @Test
    void lineTotalMultipliesThenRoundsOnce() {
        assertThat(Money.lineTotal(new BigDecimal("95.000"), 2, 3)).isEqualByComparingTo("570.000");
        assertThat(Money.lineTotal(new BigDecimal("33.333"), 3, 1)).isEqualByComparingTo("99.999");
        assertThat(Money.lineTotal(null, 2, 1)).isNull();
    }

    @Test
    void htFromTtcBacksOutTheTax() {
        // 120 TTC at 20% → 100 HT
        assertThat(Money.htFromTtc(new BigDecimal("120.000"), new BigDecimal("20"))).isEqualByComparingTo("100.000");
        // 7% Tunisian TVA
        assertThat(Money.htFromTtc(new BigDecimal("107.000"), new BigDecimal("7"))).isEqualByComparingTo("100.000");
        // rate 0 / null → unchanged
        assertThat(Money.htFromTtc(new BigDecimal("100.000"), BigDecimal.ZERO)).isEqualByComparingTo("100.000");
        assertThat(Money.htFromTtc(new BigDecimal("100.000"), null)).isEqualByComparingTo("100.000");
    }

    @Test
    void taxFromTtcIsTheComplementOfHt() {
        BigDecimal ttc = new BigDecimal("120.000");
        BigDecimal rate = new BigDecimal("20");
        assertThat(Money.htFromTtc(ttc, rate).add(Money.taxFromTtc(ttc, rate))).isEqualByComparingTo("120.000");
        assertThat(Money.taxFromTtc(ttc, rate)).isEqualByComparingTo("20.000");
    }

    @Test
    void roundingBoundaries() {
        assertThat(Money.round(new BigDecimal("0"))).isEqualByComparingTo("0.000");
        assertThat(Money.round(new BigDecimal("0.001"))).isEqualByComparingTo("0.001");
        assertThat(Money.round(new BigDecimal("0.0005"))).isEqualByComparingTo("0.001"); // HALF_UP
        assertThat(Money.round(new BigDecimal("0.0004"))).isEqualByComparingTo("0.000");
        assertThat(Money.round(new BigDecimal("0.0015"))).isEqualByComparingTo("0.002");
        assertThat(Money.round(new BigDecimal("99.9995"))).isEqualByComparingTo("100.000");
        assertThat(Money.round(new BigDecimal("999999.9994"))).isEqualByComparingTo("999999.999");
    }

    @Test
    void nullAndZeroSemanticsArePreserved() {
        assertThat(Money.nz(null)).isEqualByComparingTo("0.000");
        assertThat(Money.multiply((BigDecimal) null, 5)).isNull();   // NULL price stays NULL, never 0
        assertThat(Money.divide(new BigDecimal("10"), BigDecimal.ZERO)).isNull();
        assertThat(Money.divide(new BigDecimal("10"), null)).isNull();
        assertThat(Money.isZeroOrNull(null)).isTrue();
        assertThat(Money.isZeroOrNull(new BigDecimal("0.000"))).isTrue();
    }

    @Test
    void comparisonsAreScaleInsensitive() {
        assertThat(Money.eq(new BigDecimal("1.5"), new BigDecimal("1.500"))).isTrue();
        assertThat(new BigDecimal("1.5").equals(new BigDecimal("1.500"))).isFalse(); // why eq() exists
        assertThat(Money.gt(new BigDecimal("1.501"), new BigDecimal("1.500"))).isTrue();
        assertThat(Money.gte(new BigDecimal("1.500"), new BigDecimal("1.5"))).isTrue();
        assertThat(Money.lt(null, new BigDecimal("0.001"))).isTrue();
    }

    @Test
    void taxWithZeroRateAddsNoTax() {
        assertThat(Money.taxFromTtc(new BigDecimal("100.000"), BigDecimal.ZERO)).isEqualByComparingTo("0.000");
        assertThat(Money.taxFromTtc(new BigDecimal("100.000"), null)).isEqualByComparingTo("0.000");
    }
}
