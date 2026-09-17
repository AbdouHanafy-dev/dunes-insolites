package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.ServiceOptionPricingRuleRequest;
import com.camping.duneinsolite.dto.response.ServiceOptionPricingRuleResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.ServiceOption;
import com.camping.duneinsolite.model.ServiceOptionPricingRule;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.ServiceOptionPricingRuleRepository;
import com.camping.duneinsolite.repository.ServiceOptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Twin of {@code PricingRuleAdminService} - see its own javadoc for the overlap-rejection reasoning. */
@Service
@RequiredArgsConstructor
@Transactional
public class ServiceOptionPricingRuleAdminService {

    private final ServiceOptionPricingRuleRepository repository;
    private final ServiceOptionRepository serviceOptionRepository;

    private static final UUID NO_EXCLUSION = new UUID(0L, 0L);

    @Transactional(readOnly = true)
    public List<ServiceOptionPricingRuleResponse> list(UUID serviceOptionId) {
        return repository.findByServiceOption_IdOrderByStartDateAsc(serviceOptionId)
                .stream().map(ServiceOptionPricingRuleResponse::from).toList();
    }

    public ServiceOptionPricingRuleResponse create(UUID serviceOptionId, ServiceOptionPricingRuleRequest req) {
        ServiceOption option = serviceOptionRepository.findById(serviceOptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Service option not found: " + serviceOptionId));
        validate(req);
        rejectOverlap(serviceOptionId, req, NO_EXCLUSION);
        ServiceOptionPricingRule rule = ServiceOptionPricingRule.builder()
                .serviceOption(option)
                .ruleType(req.getRuleType())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .priceTtc(Money.round(req.getPriceTtc()))
                .active(req.getActive() == null || req.getActive())
                .build();
        return ServiceOptionPricingRuleResponse.from(repository.save(rule));
    }

    public ServiceOptionPricingRuleResponse update(UUID serviceOptionId, UUID ruleId, ServiceOptionPricingRuleRequest req) {
        ServiceOptionPricingRule rule = find(serviceOptionId, ruleId);
        validate(req);
        rejectOverlap(serviceOptionId, req, ruleId);
        rule.setRuleType(req.getRuleType());
        rule.setStartDate(req.getStartDate());
        rule.setEndDate(req.getEndDate());
        rule.setPriceTtc(Money.round(req.getPriceTtc()));
        if (req.getActive() != null) rule.setActive(req.getActive());
        return ServiceOptionPricingRuleResponse.from(rule);
    }

    public void delete(UUID serviceOptionId, UUID ruleId) {
        repository.delete(find(serviceOptionId, ruleId));
    }

    private void validate(ServiceOptionPricingRuleRequest req) {
        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be before start date.");
        }
    }

    private void rejectOverlap(UUID serviceOptionId, ServiceOptionPricingRuleRequest req, UUID excludeId) {
        boolean active = req.getActive() == null || req.getActive();
        if (!active) return;
        List<ServiceOptionPricingRule> overlapping = repository.findOverlapping(
                serviceOptionId, req.getRuleType(), req.getStartDate(), req.getEndDate(), excludeId);
        if (!overlapping.isEmpty()) {
            throw new ConflictException(
                    "This " + req.getRuleType() + " rule overlaps another active one on the same date range.");
        }
    }

    private ServiceOptionPricingRule find(UUID serviceOptionId, UUID ruleId) {
        ServiceOptionPricingRule rule = repository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Pricing rule not found: " + ruleId));
        if (!rule.getServiceOption().getId().equals(serviceOptionId)) {
            throw new ResourceNotFoundException("Pricing rule not found: " + ruleId);
        }
        return rule;
    }
}
