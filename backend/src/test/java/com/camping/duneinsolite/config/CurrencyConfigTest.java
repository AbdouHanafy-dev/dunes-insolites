package com.camping.duneinsolite.config;

import com.camping.duneinsolite.model.enums.Currency;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CurrencyConfigTest {

    private static BigDecimal r(BigDecimal v) {
        return v.setScale(6, java.math.RoundingMode.HALF_EVEN);
    }

    @Test
    void withoutBackOfficeRatesTheBuiltInOnesApply() {
        CurrencyConfig config = new CurrencyConfig();

        assertThat(config.rateFor(Currency.EUR)).isEqualByComparingTo("1");
        assertThat(r(config.rateFor(Currency.TND))).isEqualByComparingTo("0.294118");
        assertThat(r(config.rateFor(Currency.USD))).isEqualByComparingTo("0.735294");
    }

    @Test
    void anEquivalenceSetInTheBackOfficeDrivesEveryConversion() {
        CurrencyRatesStore store = mock(CurrencyRatesStore.class);
        when(store.current()).thenReturn(Optional.of(new CurrencyRatesStore.Amounts(
                new BigDecimal("10"), new BigDecimal("12"), new BigDecimal("30"))));
        CurrencyConfig config = new CurrencyConfig();
        ReflectionTestUtils.setField(config, "ratesStore", store);

        // 10 EUR = 12 USD = 30 TND -> one dollar is worth 10/12 euro, one dinar 10/30 euro.
        assertThat(config.rateFor(Currency.EUR)).isEqualByComparingTo("1");
        assertThat(r(config.rateFor(Currency.USD))).isEqualByComparingTo("0.833333");
        assertThat(r(config.rateFor(Currency.TND))).isEqualByComparingTo("0.333333");
    }

    @Test
    void theDefaultsStoredInTheDatabaseGiveTheSameRatesAsTheBuiltInOnes() {
        CurrencyRatesStore store = mock(CurrencyRatesStore.class);
        when(store.current()).thenReturn(Optional.of(new CurrencyRatesStore.Amounts(
                new BigDecimal("10"), new BigDecimal("13.6"), new BigDecimal("34"))));
        CurrencyConfig live = new CurrencyConfig();
        ReflectionTestUtils.setField(live, "ratesStore", store);
        CurrencyConfig builtIn = new CurrencyConfig();

        for (Currency c : Currency.values()) {
            assertThat(r(live.rateFor(c))).isEqualByComparingTo(r(builtIn.rateFor(c)));
        }
    }

    @Test
    void whenTheStoreHasNothingTheBuiltInRatesStillApply() {
        CurrencyRatesStore store = mock(CurrencyRatesStore.class);
        when(store.current()).thenReturn(Optional.empty());
        CurrencyConfig config = new CurrencyConfig();
        ReflectionTestUtils.setField(config, "ratesStore", store);

        assertThat(r(config.rateFor(Currency.TND))).isEqualByComparingTo("0.294118");
    }
}
