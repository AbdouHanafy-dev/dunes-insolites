package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.exception.ReservationValidationException;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.money.Money;

import java.math.BigDecimal;

/**
 * Timed activities: {@link Extra#getUnitPrice()} is the price of one base
 * duration (30 min by default), and a longer session costs
 * {@code unitPrice x minutes / base}. The back office sets base, step and
 * maximum in minutes; the server validates the guest's pick against them.
 */
final class ExtraDurationPricing {

    private ExtraDurationPricing() {}

    /** Minutes to book: the guest's pick, or the base duration when none was sent. */
    static int resolveMinutes(Extra extra, Integer requested) {
        int base = extra.getBaseDurationMinutes();
        if (requested == null || requested == base) return base;
        int step = extra.getDurationStepMinutes();
        int max = extra.getMaxDurationMinutes();
        if (requested < base || requested > max || (requested - base) % step != 0) {
            throw new ReservationValidationException(
                    "Invalid duration for " + extra.getName() + ": " + requested + " min");
        }
        return requested;
    }

    /** Price of one unit for {@code minutes}, at the money scale. */
    static BigDecimal priceFor(BigDecimal unitPrice, int minutes, int baseMinutes) {
        if (minutes == baseMinutes) return unitPrice;
        return Money.divide(Money.multiply(unitPrice, minutes), BigDecimal.valueOf(baseMinutes));
    }

    /** "30 min", "1h", "1h30", "2h" - the label kept on the reservation line. */
    static String label(int minutes) {
        int h = minutes / 60;
        int m = minutes % 60;
        if (h == 0) return m + " min";
        return m == 0 ? h + "h" : h + "h" + String.format("%02d", m);
    }
}
