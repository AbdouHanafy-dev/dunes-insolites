package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PricingRuleRepository extends JpaRepository<PricingRule, UUID> {

    List<PricingRule> findByAccommodationType_IdOrderByStartDateAsc(UUID accommodationTypeId);
    List<PricingRule> findByExtra_ExtraIdOrderByStartDateAsc(UUID extraId);

    /** Every active rule covering one date, for one tier — at most one DATE and one PERIOD rule by construction. */
    @Query("""
        SELECT r FROM PricingRule r
        WHERE r.accommodationType.id = :accommodationTypeId
          AND r.active = true
          AND r.startDate <= :date AND r.endDate >= :date
    """)
    List<PricingRule> findActiveCovering(@Param("accommodationTypeId") UUID accommodationTypeId,
                                         @Param("date") LocalDate date);

    @Query("""
        SELECT r FROM PricingRule r
        WHERE r.extra.extraId = :extraId AND r.active = true
          AND r.startDate <= :date AND r.endDate >= :date
        ORDER BY CASE WHEN r.ruleType = 'DATE' THEN 0 ELSE 1 END, r.startDate DESC
        """)
    List<PricingRule> findActiveCoveringExtra(@Param("extraId") UUID extraId,
                                              @Param("date") LocalDate date);

    /**
     * Other active rules of the same type on the same tier whose range
     * overlaps [startDate, endDate] — used to reject ambiguous overlapping
     * rules at creation/update time, excluding the rule being edited.
     */
    @Query("""
        SELECT r FROM PricingRule r
        WHERE r.accommodationType.id = :accommodationTypeId
          AND r.ruleType = :ruleType
          AND r.active = true
          AND r.id <> :excludeId
          AND r.startDate <= :endDate AND r.endDate >= :startDate
    """)
    List<PricingRule> findOverlapping(@Param("accommodationTypeId") UUID accommodationTypeId,
                                       @Param("ruleType") com.camping.duneinsolite.model.enums.PricingRuleType ruleType,
                                       @Param("startDate") LocalDate startDate,
                                       @Param("endDate") LocalDate endDate,
                                       @Param("excludeId") UUID excludeId);

    @Query("""
        SELECT r FROM PricingRule r
        WHERE r.extra.extraId = :extraId AND r.ruleType = :ruleType AND r.active = true
          AND r.id <> :excludeId
          AND r.startDate <= :endDate AND r.endDate >= :startDate
    """)
    List<PricingRule> findOverlappingExtra(@Param("extraId") UUID extraId,
            @Param("ruleType") com.camping.duneinsolite.model.enums.PricingRuleType ruleType,
            @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate,
            @Param("excludeId") UUID excludeId);
}
