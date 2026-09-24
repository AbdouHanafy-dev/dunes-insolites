package com.camping.duneinsolite.config;

import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.enums.Currency;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * FX rates as {@link BigDecimal} (Phase 3) — they divide monetary amounts, so
 * they live on the exact-arithmetic side of the boundary.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.currency")
public class CurrencyConfig {

    /**
     * The currency every catalogue price and every new reservation is held in.
     * Amounts are never converted while a reservation is in this currency.
     */
    public static final Currency BASE = Currency.EUR;

    // Dinars per 1 EUR / 1 USD. Kept as the configured source of truth; the
    // per-currency factor callers use is {@link #rateFor}, relative to BASE.
    private BigDecimal eurRate = new BigDecimal("3.4");

    private BigDecimal usdRate = new BigDecimal("2.5");

    /**
     * Units of {@link #BASE} worth one unit of {@code currency}: an amount in
     * BASE divided by this gives the amount in {@code currency}.
     */
    public BigDecimal rateFor(Currency currency) {
        return switch (currency) {
            case EUR -> BigDecimal.ONE;
            case USD -> usdRate.divide(eurRate, 10, RoundingMode.HALF_EVEN);
            case TND -> BigDecimal.ONE.divide(eurRate, 10, RoundingMode.HALF_EVEN);
        };
    }

    public BigDecimal effectiveRate(Reservation reservation) {
        return reservation.getExchangeRateApplied() != null
                ? reservation.getExchangeRateApplied()
                : rateFor(reservation.getCurrency());
    }
}
