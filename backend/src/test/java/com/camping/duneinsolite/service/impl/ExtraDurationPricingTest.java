package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.exception.ReservationValidationException;
import com.camping.duneinsolite.model.Extra;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ExtraDurationPricingTest {

    private static Extra quad(int base, int step, int max) {
        return Extra.builder().name("Quad").baseDurationMinutes(base)
                .durationStepMinutes(step).maxDurationMinutes(max).build();
    }

    @Test
    void noPickBooksTheBaseDuration() {
        assertEquals(30, ExtraDurationPricing.resolveMinutes(quad(30, 30, 120), null));
    }

    @Test
    void sixtyMinutesCostsTwiceTheUnitPrice() {
        int minutes = ExtraDurationPricing.resolveMinutes(quad(30, 30, 120), 60);
        assertEquals(new BigDecimal("50.000"),
                ExtraDurationPricing.priceFor(new BigDecimal("25.000"), minutes, 30));
    }

    @Test
    void anHourAndAHalfCostsThreeUnits() {
        assertEquals(new BigDecimal("75.000"),
                ExtraDurationPricing.priceFor(new BigDecimal("25.000"), 90, 30));
    }

    @Test
    void baseDurationKeepsTheExactUnitPrice() {
        BigDecimal unit = new BigDecimal("33.333");
        assertEquals(unit, ExtraDurationPricing.priceFor(unit, 30, 30));
    }

    @Test
    void rejectsBelowBaseAboveMaxOrOffStep() {
        Extra e = quad(30, 30, 120);
        assertThrows(ReservationValidationException.class, () -> ExtraDurationPricing.resolveMinutes(e, 15));
        assertThrows(ReservationValidationException.class, () -> ExtraDurationPricing.resolveMinutes(e, 150));
        assertThrows(ReservationValidationException.class, () -> ExtraDurationPricing.resolveMinutes(e, 45));
    }

    @Test
    void anExtraWithMaxEqualToBaseCannotBeExtended() {
        assertThrows(ReservationValidationException.class,
                () -> ExtraDurationPricing.resolveMinutes(quad(30, 30, 30), 60));
    }

    @Test
    void labelsReadAsMinutesOrHours() {
        assertEquals("30 min", ExtraDurationPricing.label(30));
        assertEquals("1h", ExtraDurationPricing.label(60));
        assertEquals("1h30", ExtraDurationPricing.label(90));
        assertEquals("2h", ExtraDurationPricing.label(120));
    }
}
