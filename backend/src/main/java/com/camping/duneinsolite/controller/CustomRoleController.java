package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.CustomRoleRequest;
import com.camping.duneinsolite.dto.response.CustomRoleResponse;
import com.camping.duneinsolite.model.enums.AdminResource;
import com.camping.duneinsolite.model.enums.PermissionLevel;
import com.camping.duneinsolite.service.CustomRoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin-creatable roles (on request, 15 Sep 2026) — additive to the fixed
 * "Rôles & permissions" screen (RolePermissionController), not a
 * replacement. ADMIN-only, hardcoded, same reasoning as
 * RolePermissionController: deciding who can grant access can't be
 * delegated through the very matrix it controls.
 */
@RestController
@RequestMapping("/api/admin/custom-roles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class CustomRoleController {

    private final CustomRoleService customRoleService;

    @GetMapping
    public ResponseEntity<List<CustomRoleResponse>> list() {
        return ResponseEntity.ok(customRoleService.listAll());
    }

    @PostMapping
    public ResponseEntity<CustomRoleResponse> create(@Valid @RequestBody CustomRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customRoleService.create(request));
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(@PathVariable String name) {
        customRoleService.delete(name);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{name}/permissions")
    public ResponseEntity<Map<AdminResource, PermissionLevel>> getPermissions(@PathVariable String name) {
        return ResponseEntity.ok(customRoleService.getPermissions(name));
    }

    @PutMapping("/{name}/permissions")
    public ResponseEntity<Map<AdminResource, PermissionLevel>> updatePermissions(
            @PathVariable String name,
            @RequestBody Map<AdminResource, PermissionLevel> updates) {
        customRoleService.updatePermissions(name, updates);
        return ResponseEntity.ok(customRoleService.getPermissions(name));
    }
}
