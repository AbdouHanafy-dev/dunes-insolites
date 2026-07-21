package com.camping.duneinsolite.config;

import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.enums.Currency;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.currency")
public class CurrencyConfig {

    private double eurRate = 3.4;

    private double usdRate = 2.5;


    public double rateFor(Currency currency) {
        return switch (currency) {
            case EUR -> eurRate;
            case USD -> usdRate;
            case TND -> 1.0;
        };
    }

    public double effectiveRate(Reservation reservation) {
        return reservation.getExchangeRateApplied() != null
                ? reservation.getExchangeRateApplied()
                : rateFor(reservation.getCurrency());
    }
}
