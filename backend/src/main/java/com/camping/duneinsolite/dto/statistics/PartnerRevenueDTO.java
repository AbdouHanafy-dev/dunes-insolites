package com.camping.duneinsolite.dto.statistics;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PartnerRevenueDTO {

    private List<PartnerEntryDTO> partners;
    private java.math.BigDecimal                totalPartnerRevenue;
    private java.math.BigDecimal                partnerRevenuePercentage; // % of grand total

    @Data
    @Builder
    public static class PartnerEntryDTO {
        private String name;
        private java.math.BigDecimal revenue;
        private Double percentage; // % of total partner revenue
    }
}
