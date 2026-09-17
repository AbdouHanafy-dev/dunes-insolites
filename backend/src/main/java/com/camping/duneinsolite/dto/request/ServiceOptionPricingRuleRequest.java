package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.PricingRuleType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ServiceOptionPricingRuleRequest {

    @NotNull(message = "Rule type is required")
    private PricingRuleType ruleType;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", message = "Price cannot be negative")
    private BigDecimal priceTtc;

    private Boolean active;
}
