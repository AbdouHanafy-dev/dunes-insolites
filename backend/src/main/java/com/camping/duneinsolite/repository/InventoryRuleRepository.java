package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.InventoryRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface InventoryRuleRepository extends JpaRepository<InventoryRule, UUID> {
    List<InventoryRule> findByAccommodationType_IdOrderByStartDateAsc(UUID id);
    List<InventoryRule> findByExtra_ExtraIdOrderByStartDateAsc(UUID id);

    @Query("""
        select r from InventoryRule r where r.accommodationType.id = :id and r.active = true
        and r.startDate <= :date and r.endDate >= :date
        order by case when r.ruleType = 'DATE' then 0 else 1 end, r.startDate desc
        """)
    List<InventoryRule> findCoveringAccommodation(@Param("id") UUID id, @Param("date") LocalDate date);

    @Query("""
        select r from InventoryRule r where r.extra.extraId = :id and r.active = true
        and r.startDate <= :date and r.endDate >= :date
        order by case when r.ruleType = 'DATE' then 0 else 1 end, r.startDate desc
        """)
    List<InventoryRule> findCoveringExtra(@Param("id") UUID id, @Param("date") LocalDate date);

    @Query("""
        select r from InventoryRule r where r.accommodationType.id = :id and r.ruleType = :type
        and r.active = true and r.id <> :exclude and r.startDate <= :end and r.endDate >= :start
        """)
    List<InventoryRule> findOverlappingAccommodation(@Param("id") UUID id, @Param("type") PricingRuleType type,
            @Param("start") LocalDate start, @Param("end") LocalDate end, @Param("exclude") UUID exclude);

    @Query("""
        select r from InventoryRule r where r.extra.extraId = :id and r.ruleType = :type
        and r.active = true and r.id <> :exclude and r.startDate <= :end and r.endDate >= :start
        """)
    List<InventoryRule> findOverlappingExtra(@Param("id") UUID id, @Param("type") PricingRuleType type,
            @Param("start") LocalDate start, @Param("end") LocalDate end, @Param("exclude") UUID exclude);
}
