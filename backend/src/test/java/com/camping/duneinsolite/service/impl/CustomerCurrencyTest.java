package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.config.CurrencyConfig;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.enums.Currency;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class CustomerCurrencyTest {

    // Built-in rates: 3.4 TND per EUR, 2.5 TND per USD, so 100 EUR = 340 TND = 136 USD.
    private final CustomerCurrency converter = new CustomerCurrency(new CurrencyConfig());

    private static Reservation booked(Currency display) {
        return Reservation.builder().currency(Currency.EUR).displayCurrency(display).build();
    }

    @Test
    void followsTheBookingCurrencyWhenTheGuestChoseNone() {
        Reservation r = booked(null);
        assertThat(converter.of(r)).isEqualTo(Currency.EUR);
        assertThat(converter.convert(r, new BigDecimal("100.000"))).isEqualByComparingTo("100");
    }

    @Test
    void showsDinarsAndDollarsFromTheEuroAmount() {
        assertThat(converter.convert(booked(Currency.TND), new BigDecimal("100.000"))).isEqualByComparingTo("340");
        assertThat(converter.convert(booked(Currency.USD), new BigDecimal("100.000"))).isEqualByComparingTo("136");
    }

    @Test
    void leavesAMissingAmountAlone() {
        assertThat(converter.convert(booked(Currency.TND), null)).isNull();
    }
}
