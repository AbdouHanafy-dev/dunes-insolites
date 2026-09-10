package com.camping.duneinsolite.config;

import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.enums.Currency;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * FX rates as {@link BigDecimal} (Phase 3) — they divide monetary amounts, so
 * they live on the exact-arithmetic side of the boundary.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.currency")
public class CurrencyConfig {

    private BigDecimal eurRate = new BigDecimal("3.4");

    private BigDecimal usdRate = new BigDecimal("2.5");

    public BigDecimal rateFor(Currency currency) {
        return switch (currency) {
            case EUR -> eurRate;
            case USD -> usdRate;
            case TND -> BigDecimal.ONE;
        };
    }

    public BigDecimal effectiveRate(Reservation reservation) {
        return reservation.getExchangeRateApplied() != null
                ? reservation.getExchangeRateApplied()
                : rateFor(reservation.getCurrency());
    }
}
