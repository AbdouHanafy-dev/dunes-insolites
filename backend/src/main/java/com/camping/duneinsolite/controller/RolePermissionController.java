package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.model.enums.AdminResource;
import com.camping.duneinsolite.model.enums.PermissionLevel;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.service.RolePermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// The real "Roles & permissions" backend, replacing the read-only mirror
// the admin screen used to be (see that page's own comment, written before
// this existed: "a free-form roles/permissions CRUD would just be a second,
// fake source of truth next to the real one" - it no longer is one, this
// endpoint IS the real source of truth PermissionGuard reads at request
// time). ADMIN-only, hardcoded, not itself matrix-governed - deciding who
// can change everyone else's access can't be delegated through the very
// matrix it controls.
@RestController
@RequestMapping("/api/admin/role-permissions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RolePermissionController {

    private final RolePermissionService rolePermissionService;

    @GetMapping
    public ResponseEntity<Map<UserRole, Map<AdminResource, PermissionLevel>>> getMatrix() {
        return ResponseEntity.ok(rolePermissionService.getMatrix());
    }

    @PutMapping
    public ResponseEntity<Map<UserRole, Map<AdminResource, PermissionLevel>>> updateMatrix(
            @RequestBody Map<UserRole, Map<AdminResource, PermissionLevel>> updates) {
        rolePermissionService.updateMatrix(updates);
        return ResponseEntity.ok(rolePermissionService.getMatrix());
    }
}
