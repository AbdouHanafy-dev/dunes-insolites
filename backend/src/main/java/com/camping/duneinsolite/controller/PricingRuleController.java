package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.PricingRuleRequest;
import com.camping.duneinsolite.dto.response.PricingRuleResponse;
import com.camping.duneinsolite.service.PricingRuleAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Date/period price overrides for one accommodation tier. Same
 * catalogue-permission model as AccommodationTypeController - it's the
 * same "tarifs" surface, not a separate resource.
 */
@RestController
@RequestMapping("/api/accommodation-types/{accommodationTypeId}/pricing-rules")
@RequiredArgsConstructor
public class PricingRuleController {

    private final PricingRuleAdminService service;

    @GetMapping
    @PreAuthorize("@perm.can('TOUR_TYPES', 'EDIT')")
    public List<PricingRuleResponse> list(@PathVariable UUID accommodationTypeId) {
        return service.list(accommodationTypeId);
    }

    @PostMapping
    @PreAuthorize("@perm.can('TOUR_TYPES', 'FULL')")
    public ResponseEntity<PricingRuleResponse> create(@PathVariable UUID accommodationTypeId,
                                                        @Valid @RequestBody PricingRuleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(accommodationTypeId, req));
    }

    @PutMapping("/{ruleId}")
    @PreAuthorize("@perm.can('TOUR_TYPES', 'FULL')")
    public PricingRuleResponse update(@PathVariable UUID accommodationTypeId, @PathVariable UUID ruleId,
                                       @Valid @RequestBody PricingRuleRequest req) {
        return service.update(accommodationTypeId, ruleId, req);
    }

    @DeleteMapping("/{ruleId}")
    @PreAuthorize("@perm.can('TOUR_TYPES', 'FULL')")
    public ResponseEntity<Void> delete(@PathVariable UUID accommodationTypeId, @PathVariable UUID ruleId) {
        service.delete(accommodationTypeId, ruleId);
        return ResponseEntity.noContent().build();
    }
}
