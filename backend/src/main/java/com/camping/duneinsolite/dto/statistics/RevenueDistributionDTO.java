package com.camping.duneinsolite.dto.statistics;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RevenueDistributionDTO {

    private java.math.BigDecimal partnerRevenue;
    private java.math.BigDecimal directRevenue;
    private Double partnerPercentage;
    private Double directPercentage;
    private java.math.BigDecimal totalRevenue;
}