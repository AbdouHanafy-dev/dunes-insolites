package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.CustomRoleRequest;
import com.camping.duneinsolite.dto.response.CustomRoleResponse;
import com.camping.duneinsolite.model.enums.AdminResource;
import com.camping.duneinsolite.model.enums.PermissionLevel;

import java.util.List;
import java.util.Map;

public interface CustomRoleService {

    List<CustomRoleResponse> listAll();

    CustomRoleResponse create(CustomRoleRequest request);

    // Refuses if any user still has this role attached — see
    // UserRepository.existsByCustomRoleName.
    void delete(String name);

    // Every AdminResource, defaulting to NONE for anything never set -
    // same "one row per resource, blank slate until configured" shape as
    // RolePermissionService.getMatrix()'s per-role row.
    Map<AdminResource, PermissionLevel> getPermissions(String name);

    void updatePermissions(String name, Map<AdminResource, PermissionLevel> updates);

    /** Used by PermissionGuard - false for any name that isn't a real, existing custom role. */
    boolean can(String customRoleName, AdminResource resource, PermissionLevel required);
}
