package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.CurrencyRatesRequest;
import com.camping.duneinsolite.dto.response.CurrencyRatesResponse;

public interface CurrencyRatesService {

    CurrencyRatesResponse get();

    /** Saves the rates and makes them apply at once, everywhere prices are converted. */
    CurrencyRatesResponse update(CurrencyRatesRequest request);
}
