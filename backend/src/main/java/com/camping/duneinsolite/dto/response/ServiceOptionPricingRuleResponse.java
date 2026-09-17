package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.ServiceOptionPricingRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ServiceOptionPricingRuleResponse(
        UUID id,
        UUID serviceOptionId,
        PricingRuleType ruleType,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal priceTtc,
        boolean active
) {
    public static ServiceOptionPricingRuleResponse from(ServiceOptionPricingRule r) {
        return new ServiceOptionPricingRuleResponse(
                r.getId(), r.getServiceOption().getId(), r.getRuleType(),
                r.getStartDate(), r.getEndDate(), r.getPriceTtc(), r.isActive());
    }
}
