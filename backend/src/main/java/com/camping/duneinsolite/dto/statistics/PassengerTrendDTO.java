package com.camping.duneinsolite.dto.statistics;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PassengerTrendDTO {

    private List<String> labels;       // ["Jan", "Fév", ...]
    private List<Double> revenue;
    private List<Long>   reservations;
    private java.math.BigDecimal       totalRevenue;
    private Long         totalCount;
}