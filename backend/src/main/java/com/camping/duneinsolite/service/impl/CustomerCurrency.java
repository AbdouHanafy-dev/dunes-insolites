package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.config.CurrencyConfig;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.enums.Currency;
import com.camping.duneinsolite.money.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Shows a reservation's amounts in the currency the guest booked in (EUR, USD or TND), for the
 * guest's own e-mails only. It never changes what is stored, charged or invoiced: the booking stays
 * in its own currency and the staff see that one. Uses the rates set in the back office.
 */
@Component
@RequiredArgsConstructor
public class CustomerCurrency {

    private final CurrencyConfig currencyConfig;

    /** The currency the guest's mails are written in: what they chose, else the booking's own. */
    public Currency of(Reservation reservation) {
        if (reservation.getDisplayCurrency() != null) return reservation.getDisplayCurrency();
        return reservation.getCurrency() != null ? reservation.getCurrency() : CurrencyConfig.BASE;
    }

    /** An amount held in the reservation's currency, expressed in {@link #of}. */
    public BigDecimal convert(Reservation reservation, BigDecimal amount) {
        return convert(amount, reservation.getCurrency(), of(reservation));
    }

    public BigDecimal convert(BigDecimal amount, Currency from, Currency to) {
        if (amount == null) return null;
        Currency source = from != null ? from : CurrencyConfig.BASE;
        if (source == to) return amount;
        BigDecimal inBase = Money.multiply(amount, currencyConfig.rateFor(source));
        return Money.divide(inBase, currencyConfig.rateFor(to));
    }
}
