package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.PricingRuleType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class InventoryRuleRequest {
    @NotNull private PricingRuleType ruleType;
    @NotNull private LocalDate startDate;
    @NotNull private LocalDate endDate;
    @NotNull @Min(0) private Integer maxUnits;
    @Size(max = 500) private String note;
    private Boolean active;
}
