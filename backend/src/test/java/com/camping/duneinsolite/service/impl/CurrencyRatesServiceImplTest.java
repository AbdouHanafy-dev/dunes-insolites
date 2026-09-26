package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.config.CurrencyRatesStore;
import com.camping.duneinsolite.dto.request.CurrencyRatesRequest;
import com.camping.duneinsolite.dto.response.CurrencyRatesResponse;
import com.camping.duneinsolite.model.CurrencyRates;
import com.camping.duneinsolite.repository.CurrencyRatesRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CurrencyRatesServiceImplTest {

    private final CurrencyRatesRepository repository = mock(CurrencyRatesRepository.class);
    private final CurrencyRatesStore store = mock(CurrencyRatesStore.class);
    private final CurrencyRatesServiceImpl service = new CurrencyRatesServiceImpl(repository, store);

    private static CurrencyRatesRequest request(String eur, String usd, String tnd) {
        CurrencyRatesRequest r = new CurrencyRatesRequest();
        r.setEurAmount(new BigDecimal(eur));
        r.setUsdAmount(new BigDecimal(usd));
        r.setTndAmount(new BigDecimal(tnd));
        return r;
    }

    @Test
    void savingTheRatesAppliesThemAtOnceAndReportsWhatOneEuroIsWorth() {
        when(repository.findById(CurrencyRates.SINGLETON_ID)).thenReturn(Optional.empty());
        when(repository.save(any(CurrencyRates.class))).thenAnswer(inv -> inv.getArgument(0));

        CurrencyRatesResponse response = service.update(request("10", "12", "30"));

        assertThat(response.usdPerEur()).isEqualByComparingTo("1.2");
        assertThat(response.tndPerEur()).isEqualByComparingTo("3");
        verify(store).invalidate();
    }

    @Test
    void withNothingStoredYetTheDefaultsAreShown() {
        when(repository.findById(CurrencyRates.SINGLETON_ID)).thenReturn(Optional.empty());

        CurrencyRatesResponse response = service.get();

        assertThat(response.eurAmount()).isEqualByComparingTo("10");
        assertThat(response.tndPerEur()).isEqualByComparingTo("3.4");
    }
}
