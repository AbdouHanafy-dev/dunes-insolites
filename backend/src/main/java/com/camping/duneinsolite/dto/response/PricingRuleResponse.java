package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.PricingRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PricingRuleResponse(
        UUID id,
        UUID accommodationTypeId,
        UUID extraId,
        PricingRuleType ruleType,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal priceTtc,
        boolean active
) {
    // Polymorphic since Extra pricing rules were folded into this table
    // (pricing_rule_single_target_check: exactly one of the two is set).
    public static PricingRuleResponse from(PricingRule r) {
        return new PricingRuleResponse(
                r.getId(),
                r.getAccommodationType() != null ? r.getAccommodationType().getId() : null,
                r.getExtra() != null ? r.getExtra().getExtraId() : null,
                r.getRuleType(),
                r.getStartDate(),
                r.getEndDate(),
                r.getPriceTtc(),
                r.isActive());
    }
}
