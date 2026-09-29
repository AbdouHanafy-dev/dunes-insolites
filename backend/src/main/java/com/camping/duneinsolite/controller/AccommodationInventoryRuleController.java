package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.InventoryRuleRequest;
import com.camping.duneinsolite.dto.response.InventoryRuleResponse;
import com.camping.duneinsolite.service.InventoryRuleAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/accommodation-types/{targetId}/inventory-rules")
@RequiredArgsConstructor
public class AccommodationInventoryRuleController {
    private final InventoryRuleAdminService service;
    @GetMapping @PreAuthorize("@perm.can('TOUR_TYPES', 'EDIT')")
    public List<InventoryRuleResponse> list(@PathVariable UUID targetId) { return service.listAccommodation(targetId); }
    @PostMapping @PreAuthorize("@perm.can('TOUR_TYPES', 'FULL')")
    public ResponseEntity<InventoryRuleResponse> create(@PathVariable UUID targetId, @Valid @RequestBody InventoryRuleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createAccommodation(targetId, request));
    }
    @DeleteMapping("/{ruleId}") @PreAuthorize("@perm.can('TOUR_TYPES', 'FULL')")
    public ResponseEntity<Void> delete(@PathVariable UUID targetId, @PathVariable UUID ruleId) {
        service.deleteAccommodation(targetId, ruleId); return ResponseEntity.noContent().build();
    }
}
