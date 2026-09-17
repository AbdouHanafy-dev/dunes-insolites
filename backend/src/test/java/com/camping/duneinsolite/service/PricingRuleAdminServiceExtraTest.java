package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.PricingRuleRequest;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.PricingRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.PricingRuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * createExtra/listExtra went straight through PricingRuleResponse.from(),
 * which called getAccommodationType().getId() unconditionally - a real E2E
 * pass through the admin UI's "Guides & transport" pricing panel hit this
 * every time (extra-scoped rules never have an accommodationType). No test
 * had ever exercised this path since it was added.
 */
class PricingRuleAdminServiceExtraTest {

    private PricingRuleRepository repository;
    private ExtraRepository extraRepository;
    private PricingRuleAdminService service;

    @BeforeEach
    void setUp() {
        repository = mock(PricingRuleRepository.class);
        extraRepository = mock(ExtraRepository.class);
        service = new PricingRuleAdminService(repository, mock(AccommodationTypeRepository.class), extraRepository);
    }

    private PricingRuleRequest request() {
        PricingRuleRequest req = new PricingRuleRequest();
        req.setRuleType(PricingRuleType.DATE);
        req.setStartDate(LocalDate.of(2026, 11, 15));
        req.setEndDate(LocalDate.of(2026, 11, 15));
        req.setPriceTtc(new BigDecimal("220"));
        return req;
    }

    @Test
    void createExtra_doesNotThrow_andReportsExtraIdNotAccommodationTypeId() {
        UUID extraId = UUID.randomUUID();
        Extra extra = Extra.builder().extraId(extraId).slug("guide-with-vehicle").name("Guide").build();
        when(extraRepository.findById(extraId)).thenReturn(Optional.of(extra));
        when(repository.findOverlappingExtra(any(), any(), any(), any(), any())).thenReturn(List.of());
        when(repository.save(any(PricingRule.class))).thenAnswer(inv -> {
            PricingRule r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        var response = service.createExtra(extraId, request());
        assertThat(response.extraId()).isEqualTo(extraId);
        assertThat(response.accommodationTypeId()).isNull();
    }

    @Test
    void listExtra_doesNotThrow_forRulesWithNoAccommodationType() {
        UUID extraId = UUID.randomUUID();
        Extra extra = Extra.builder().extraId(extraId).slug("guide-with-vehicle").name("Guide").build();
        PricingRule rule = PricingRule.builder().id(UUID.randomUUID()).extra(extra)
                .ruleType(PricingRuleType.DATE).startDate(LocalDate.of(2026, 11, 15))
                .endDate(LocalDate.of(2026, 11, 15)).priceTtc(new BigDecimal("220")).active(true).build();
        when(repository.findByExtra_ExtraIdOrderByStartDateAsc(extraId)).thenReturn(List.of(rule));

        var result = service.listExtra(extraId);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).extraId()).isEqualTo(extraId);
        assertThat(result.get(0).accommodationTypeId()).isNull();
    }
}
