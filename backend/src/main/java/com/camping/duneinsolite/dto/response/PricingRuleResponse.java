package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.PricingRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PricingRuleResponse(
        UUID id,
        UUID accommodationTypeId,
        PricingRuleType ruleType,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal priceTtc,
        boolean active
) {
    public static PricingRuleResponse from(PricingRule r) {
        return new PricingRuleResponse(
                r.getId(),
                r.getAccommodationType().getId(),
                r.getRuleType(),
                r.getStartDate(),
                r.getEndDate(),
                r.getPriceTtc(),
                r.isActive());
    }
}
