package com.camping.duneinsolite.model.enums;

// The backoffice's ~15 CRUD surfaces, one per admin nav entry that has its
// own controller/table. Deliberately NOT a 1:1 list of every controller —
// a few are excluded on purpose and stay hardcoded hasRole('ADMIN'),
// never delegable through the permission matrix at all:
//   - SecurityOverviewController / StatisticsController: security/audit
//     surfaces, not a business resource — handing out READ here would mean
//     handing out visibility into the app's own @PreAuthorize rules.
//   - CampingSettingsController's write side: a single global config
//     value (max capacity), not a table — too small to need a matrix row.
// See RolePermissionSeeder for the default matrix and PermissionGuard for
// enforcement.
public enum AdminResource {
    USERS,
    RESERVATIONS,
    INVOICES,
    TRANSACTIONS,
    TOURS,
    TOUR_TYPES,
    EXTRAS,
    REVIEWS,
    AVAILABILITY,
    PAGES,
    CONTENT_BLOCKS,
    MEDIA,
    NAVIGATION,
    REDIRECTS,
    GALLERY,
    MAINTENANCE_WINDOWS,
    NEWSLETTER_SUBSCRIBERS
}
