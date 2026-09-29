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
@RequestMapping("/api/extras/{targetId}/inventory-rules")
@RequiredArgsConstructor
public class ExtraInventoryRuleController {
    private final InventoryRuleAdminService service;
    @GetMapping @PreAuthorize("@perm.can('EXTRAS', 'EDIT')")
    public List<InventoryRuleResponse> list(@PathVariable UUID targetId) { return service.listExtra(targetId); }
    @PostMapping @PreAuthorize("@perm.can('EXTRAS', 'FULL')")
    public ResponseEntity<InventoryRuleResponse> create(@PathVariable UUID targetId, @Valid @RequestBody InventoryRuleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createExtra(targetId, request));
    }
    @DeleteMapping("/{ruleId}") @PreAuthorize("@perm.can('EXTRAS', 'FULL')")
    public ResponseEntity<Void> delete(@PathVariable UUID targetId, @PathVariable UUID ruleId) {
        service.deleteExtra(targetId, ruleId); return ResponseEntity.noContent().build();
    }
}
