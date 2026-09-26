package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.config.CurrencyRatesStore;
import com.camping.duneinsolite.dto.request.CurrencyRatesRequest;
import com.camping.duneinsolite.dto.response.CurrencyRatesResponse;
import com.camping.duneinsolite.model.CurrencyRates;
import com.camping.duneinsolite.repository.CurrencyRatesRepository;
import com.camping.duneinsolite.service.CurrencyRatesService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class CurrencyRatesServiceImpl implements CurrencyRatesService {

    private final CurrencyRatesRepository repository;
    private final CurrencyRatesStore store;

    @Override
    @Transactional(readOnly = true)
    public CurrencyRatesResponse get() {
        return toResponse(repository.findById(CurrencyRates.SINGLETON_ID).orElseGet(CurrencyRatesServiceImpl::defaults));
    }

    @Override
    @Transactional
    public CurrencyRatesResponse update(CurrencyRatesRequest request) {
        CurrencyRates rates = repository.findById(CurrencyRates.SINGLETON_ID).orElseGet(CurrencyRatesServiceImpl::defaults);
        rates.setEurAmount(request.getEurAmount());
        rates.setUsdAmount(request.getUsdAmount());
        rates.setTndAmount(request.getTndAmount());
        CurrencyRates saved = repository.save(rates);
        store.invalidate();
        return toResponse(saved);
    }

    private static CurrencyRates defaults() {
        return CurrencyRates.builder().id(CurrencyRates.SINGLETON_ID)
                .eurAmount(new BigDecimal("10")).usdAmount(new BigDecimal("13.6")).tndAmount(new BigDecimal("34")).build();
    }

    static CurrencyRatesResponse toResponse(CurrencyRates r) {
        return new CurrencyRatesResponse(r.getEurAmount(), r.getUsdAmount(), r.getTndAmount(),
                r.getUsdAmount().divide(r.getEurAmount(), 6, RoundingMode.HALF_EVEN),
                r.getTndAmount().divide(r.getEurAmount(), 6, RoundingMode.HALF_EVEN),
                r.getUpdatedAt());
    }
}
