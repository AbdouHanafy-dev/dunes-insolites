package com.camping.duneinsolite.model.enums;

// Ordered NONE < READ < EDIT < FULL - the ordinal *is* the ranking, so
// "does this role have at least X" is a plain >= comparison (see
// PermissionLevel#satisfies). Never reorder these constants.
//
// READ  = view/list only (GET).
// EDIT  = READ + update existing rows (PUT/PATCH) - not create, not delete.
// FULL  = EDIT + create new rows and delete existing ones (POST/DELETE).
//
// FULL does not automatically mean "every DELETE endpoint this resource
// has". A handful of genuinely destructive, high-stakes actions (hard-
// deleting a User/Reservation/Invoice/Transaction — see the cascade fixes
// earlier this session) are intentionally left hardcoded hasRole('ADMIN')
// in their controllers and never wired to this matrix at all, so granting
// FULL on those resources here cannot accidentally hand out a capability
// this codebase has already gone to real effort to keep ADMIN-only.
public enum PermissionLevel {
    NONE,
    READ,
    EDIT,
    FULL;

    public boolean satisfies(PermissionLevel required) {
        return this.ordinal() >= required.ordinal();
    }
}
