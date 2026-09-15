package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.AdminResource;
import com.camping.duneinsolite.model.enums.PermissionLevel;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

// One (customRoleName, resource) -> level row — the exact same shape as
// RolePermission, deliberately kept as its own table rather than reusing
// role_permissions (whose `role` column is checked against the fixed
// 4-value enum) so this never touches that table's constraint or the
// existing 4-role matrix code at all.
@Entity
@Table(name = "custom_role_permissions",
       uniqueConstraints = @UniqueConstraint(name = "uk_custom_role_resource", columnNames = {"custom_role_name", "resource"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomRolePermission {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "custom_role_name", nullable = false, length = 64)
    private String customRoleName;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource", nullable = false)
    private AdminResource resource;

    @Enumerated(EnumType.STRING)
    @Column(name = "level", nullable = false)
    private PermissionLevel level;
}
