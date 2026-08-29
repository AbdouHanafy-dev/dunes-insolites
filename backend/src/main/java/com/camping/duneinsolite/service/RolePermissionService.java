package com.camping.duneinsolite.service;

import com.camping.duneinsolite.model.enums.AdminResource;
import com.camping.duneinsolite.model.enums.PermissionLevel;
import com.camping.duneinsolite.model.enums.UserRole;

import java.util.Map;

public interface RolePermissionService {

    // ADMIN always returns true regardless of what's stored - see
    // PermissionGuard's own comment on why that bypass is hardcoded rather
    // than relying on a seeded row.
    boolean can(UserRole role, AdminResource resource, PermissionLevel required);

    // Full matrix for the admin "Roles & permissions" screen: every
    // (role, resource) pair, CLIENT/ADMIN included even though neither is
    // editable from that screen (ADMIN is always FULL, CLIENT is always
    // NONE) - the frontend renders every row, so the API returns every row.
    Map<UserRole, Map<AdminResource, PermissionLevel>> getMatrix();

    // Bulk-replace the editable part of the matrix (CAMPING/PARTENAIRE
    // rows only - see the controller for why ADMIN/CLIENT entries in the
    // request body are rejected rather than silently ignored).
    void updateMatrix(Map<UserRole, Map<AdminResource, PermissionLevel>> updates);
}
