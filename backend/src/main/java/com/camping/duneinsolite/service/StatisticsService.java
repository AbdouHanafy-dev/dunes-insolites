package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.statistics.*;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.StatisticsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.*;

/**
 * Admin dashboard aggregation. This is a <strong>display / reporting</strong> layer:
 * revenue figures are authoritative monetary values ({@link BigDecimal}, via {@link Money}),
 * but the percentage / growth ratios it derives are presentation-only and computed in
 * {@code double} on purpose — they never feed an invoice, a price or a payment.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatisticsService {

    private static final List<String> MONTH_LABELS =
            List.of("Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
                    "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc");

    private final StatisticsRepository statisticsRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────

    public DashboardStatsDTO getDashboardStats(int period) {

        LocalDateTime now         = LocalDateTime.now();
        LocalDateTime periodStart = now.minusDays(period);
        LocalDateTime prevStart   = periodStart.minusDays(period);

        BigDecimal currentRevenue  = Money.nz(statisticsRepository.getTotalRevenue(periodStart, now));
        BigDecimal previousRevenue = Money.nz(statisticsRepository.getTotalRevenue(prevStart, periodStart));
        double revenueGrowth       = calculateGrowthPercentage(previousRevenue.doubleValue(), currentRevenue.doubleValue());

        List<Object[]> statusRows = statisticsRepository.getReservationCountByStatus(periodStart, now);

        long totalReservations = 0L, confirmed = 0L, pending = 0L, cancelled = 0L;
        for (Object[] row : statusRows) {
            ReservationStatus status = (ReservationStatus) row[0];
            long count = (Long) row[1];
            totalReservations += count;
            switch (status) {
                case CONFIRMED, CHECKED_IN, COMPLETED -> confirmed += count;
                case PENDING                          -> pending   += count;
                case CANCELLED, REJECTED              -> cancelled += count;
                default -> { }
            }
        }

        long prevTotalReservations = statisticsRepository.getTotalReservations(prevStart, periodStart);
        double reservationGrowth = calculateGrowthPercentage(prevTotalReservations, totalReservations);

        BigDecimal directRevenue = Money.nz(statisticsRepository.getDirectPassengerRevenue(periodStart, now));
        long directCount = statisticsRepository.getDirectPassengerReservationCount(periodStart, now);

        double directPercentage = Money.isPositive(currentRevenue)
                ? round2(directRevenue.doubleValue() / currentRevenue.doubleValue() * 100)
                : 0.0;

        return DashboardStatsDTO.builder()
                .totalRevenue(Money.round(currentRevenue))
                .revenueGrowth(BigDecimal.valueOf(round2(revenueGrowth)))
                .totalReservations(totalReservations)
                .confirmedReservations(confirmed)
                .pendingReservations(pending)
                .cancelledReservations(cancelled)
                .reservationGrowth(round2(reservationGrowth))
                .passengerDirectRevenue(Money.round(directRevenue))
                .passengerDirectCount(directCount)
                .passengerRevenuePercentage(BigDecimal.valueOf(directPercentage))
                .period(period)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. MONTHLY TREND
    // ─────────────────────────────────────────────────────────────────────────

    public MonthlyTrendDTO getMonthlyTrend() {

        int currentYear = Year.now().getValue();

        Map<Integer, BigDecimal> revenueByMonth = toMoneyMap(
                statisticsRepository.getMonthlyRevenueTrend(currentYear));
        Map<Integer, Long> reservationsByMonth = toLongMap(
                statisticsRepository.getMonthlyReservationCount(currentYear));

        List<Double> revenueList      = new ArrayList<>();
        List<Long>   reservationsList = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            revenueList.add(Money.round(revenueByMonth.getOrDefault(m, BigDecimal.ZERO)).doubleValue());
            reservationsList.add(reservationsByMonth.getOrDefault(m, 0L));
        }

        return MonthlyTrendDTO.builder()
                .labels(MONTH_LABELS)
                .revenue(revenueList)
                .reservations(reservationsList)
                .year(currentYear)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. PARTNER REVENUE
    // ─────────────────────────────────────────────────────────────────────────

    public PartnerRevenueDTO getPartnerRevenue(int period) {

        LocalDateTime now         = LocalDateTime.now();
        LocalDateTime periodStart = now.minusDays(period);

        List<Object[]> rows = statisticsRepository.getRevenueByPartner(periodStart, now);

        BigDecimal totalPartnerRevenue = Money.sum(
                rows.stream().map(r -> toMoney(r[1])).toList());
        BigDecimal grandTotal = Money.nz(statisticsRepository.getTotalRevenue(periodStart, now));

        List<PartnerRevenueDTO.PartnerEntryDTO> partners = new ArrayList<>();
        for (Object[] row : rows) {
            String partnerName = (String) row[0];
            BigDecimal revenue = toMoney(row[1]);
            double pct = Money.isPositive(totalPartnerRevenue)
                    ? round2(revenue.doubleValue() / totalPartnerRevenue.doubleValue() * 100)
                    : 0.0;
            partners.add(PartnerRevenueDTO.PartnerEntryDTO.builder()
                    .name(partnerName)
                    .revenue(Money.round(revenue))
                    .percentage(pct)
                    .build());
        }

        double partnerGlobalPct = Money.isPositive(grandTotal)
                ? round2(totalPartnerRevenue.doubleValue() / grandTotal.doubleValue() * 100)
                : 0.0;

        return PartnerRevenueDTO.builder()
                .partners(partners)
                .totalPartnerRevenue(Money.round(totalPartnerRevenue))
                .partnerRevenuePercentage(BigDecimal.valueOf(partnerGlobalPct))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. SOURCE DISTRIBUTION
    // ─────────────────────────────────────────────────────────────────────────

    public SourceStatsDTO getSourceStats(int period) {

        LocalDateTime now         = LocalDateTime.now();
        LocalDateTime periodStart = now.minusDays(period);

        List<Object[]> rows = statisticsRepository.getReservationsBySource(periodStart, now);

        long totalReservations = rows.stream()
                .mapToLong(r -> ((Number) r[1]).longValue())
                .sum();

        List<SourceStatsDTO.SourceEntryDTO> sources = new ArrayList<>();
        for (Object[] row : rows) {
            String sourceName = (String) row[0];
            long   count      = ((Number) row[1]).longValue();
            double pct = totalReservations > 0
                    ? round2((double) count / totalReservations * 100)
                    : 0.0;
            sources.add(SourceStatsDTO.SourceEntryDTO.builder()
                    .source(sourceName)
                    .count(count)
                    .percentage(pct)
                    .build());
        }

        return SourceStatsDTO.builder()
                .sources(sources)
                .totalReservations(totalReservations)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. REVENUE DISTRIBUTION
    // ─────────────────────────────────────────────────────────────────────────

    public RevenueDistributionDTO getRevenueDistribution(int period) {

        LocalDateTime now         = LocalDateTime.now();
        LocalDateTime periodStart = now.minusDays(period);

        BigDecimal directRevenue  = Money.nz(statisticsRepository.getDirectPassengerRevenue(periodStart, now));
        BigDecimal grandTotal     = Money.nz(statisticsRepository.getTotalRevenue(periodStart, now));
        BigDecimal partnerRevenue = Money.subtract(grandTotal, directRevenue);

        double partnerPct = Money.isPositive(grandTotal)
                ? round2(partnerRevenue.doubleValue() / grandTotal.doubleValue() * 100) : 0.0;
        double directPct = Money.isPositive(grandTotal)
                ? round2(directRevenue.doubleValue() / grandTotal.doubleValue() * 100) : 0.0;

        return RevenueDistributionDTO.builder()
                .partnerRevenue(Money.round(partnerRevenue))
                .directRevenue(Money.round(directRevenue))
                .partnerPercentage(partnerPct)
                .directPercentage(directPct)
                .totalRevenue(Money.round(grandTotal))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. PASSENGER TREND
    // ─────────────────────────────────────────────────────────────────────────

    public PassengerTrendDTO getPassengerTrend() {

        int currentYear = Year.now().getValue();

        Map<Integer, BigDecimal> revenueByMonth = toMoneyMap(
                statisticsRepository.getMonthlyPassengerRevenueTrend(currentYear));
        Map<Integer, Long> reservationsByMonth = toLongMap(
                statisticsRepository.getMonthlyPassengerReservationCount(currentYear));

        List<Double> revenueList      = new ArrayList<>();
        List<Long>   reservationsList = new ArrayList<>();
        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalCount = 0L;
        for (int m = 1; m <= 12; m++) {
            BigDecimal monthRevenue = Money.round(revenueByMonth.getOrDefault(m, BigDecimal.ZERO));
            long monthCount = reservationsByMonth.getOrDefault(m, 0L);
            revenueList.add(monthRevenue.doubleValue());
            reservationsList.add(monthCount);
            totalRevenue = Money.add(totalRevenue, monthRevenue);
            totalCount += monthCount;
        }

        return PassengerTrendDTO.builder()
                .labels(MONTH_LABELS)
                .revenue(revenueList)
                .reservations(reservationsList)
                .totalRevenue(Money.round(totalRevenue))
                .totalCount(totalCount)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /** Presentation-only growth ratio. Not a monetary value. */
    private double calculateGrowthPercentage(double previous, double current) {
        if (previous == 0) return current > 0 ? 100.0 : 0.0;
        return (current - previous) / previous * 100;
    }

    private BigDecimal toMoney(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        return new BigDecimal(value.toString());
    }

    private Map<Integer, BigDecimal> toMoneyMap(List<Object[]> rows) {
        Map<Integer, BigDecimal> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put(((Number) row[0]).intValue(), toMoney(row[1]));
        }
        return map;
    }

    private Map<Integer, Long> toLongMap(List<Object[]> rows) {
        Map<Integer, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
        }
        return map;
    }

    /** Presentation-only rounding for percentage / ratio display. */
    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
