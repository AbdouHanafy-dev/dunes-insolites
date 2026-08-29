package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.AdminResource;
import com.camping.duneinsolite.model.enums.PermissionLevel;
import com.camping.duneinsolite.model.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

// One (role, resource) -> level row. ADMIN is never stored here — it's
// hardcoded to always satisfy FULL in PermissionGuard, so a missing or
// accidentally-deleted row can never lock the admin account out of its
// own permissions screen. CLIENT is stored (always NONE, not editable from
// the admin UI) purely so the matrix response has one row per role per
// resource and the frontend doesn't need special-case logic for it.
@Entity
@Table(name = "role_permissions",
       uniqueConstraints = @UniqueConstraint(name = "uk_role_resource", columnNames = {"role", "resource"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolePermission {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource", nullable = false)
    private AdminResource resource;

    @Enumerated(EnumType.STRING)
    @Column(name = "level", nullable = false)
    private PermissionLevel level;
}
