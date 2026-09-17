package com.camping.duneinsolite.service;

import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.PricingRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;
import com.camping.duneinsolite.repository.PricingRuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ExtraPricingServiceTest {
    private PricingRuleRepository repository;
    private ExtraPricingService service;
    private final UUID extraId = UUID.randomUUID();
    private final LocalDate date = LocalDate.of(2026, 10, 15);
    private Extra extra;

    @BeforeEach
    void setUp() {
        repository = mock(PricingRuleRepository.class);
        service = new ExtraPricingService(repository);
        extra = Extra.builder().extraId(extraId).name("Guide").unitPrice(new BigDecimal("100.000")).build();
        when(repository.findActiveCoveringExtra(extraId, date)).thenReturn(List.of());
    }

    private PricingRule rule(PricingRuleType type, String price) {
        return PricingRule.builder().ruleType(type).priceTtc(new BigDecimal(price)).build();
    }

    @Test
    void cataloguePriceIsTheFallback() {
        assertThat(service.unitPrice(extra, date)).isEqualByComparingTo("100.000");
    }

    @Test
    void periodRuleOverridesCataloguePrice() {
        when(repository.findActiveCoveringExtra(extraId, date))
                .thenReturn(List.of(rule(PricingRuleType.PERIOD, "130.000")));
        assertThat(service.unitPrice(extra, date)).isEqualByComparingTo("130.000");
    }

    @Test
    void dateRuleWinsOverPeriodRuleRegardlessOfRepositoryOrder() {
        when(repository.findActiveCoveringExtra(extraId, date)).thenReturn(List.of(
                rule(PricingRuleType.PERIOD, "130.000"), rule(PricingRuleType.DATE, "175.000")));
        assertThat(service.unitPrice(extra, date)).isEqualByComparingTo("175.000");
    }

    @Test
    void nullDateUsesCataloguePriceWithoutQueryingRules() {
        assertThat(service.unitPrice(extra, null)).isEqualByComparingTo("100.000");
    }
}
