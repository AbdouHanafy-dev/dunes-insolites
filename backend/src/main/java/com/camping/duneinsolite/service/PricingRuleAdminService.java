package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.PricingRuleRequest;
import com.camping.duneinsolite.dto.response.PricingRuleResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.PricingRule;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.PricingRuleRepository;
import com.camping.duneinsolite.repository.ExtraRepository;
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
    private final ExtraRepository extraRepository;

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

    @Transactional(readOnly = true)
    public List<PricingRuleResponse> listExtra(UUID extraId) {
        return repository.findByExtra_ExtraIdOrderByStartDateAsc(extraId)
                .stream().map(PricingRuleResponse::from).toList();
    }

    public PricingRuleResponse createExtra(UUID extraId, PricingRuleRequest req) {
        Extra extra = extraRepository.findById(extraId)
                .orElseThrow(() -> new ResourceNotFoundException("Extra not found: " + extraId));
        validate(req);
        rejectExtraOverlap(extraId, req, NO_EXCLUSION);
        return PricingRuleResponse.from(repository.save(PricingRule.builder()
                .extra(extra).ruleType(req.getRuleType()).startDate(req.getStartDate())
                .endDate(req.getEndDate()).priceTtc(Money.round(req.getPriceTtc()))
                .active(req.getActive() == null || req.getActive()).build()));
    }

    public PricingRuleResponse updateExtra(UUID extraId, UUID ruleId, PricingRuleRequest req) {
        PricingRule rule = findExtra(extraId, ruleId);
        validate(req);
        rejectExtraOverlap(extraId, req, ruleId);
        rule.setRuleType(req.getRuleType());
        rule.setStartDate(req.getStartDate());
        rule.setEndDate(req.getEndDate());
        rule.setPriceTtc(Money.round(req.getPriceTtc()));
        if (req.getActive() != null) rule.setActive(req.getActive());
        return PricingRuleResponse.from(rule);
    }

    public void deleteExtra(UUID extraId, UUID ruleId) {
        repository.delete(findExtra(extraId, ruleId));
    }

    private void rejectExtraOverlap(UUID extraId, PricingRuleRequest req, UUID excludeId) {
        if (req.getActive() != null && !req.getActive()) return;
        if (!repository.findOverlappingExtra(extraId, req.getRuleType(), req.getStartDate(),
                req.getEndDate(), excludeId).isEmpty()) {
            throw new ConflictException("This pricing rule overlaps another active rule for the same extra.");
        }
    }

    private PricingRule findExtra(UUID extraId, UUID ruleId) {
        PricingRule rule = repository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Pricing rule not found: " + ruleId));
        if (rule.getExtra() == null || !rule.getExtra().getExtraId().equals(extraId)) {
            throw new ResourceNotFoundException("Pricing rule not found: " + ruleId);
        }
        return rule;
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
        // An extra's rule has no accommodationType — null-check first so
        // passing an extra rule's id to this accommodation-scoped lookup 404s
        // cleanly instead of NPEing, same defensiveness findExtra() already
        // has for the reverse case.
        if (rule.getAccommodationType() == null || !rule.getAccommodationType().getId().equals(accommodationTypeId)) {
            throw new ResourceNotFoundException("Pricing rule not found: " + ruleId);
        }
        return rule;
    }
}
