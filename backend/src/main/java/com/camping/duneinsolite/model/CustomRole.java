package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

// An admin-defined role (on request, 15 Sep 2026) — a named bundle of
// AdminResource permissions (CustomRolePermission), attachable to a STAFF
// account (User.customRoleName). See V10__custom_roles.sql's own comment
// for why this is additive to, not a replacement of, the fixed
// CLIENT/PARTENAIRE/CAMPING/ADMIN system.
@Entity
@Table(name = "custom_roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomRole {

    // The name IS the id — referenced directly by User.customRoleName and
    // by the Keycloak realm role of the same name, so there is exactly one
    // spelling of a given role everywhere, never a numeric id to keep in
    // sync with a separate name string.
    @Id
    @Column(name = "name", updatable = false, nullable = false, length = 64)
    private String name;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
