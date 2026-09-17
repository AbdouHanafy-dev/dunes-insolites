package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.PricingRuleRequest;
import com.camping.duneinsolite.dto.response.PricingRuleResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.PricingRule;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.PricingRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Never lets two active rules of the same type on the same tier overlap -
 * "ne jamais avoir plusieurs règles ambiguës qui pourraient produire un prix
 * incohérent" from the pricing brief. A DATE rule and a PERIOD rule may
 * still overlap each other by design (DATE wins, see
 * AccommodationPricingService); this only guards rules of the same type
 * against each other.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PricingRuleAdminService {

    private final PricingRuleRepository repository;
    private final AccommodationTypeRepository accommodationTypeRepository;

    private static final UUID NO_EXCLUSION = new UUID(0L, 0L);

    @Transactional(readOnly = true)
    public List<PricingRuleResponse> list(UUID accommodationTypeId) {
        return repository.findByAccommodationType_IdOrderByStartDateAsc(accommodationTypeId)
                .stream().map(PricingRuleResponse::from).toList();
    }

    public PricingRuleResponse create(UUID accommodationTypeId, PricingRuleRequest req) {
        AccommodationType acc = accommodationTypeRepository.findById(accommodationTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation not found: " + accommodationTypeId));
        validate(req);
        rejectOverlap(accommodationTypeId, req, NO_EXCLUSION);
        PricingRule rule = PricingRule.builder()
                .accommodationType(acc)
                .ruleType(req.getRuleType())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .priceTtc(Money.round(req.getPriceTtc()))
                .active(req.getActive() == null || req.getActive())
                .build();
        return PricingRuleResponse.from(repository.save(rule));
    }

    public PricingRuleResponse update(UUID accommodationTypeId, UUID ruleId, PricingRuleRequest req) {
        PricingRule rule = find(accommodationTypeId, ruleId);
        validate(req);
        rejectOverlap(accommodationTypeId, req, ruleId);
        rule.setRuleType(req.getRuleType());
        rule.setStartDate(req.getStartDate());
        rule.setEndDate(req.getEndDate());
        rule.setPriceTtc(Money.round(req.getPriceTtc()));
        if (req.getActive() != null) rule.setActive(req.getActive());
        return PricingRuleResponse.from(rule);
    }

    public void delete(UUID accommodationTypeId, UUID ruleId) {
        repository.delete(find(accommodationTypeId, ruleId));
    }

    private void validate(PricingRuleRequest req) {
        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be before start date.");
        }
    }

    private void rejectOverlap(UUID accommodationTypeId, PricingRuleRequest req, UUID excludeId) {
        boolean active = req.getActive() == null || req.getActive();
        if (!active) return;
        List<PricingRule> overlapping = repository.findOverlapping(
                accommodationTypeId, req.getRuleType(), req.getStartDate(), req.getEndDate(), excludeId);
        if (!overlapping.isEmpty()) {
            throw new ConflictException(
                    "This " + req.getRuleType() + " rule overlaps another active one on the same date range.");
        }
    }

    private PricingRule find(UUID accommodationTypeId, UUID ruleId) {
        PricingRule rule = repository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Pricing rule not found: " + ruleId));
        if (!rule.getAccommodationType().getId().equals(accommodationTypeId)) {
            throw new ResourceNotFoundException("Pricing rule not found: " + ruleId);
        }
        return rule;
    }
}
