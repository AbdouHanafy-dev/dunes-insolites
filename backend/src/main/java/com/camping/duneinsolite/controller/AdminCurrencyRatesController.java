package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.CurrencyRatesRequest;
import com.camping.duneinsolite.dto.response.CurrencyRatesResponse;
import com.camping.duneinsolite.service.CurrencyRatesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The owner's exchange rates ("10 EUR = 13.6 USD = 34 TND"). Read side for visitors is
 * GET /api/currency/rates, which derives from these. ADMIN only, declared here and by the
 * /api/admin/** rule: the rates drive how payments and invoices are converted.
 */
@RestController
@RequestMapping("/api/admin/currency-rates")
@RequiredArgsConstructor
public class AdminCurrencyRatesController {

    private final CurrencyRatesService currencyRatesService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CurrencyRatesResponse> get() {
        return ResponseEntity.ok(currencyRatesService.get());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CurrencyRatesResponse> update(@Valid @RequestBody CurrencyRatesRequest request) {
        return ResponseEntity.ok(currencyRatesService.update(request));
    }
}
