package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.RolePermission;
import com.camping.duneinsolite.model.enums.AdminResource;
import com.camping.duneinsolite.model.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RolePermissionRepository extends JpaRepository<RolePermission, java.util.UUID> {

    List<RolePermission> findAll();

    Optional<RolePermission> findByRoleAndResource(UserRole role, AdminResource resource);

    boolean existsByRole(UserRole role);
}
