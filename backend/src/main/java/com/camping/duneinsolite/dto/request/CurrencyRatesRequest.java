package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/** Three amounts that are worth the same, e.g. 10 EUR = 13.6 USD = 34 TND. */
@Data
public class CurrencyRatesRequest {

    @NotNull(message = "The euro amount is required")
    @DecimalMin(value = "0.0001", message = "The euro amount must be greater than 0")
    @Digits(integer = 11, fraction = 4, message = "The euro amount can have at most 4 decimals")
    private BigDecimal eurAmount;

    @NotNull(message = "The dollar amount is required")
    @DecimalMin(value = "0.0001", message = "The dollar amount must be greater than 0")
    @Digits(integer = 11, fraction = 4, message = "The dollar amount can have at most 4 decimals")
    private BigDecimal usdAmount;

    @NotNull(message = "The dinar amount is required")
    @DecimalMin(value = "0.0001", message = "The dinar amount must be greater than 0")
    @Digits(integer = 11, fraction = 4, message = "The dinar amount can have at most 4 decimals")
    private BigDecimal tndAmount;
}
