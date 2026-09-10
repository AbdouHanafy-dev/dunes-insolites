package com.camping.duneinsolite.dto.statistics;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardStatsDTO {

    // Revenue KPIs
    private java.math.BigDecimal totalRevenue;
    private java.math.BigDecimal revenueGrowth;          // % vs previous period

    // Reservation KPIs
    private Long totalReservations;
    private Long confirmedReservations;
    private Long pendingReservations;
    private Long cancelledReservations;
    private Double reservationGrowth;      // % vs previous period

    // Direct passengers block
    private java.math.BigDecimal passengerDirectRevenue;
    private Long   passengerDirectCount;
    private java.math.BigDecimal passengerRevenuePercentage;

    // Period used for the query (30 or 90 days)
    private Integer period;
}
