package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.PricingRuleRequest;
import com.camping.duneinsolite.dto.response.PricingRuleResponse;
import com.camping.duneinsolite.service.PricingRuleAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/extras/{extraId}/pricing-rules")
@RequiredArgsConstructor
public class ExtraPricingRuleController {
    private final PricingRuleAdminService service;

    @GetMapping @PreAuthorize("@perm.can('EXTRAS', 'EDIT')")
    public List<PricingRuleResponse> list(@PathVariable UUID extraId) { return service.listExtra(extraId); }

    @PostMapping @PreAuthorize("@perm.can('EXTRAS', 'FULL')")
    public ResponseEntity<PricingRuleResponse> create(@PathVariable UUID extraId,
            @Valid @RequestBody PricingRuleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createExtra(extraId, req));
    }

    @PutMapping("/{ruleId}") @PreAuthorize("@perm.can('EXTRAS', 'FULL')")
    public PricingRuleResponse update(@PathVariable UUID extraId, @PathVariable UUID ruleId,
            @Valid @RequestBody PricingRuleRequest req) { return service.updateExtra(extraId, ruleId, req); }

    @DeleteMapping("/{ruleId}") @PreAuthorize("@perm.can('EXTRAS', 'FULL')")
    public ResponseEntity<Void> delete(@PathVariable UUID extraId, @PathVariable UUID ruleId) {
        service.deleteExtra(extraId, ruleId);
        return ResponseEntity.noContent().build();
    }
}
