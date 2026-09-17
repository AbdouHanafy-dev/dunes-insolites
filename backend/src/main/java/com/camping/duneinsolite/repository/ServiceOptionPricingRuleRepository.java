package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ServiceOptionPricingRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ServiceOptionPricingRuleRepository extends JpaRepository<ServiceOptionPricingRule, UUID> {

    List<ServiceOptionPricingRule> findByServiceOption_IdOrderByStartDateAsc(UUID serviceOptionId);

    @Query("""
        SELECT r FROM ServiceOptionPricingRule r
        WHERE r.serviceOption.id = :serviceOptionId
          AND r.active = true
          AND r.startDate <= :date AND r.endDate >= :date
    """)
    List<ServiceOptionPricingRule> findActiveCovering(@Param("serviceOptionId") UUID serviceOptionId,
                                                        @Param("date") LocalDate date);

    @Query("""
        SELECT r FROM ServiceOptionPricingRule r
        WHERE r.serviceOption.id = :serviceOptionId
          AND r.ruleType = :ruleType
          AND r.active = true
          AND r.id <> :excludeId
          AND r.startDate <= :endDate AND r.endDate >= :startDate
    """)
    List<ServiceOptionPricingRule> findOverlapping(@Param("serviceOptionId") UUID serviceOptionId,
                                                     @Param("ruleType") PricingRuleType ruleType,
                                                     @Param("startDate") LocalDate startDate,
                                                     @Param("endDate") LocalDate endDate,
                                                     @Param("excludeId") UUID excludeId);
}
