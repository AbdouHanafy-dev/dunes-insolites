package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.config.CurrencyConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/currency")
@RequiredArgsConstructor
public class CurrencyController {

    private final CurrencyConfig currencyConfig;

    // Current live rates — public (not sensitive), fetched by the frontend
    // unconditionally at app boot, before login has necessarily happened, so it
    // can preview a conversion before a reservation has locked in its own rate.
    @GetMapping("/rates")
    public ResponseEntity<Map<String, java.math.BigDecimal>> getRates() {
        return ResponseEntity.ok(Map.of(
                "TND", java.math.BigDecimal.ONE,
                "EUR", currencyConfig.getEurRate(),
                "USD", currencyConfig.getUsdRate()
        ));
    }
}
