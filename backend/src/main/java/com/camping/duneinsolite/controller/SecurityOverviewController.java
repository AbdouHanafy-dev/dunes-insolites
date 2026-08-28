package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.response.SecurityEndpointResponse;
import com.camping.duneinsolite.service.SecurityOverviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read-only introspection of the app's own authorization rules, for the
 * backoffice "Rôles & permissions" page. There is deliberately no write
 * side here: roles are a fixed enum (UserRole) backed by Keycloak realm
 * roles, not a database table an admin edits - a free-form roles/
 * permissions CRUD would contradict that and risks reopening the exact
 * "caller-supplied role" hole CLAUDE.md documents as already closed once.
 *
 * Base path: /api/admin/security-overview - covered by SecurityConfig's
 * ".requestMatchers("/api/admin/**").hasRole("ADMIN")" already; the
 * class-level @PreAuthorize below is defence in depth, matching every
 * other controller under /api/admin/**.
 */
@RestController
@RequestMapping("/api/admin/security-overview")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SecurityOverviewController {

    private final SecurityOverviewService securityOverviewService;

    @GetMapping("/endpoints")
    public ResponseEntity<List<SecurityEndpointResponse>> listEndpoints() {
        return ResponseEntity.ok(securityOverviewService.listEndpoints());
    }
}
