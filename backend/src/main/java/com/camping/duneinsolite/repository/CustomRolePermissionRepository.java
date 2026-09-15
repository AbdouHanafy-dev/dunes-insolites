package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.CustomRolePermission;
import com.camping.duneinsolite.model.enums.AdminResource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomRolePermissionRepository extends JpaRepository<CustomRolePermission, java.util.UUID> {
    Optional<CustomRolePermission> findByCustomRoleNameAndResource(String customRoleName, AdminResource resource);

    List<CustomRolePermission> findByCustomRoleName(String customRoleName);

    void deleteByCustomRoleName(String customRoleName);
}
