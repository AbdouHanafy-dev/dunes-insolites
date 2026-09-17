package com.camping.duneinsolite.service;

import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.PricingRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.PricingRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Extra pricing through the same DATE > PERIOD > catalogue rule hierarchy. */
@Service
@RequiredArgsConstructor
public class ExtraPricingService {
    private final PricingRuleRepository pricingRuleRepository;

    @Transactional(readOnly = true)
    public BigDecimal unitPrice(Extra extra, LocalDate date) {
        if (date == null) return Money.round(extra.getUnitPrice());
        List<PricingRule> covering = pricingRuleRepository.findActiveCoveringExtra(extra.getExtraId(), date);
        return Money.round(covering.stream()
                .filter(r -> r.getRuleType() == PricingRuleType.DATE)
                .findFirst()
                .or(() -> covering.stream()
                        .filter(r -> r.getRuleType() == PricingRuleType.PERIOD).findFirst())
                .map(PricingRule::getPriceTtc)
                .orElse(extra.getUnitPrice()));
    }
}
