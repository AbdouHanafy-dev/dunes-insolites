package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.model.RolePermission;
import com.camping.duneinsolite.model.enums.AdminResource;
import com.camping.duneinsolite.model.enums.PermissionLevel;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.RolePermissionRepository;
import com.camping.duneinsolite.service.RolePermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RolePermissionServiceImpl implements RolePermissionService {

    private final RolePermissionRepository rolePermissionRepository;

    @Override
    @Transactional(readOnly = true)
    public boolean can(UserRole role, AdminResource resource, PermissionLevel required) {
        // Hardcoded, not a seeded row - see RolePermission's own class
        // comment on why ADMIN must never depend on a DB row existing.
        if (role == UserRole.ADMIN) return true;
        if (role == UserRole.CLIENT) return false;

        return rolePermissionRepository.findByRoleAndResource(role, resource)
                .map(RolePermission::getLevel)
                .orElse(PermissionLevel.NONE)
                .satisfies(required);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UserRole, Map<AdminResource, PermissionLevel>> getMatrix() {
        Map<UserRole, Map<AdminResource, PermissionLevel>> matrix = new EnumMap<>(UserRole.class);
        for (UserRole role : UserRole.values()) {
            Map<AdminResource, PermissionLevel> row = new EnumMap<>(AdminResource.class);
            for (AdminResource resource : AdminResource.values()) {
                PermissionLevel level = switch (role) {
                    case ADMIN -> PermissionLevel.FULL;
                    case CLIENT -> PermissionLevel.NONE;
                    default -> rolePermissionRepository.findByRoleAndResource(role, resource)
                            .map(RolePermission::getLevel)
                            .orElse(PermissionLevel.NONE);
                };
                row.put(resource, level);
            }
            matrix.put(role, row);
        }
        return matrix;
    }

    @Override
    @Transactional
    public void updateMatrix(Map<UserRole, Map<AdminResource, PermissionLevel>> updates) {
        for (Map.Entry<UserRole, Map<AdminResource, PermissionLevel>> roleEntry : updates.entrySet()) {
            UserRole role = roleEntry.getKey();
            // ADMIN is always FULL and CLIENT is always NONE, hardcoded in
            // can()/getMatrix() above - accepting an edit to either here
            // would silently do nothing, which is worse than rejecting it
            // outright and telling the caller why.
            if (role == UserRole.ADMIN || role == UserRole.CLIENT) {
                throw new IllegalArgumentException(
                        "The " + role + " role's permissions are fixed and cannot be edited.");
            }

            for (Map.Entry<AdminResource, PermissionLevel> resourceEntry : roleEntry.getValue().entrySet()) {
                AdminResource resource = resourceEntry.getKey();
                PermissionLevel level = resourceEntry.getValue();

                RolePermission row = rolePermissionRepository.findByRoleAndResource(role, resource)
                        .orElseGet(() -> RolePermission.builder().role(role).resource(resource).build());
                row.setLevel(level);
                rolePermissionRepository.save(row);
            }
        }
        log.info("Role permission matrix updated for roles: {}", updates.keySet());
    }
}
