package com.camping.duneinsolite.model.enums;

public enum UserRole {
    CLIENT,
    PARTENAIRE,
    CAMPING,
    ADMIN,
    // A blank-slate staff account whose real permissions come entirely
    // from its attached custom role (User.customRoleName / CustomRole),
    // not from this enum value itself - no hasRole('STAFF') or
    // hasAnyRole(..., 'STAFF') exists anywhere, and
    // RolePermissionServiceImpl.can() falls through to the same
    // default-NONE DB-lookup branch CAMPING/PARTENAIRE use, so on its own
    // STAFF grants nothing. See V10__custom_roles.sql's own comment.
    STAFF
}
