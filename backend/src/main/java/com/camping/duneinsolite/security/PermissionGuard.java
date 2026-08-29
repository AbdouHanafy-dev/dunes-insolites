package com.camping.duneinsolite.security;

import com.camping.duneinsolite.model.enums.AdminResource;
import com.camping.duneinsolite.model.enums.PermissionLevel;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.service.RolePermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

// Exposed to @PreAuthorize SpEL as the bean name "perm" - e.g.
// @PreAuthorize("@perm.can('RESERVATIONS', 'READ')"). Deliberately string-
// typed args (not the enums directly): SpEL string literals are what
// @PreAuthorize can actually express, same reason hasRole('ADMIN') takes a
// literal string rather than an enum constant.
//
// Only the backoffice's "ordinary CRUD" endpoints call this - a resource's
// genuinely destructive or financially/legally sensitive actions (hard
// deletes, invoice generation, staff assignment) are intentionally left as
// plain hasRole('ADMIN') in their controllers, never routed through here.
// See AdminResource's own class comment.
@Component("perm")
@RequiredArgsConstructor
public class PermissionGuard {

    private final RolePermissionService rolePermissionService;

    public boolean can(String resource, String level) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;

        UserRole role = currentRole(auth);
        if (role == null) return false;

        return rolePermissionService.can(
                role,
                AdminResource.valueOf(resource),
                PermissionLevel.valueOf(level)
        );
    }

    // Mirrors JwtAuthenticationConverter's ROLE_XXX convention (see
    // SecurityConfig) - a JWT can carry more than one realm role in
    // principle, so this takes the first one that maps to a real UserRole
    // rather than assuming there's exactly one authority.
    private UserRole currentRole(Authentication auth) {
        for (GrantedAuthority authority : auth.getAuthorities()) {
            String name = authority.getAuthority();
            if (name == null || !name.startsWith("ROLE_")) continue;
            try {
                return UserRole.valueOf(name.substring("ROLE_".length()));
            } catch (IllegalArgumentException ignored) {
                // Not one of our four roles (e.g. a Keycloak default realm role) - keep looking.
            }
        }
        return null;
    }
}
