package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.InventoryRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;
import java.time.LocalDate;
import java.util.UUID;

public record InventoryRuleResponse(UUID id, UUID accommodationTypeId, UUID extraId,
        PricingRuleType ruleType, LocalDate startDate, LocalDate endDate,
        Integer maxUnits, String note, boolean active) {
    public static InventoryRuleResponse from(InventoryRule rule) {
        return new InventoryRuleResponse(rule.getId(),
                rule.getAccommodationType() == null ? null : rule.getAccommodationType().getId(),
                rule.getExtra() == null ? null : rule.getExtra().getExtraId(),
                rule.getRuleType(), rule.getStartDate(), rule.getEndDate(),
                rule.getMaxUnits(), rule.getNote(), rule.isActive());
    }
}
