package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.ServiceOptionPricingRuleRequest;
import com.camping.duneinsolite.dto.response.ServiceOptionPricingRuleResponse;
import com.camping.duneinsolite.service.ServiceOptionPricingRuleAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/service-options/{serviceOptionId}/pricing-rules")
@RequiredArgsConstructor
public class ServiceOptionPricingRuleController {

    private final ServiceOptionPricingRuleAdminService service;

    @GetMapping
    @PreAuthorize("@perm.can('SERVICE_OPTIONS', 'EDIT')")
    public List<ServiceOptionPricingRuleResponse> list(@PathVariable UUID serviceOptionId) {
        return service.list(serviceOptionId);
    }

    @PostMapping
    @PreAuthorize("@perm.can('SERVICE_OPTIONS', 'FULL')")
    public ResponseEntity<ServiceOptionPricingRuleResponse> create(@PathVariable UUID serviceOptionId,
                                                                     @Valid @RequestBody ServiceOptionPricingRuleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(serviceOptionId, req));
    }

    @PutMapping("/{ruleId}")
    @PreAuthorize("@perm.can('SERVICE_OPTIONS', 'FULL')")
    public ServiceOptionPricingRuleResponse update(@PathVariable UUID serviceOptionId, @PathVariable UUID ruleId,
                                                    @Valid @RequestBody ServiceOptionPricingRuleRequest req) {
        return service.update(serviceOptionId, ruleId, req);
    }

    @DeleteMapping("/{ruleId}")
    @PreAuthorize("@perm.can('SERVICE_OPTIONS', 'FULL')")
    public ResponseEntity<Void> delete(@PathVariable UUID serviceOptionId, @PathVariable UUID ruleId) {
        service.delete(serviceOptionId, ruleId);
        return ResponseEntity.noContent().build();
    }
}
