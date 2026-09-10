package com.camping.duneinsolite.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * The authenticated caller, resolved server-side from the security context —
 * never from a request parameter, body field or header.
 *
 * <p>Convention in this codebase: the JWT {@code sub} claim <em>is</em> our
 * {@code User.userId} (see {@code NotificationController}, {@code ReviewController},
 * {@code KeycloakUserSyncService}). This helper centralises that lookup and the
 * "staff or owner" rule so ownership checks live at the service boundary in one
 * shape rather than being re-implemented per controller (STEP 16 of the Phase 4
 * brief).
 *
 * <p><b>Company scoping is deliberately absent.</b> No operational entity, no
 * {@code User} row and no JWT claim carries a company today — that model is
 * business-blocked on OPEN-QUESTIONS Q1/Q2/Q4. See
 * {@code docs/adr/0002-company-scoping.md}. When it lands, the company predicate
 * is added here, next to {@link #isStaff()}.
 */
@Component
public class CallerContext {

    /** The current authentication, or {@code null} when unauthenticated. */
    public Authentication authentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    public boolean isAuthenticated() {
        Authentication a = authentication();
        return a != null && a.isAuthenticated();
    }

    /**
     * A real, non-anonymous authenticated principal — i.e. a request that
     * carried a valid bearer token. False for the {@code permitAll()} public
     * endpoints (no token, or Spring's {@code AnonymousAuthenticationToken}).
     */
    public boolean isAuthenticatedUser() {
        Authentication a = authentication();
        return a != null && a.isAuthenticated()
                && !(a instanceof org.springframework.security.authentication.AnonymousAuthenticationToken);
    }

    public boolean hasRole(String role) {
        Authentication a = authentication();
        if (a == null) return false;
        String wanted = "ROLE_" + role;
        for (GrantedAuthority ga : a.getAuthorities()) {
            if (wanted.equals(ga.getAuthority())) return true;
        }
        return false;
    }

    /**
     * Staff = can legitimately act across customers. ADMIN and CAMPING today.
     * These roles are <em>global</em> — there is no per-company staff concept
     * yet (tracked debt, ARCHITECTURE.md §13 item 7).
     */
    public boolean isStaff() {
        return hasRole("ADMIN") || hasRole("CAMPING");
    }

    /**
     * The caller's {@code User.userId}, from the JWT subject. Falls back to
     * parsing {@code authentication.getName()} as a UUID for non-JWT principals
     * (integration tests). Throws {@link AccessDeniedException} — not a 500 —
     * when no usable identity is present: an unknown identity must fail closed.
     */
    public UUID requireUserId() {
        Authentication a = authentication();
        if (a == null) throw new AccessDeniedException("Not authenticated.");

        Object principal = a.getPrincipal();
        if (principal instanceof Jwt jwt && jwt.getSubject() != null) {
            return parse(jwt.getSubject());
        }
        String name = a.getName();
        if (name != null) return parse(name);

        throw new AccessDeniedException("No caller identity.");
    }

    private UUID parse(String raw) {
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            throw new AccessDeniedException("Caller identity is not a user id.");
        }
    }

    /**
     * Allow the call only when the caller is staff, or is {@code ownerUserId}.
     * Fails closed (403) otherwise — and also when {@code ownerUserId} is null,
     * which would mean an orphaned record we cannot attribute.
     */
    public void requireStaffOrOwner(UUID ownerUserId) {
        if (isStaff()) return;
        if (ownerUserId != null && ownerUserId.equals(requireUserId())) return;
        throw new AccessDeniedException("You are not authorized to access this resource.");
    }
}
