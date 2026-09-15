package com.camping.duneinsolite.config;

import com.camping.duneinsolite.model.RolePermission;
import com.camping.duneinsolite.model.enums.AdminResource;
import com.camping.duneinsolite.model.enums.PermissionLevel;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.RolePermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Map;

// Runs once at startup, same idiom as Seed.java (idempotent - safe to leave
// running forever). Seeds the CAMPING/PARTENAIRE default permission matrix
// the very first time this table is empty for that role, then never
// touches it again - once an admin edits the matrix via
// PATCH /api/admin/role-permissions, this seeder must never silently
// overwrite their choice on the next restart.
//
// ADMIN and CLIENT are never seeded here - both are hardcoded in
// RolePermissionServiceImpl#can (ADMIN always FULL, CLIENT always NONE),
// on purpose (see RolePermission's own class comment).
//
// Every default below was chosen to match this app's *actual* @PreAuthorize
// behavior before this matrix existed, endpoint by endpoint - not guessed -
// with exactly two disclosed exceptions where the 4-level model (NONE <
// READ < EDIT < FULL, FULL = create+update+delete) can't express what the
// old rules actually allowed:
//
//   TOUR_TYPES and EXTRAS: CAMPING could create+update but never delete.
//   There's no level for "create+update, no delete", so this seeds FULL -
//   the closer real-world fit (camp staff already manage this catalog day
//   to day) - which does grant CAMPING delete rights they didn't have
//   before. Set these two to EDIT instead in the admin "Roles &
//   permissions" screen to remove delete again, at the cost of also losing
//   create (EDIT doesn't include it).
//
// Every other row below is a like-for-like match of what that role could
// already do - see each converted controller's own comment for the exact
// endpoint-by-endpoint reasoning.
@Slf4j
@Component
@RequiredArgsConstructor
@Order(1) // before Seed.java's account/catalog seeding - no ordering dependency either way, just readable
public class RolePermissionSeeder implements CommandLineRunner {

    private final RolePermissionRepository rolePermissionRepository;

    private static final Map<AdminResource, PermissionLevel> CAMPING_DEFAULTS = Map.ofEntries(
            Map.entry(AdminResource.USERS, PermissionLevel.NONE),
            Map.entry(AdminResource.RESERVATIONS, PermissionLevel.READ),
            Map.entry(AdminResource.INVOICES, PermissionLevel.FULL),
            Map.entry(AdminResource.TRANSACTIONS, PermissionLevel.FULL),
            Map.entry(AdminResource.TOURS, PermissionLevel.NONE),
            Map.entry(AdminResource.TOUR_TYPES, PermissionLevel.FULL), // disclosed change - see class comment
            Map.entry(AdminResource.EXTRAS, PermissionLevel.FULL),     // disclosed change - see class comment
            Map.entry(AdminResource.REVIEWS, PermissionLevel.NONE),
            Map.entry(AdminResource.AVAILABILITY, PermissionLevel.NONE),
            Map.entry(AdminResource.PAGES, PermissionLevel.NONE),
            Map.entry(AdminResource.CONTENT_BLOCKS, PermissionLevel.NONE),
            Map.entry(AdminResource.MEDIA, PermissionLevel.NONE),
            Map.entry(AdminResource.NAVIGATION, PermissionLevel.NONE),
            Map.entry(AdminResource.REDIRECTS, PermissionLevel.NONE),
            Map.entry(AdminResource.GALLERY, PermissionLevel.NONE),
            Map.entry(AdminResource.MAINTENANCE_WINDOWS, PermissionLevel.NONE),
            Map.entry(AdminResource.NEWSLETTER_SUBSCRIBERS, PermissionLevel.NONE)
    );

    private static final Map<AdminResource, PermissionLevel> PARTENAIRE_DEFAULTS = Map.ofEntries(
            Map.entry(AdminResource.USERS, PermissionLevel.NONE),
            Map.entry(AdminResource.RESERVATIONS, PermissionLevel.READ),
            Map.entry(AdminResource.INVOICES, PermissionLevel.NONE),
            Map.entry(AdminResource.TRANSACTIONS, PermissionLevel.NONE),
            Map.entry(AdminResource.TOURS, PermissionLevel.NONE),
            Map.entry(AdminResource.TOUR_TYPES, PermissionLevel.NONE),
            Map.entry(AdminResource.EXTRAS, PermissionLevel.NONE),
            Map.entry(AdminResource.REVIEWS, PermissionLevel.NONE),
            Map.entry(AdminResource.AVAILABILITY, PermissionLevel.NONE),
            Map.entry(AdminResource.PAGES, PermissionLevel.NONE),
            Map.entry(AdminResource.CONTENT_BLOCKS, PermissionLevel.NONE),
            Map.entry(AdminResource.MEDIA, PermissionLevel.NONE),
            Map.entry(AdminResource.NAVIGATION, PermissionLevel.NONE),
            Map.entry(AdminResource.REDIRECTS, PermissionLevel.NONE),
            Map.entry(AdminResource.GALLERY, PermissionLevel.NONE),
            Map.entry(AdminResource.MAINTENANCE_WINDOWS, PermissionLevel.NONE),
            Map.entry(AdminResource.NEWSLETTER_SUBSCRIBERS, PermissionLevel.NONE)
    );

    @Override
    public void run(String... args) {
        seedRole(UserRole.CAMPING, CAMPING_DEFAULTS);
        seedRole(UserRole.PARTENAIRE, PARTENAIRE_DEFAULTS);
    }

    private void seedRole(UserRole role, Map<AdminResource, PermissionLevel> defaults) {
        if (rolePermissionRepository.existsByRole(role)) {
            log.info("Seed: {} permission matrix already present - skipping", role);
            return;
        }
        defaults.forEach((resource, level) -> rolePermissionRepository.save(
                RolePermission.builder().role(role).resource(resource).level(level).build()
        ));
        log.info("Seed: default permission matrix created for {}", role);
    }
}
