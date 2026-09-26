package com.camping.duneinsolite.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * @param usdPerEur how many dollars one euro is worth (usdAmount / eurAmount)
 * @param tndPerEur how many dinars one euro is worth
 */
public record CurrencyRatesResponse(
        BigDecimal eurAmount,
        BigDecimal usdAmount,
        BigDecimal tndAmount,
        BigDecimal usdPerEur,
        BigDecimal tndPerEur,
        LocalDateTime updatedAt) {
}
