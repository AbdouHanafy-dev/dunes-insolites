package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.InventoryRuleRequest;
import com.camping.duneinsolite.dto.response.InventoryRuleResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.InventoryRule;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.InventoryRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class InventoryRuleAdminService {
    private static final UUID NONE = new UUID(0, 0);
    private final InventoryRuleRepository repository;
    private final AccommodationTypeRepository accommodationRepository;
    private final ExtraRepository extraRepository;

    @Transactional(readOnly = true)
    public List<InventoryRuleResponse> listAccommodation(UUID id) {
        return repository.findByAccommodationType_IdOrderByStartDateAsc(id).stream().map(InventoryRuleResponse::from).toList();
    }

    public InventoryRuleResponse createAccommodation(UUID id, InventoryRuleRequest request) {
        var target = accommodationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation not found: " + id));
        validate(request);
        rejectAccommodationOverlap(id, request, NONE);
        return InventoryRuleResponse.from(repository.save(InventoryRule.builder()
                .accommodationType(target).ruleType(request.getRuleType()).startDate(request.getStartDate())
                .endDate(request.getEndDate()).maxUnits(request.getMaxUnits()).note(clean(request.getNote()))
                .active(request.getActive() == null || request.getActive()).build()));
    }

    public void deleteAccommodation(UUID targetId, UUID ruleId) {
        var rule = find(ruleId);
        if (rule.getAccommodationType() == null || !rule.getAccommodationType().getId().equals(targetId)) notFound(ruleId);
        repository.delete(rule);
    }

    @Transactional(readOnly = true)
    public List<InventoryRuleResponse> listExtra(UUID id) {
        return repository.findByExtra_ExtraIdOrderByStartDateAsc(id).stream().map(InventoryRuleResponse::from).toList();
    }

    public InventoryRuleResponse createExtra(UUID id, InventoryRuleRequest request) {
        var target = extraRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Extra not found: " + id));
        validate(request);
        rejectExtraOverlap(id, request, NONE);
        return InventoryRuleResponse.from(repository.save(InventoryRule.builder()
                .extra(target).ruleType(request.getRuleType()).startDate(request.getStartDate())
                .endDate(request.getEndDate()).maxUnits(request.getMaxUnits()).note(clean(request.getNote()))
                .active(request.getActive() == null || request.getActive()).build()));
    }

    public void deleteExtra(UUID targetId, UUID ruleId) {
        var rule = find(ruleId);
        if (rule.getExtra() == null || !rule.getExtra().getExtraId().equals(targetId)) notFound(ruleId);
        repository.delete(rule);
    }

    /** DATE wins over PERIOD; otherwise the catalogue capacity is used. */
    @Transactional(readOnly = true)
    public Integer capacityForAccommodation(UUID id, LocalDate date, Integer fallback) {
        return repository.findCoveringAccommodation(id, date).stream().findFirst()
                .map(InventoryRule::getMaxUnits).orElse(fallback);
    }

    @Transactional(readOnly = true)
    public Integer capacityForExtra(UUID id, LocalDate date, Integer fallback) {
        return repository.findCoveringExtra(id, date).stream().findFirst()
                .map(InventoryRule::getMaxUnits).orElse(fallback);
    }

    private void validate(InventoryRuleRequest request) {
        if (request.getEndDate().isBefore(request.getStartDate())) throw new IllegalArgumentException("End date cannot be before start date.");
        if (request.getRuleType().name().equals("DATE") && !request.getStartDate().equals(request.getEndDate())) {
            throw new IllegalArgumentException("A DATE rule must start and end on the same date.");
        }
    }

    private void rejectAccommodationOverlap(UUID id, InventoryRuleRequest r, UUID exclude) {
        if (r.getActive() != null && !r.getActive()) return;
        if (!repository.findOverlappingAccommodation(id, r.getRuleType(), r.getStartDate(), r.getEndDate(), exclude).isEmpty()) {
            throw new ConflictException("This availability rule overlaps another active rule of the same type.");
        }
    }

    private void rejectExtraOverlap(UUID id, InventoryRuleRequest r, UUID exclude) {
        if (r.getActive() != null && !r.getActive()) return;
        if (!repository.findOverlappingExtra(id, r.getRuleType(), r.getStartDate(), r.getEndDate(), exclude).isEmpty()) {
            throw new ConflictException("This availability rule overlaps another active rule of the same type.");
        }
    }

    private InventoryRule find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Availability rule not found: " + id));
    }
    private void notFound(UUID id) { throw new ResourceNotFoundException("Availability rule not found: " + id); }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
