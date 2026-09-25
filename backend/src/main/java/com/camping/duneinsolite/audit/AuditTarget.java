package com.camping.duneinsolite.audit;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * What a write request is about, worked out from its method and URL alone — no body is
 * read. {@code POST /api/tours} is a CREATE of {@code tours}; {@code PUT /api/tours/{id}}
 * an UPDATE of that tour; {@code DELETE} a DELETE; a POST on a sub-path of a record
 * ({@code POST /api/reservations/{id}/cancel}) an ACTION with that verb.
 *
 * @param entityType  the first path segment after {@code /api} ({@code tours},
 *                    {@code tour-types}, {@code admin/role-permissions} …)
 * @param entityId    the first id-looking segment, when there is one
 * @param verb        the sub-path after the id, e.g. {@code cancel} or {@code photos}
 */
public record AuditTarget(String action, String entityType, String entityId, String verb) {

    private static final Pattern UUID = Pattern.compile(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");

    /**
     * Never audited: anonymous visitors' traffic and self-service noise. Login carries
     * credentials; notifications and favourites are read/unread flags, not records.
     * The audit endpoint itself is excluded so reading the log does not write to it.
     */
    private static final List<String> SKIPPED = List.of(
            "/api/auth/", "/api/public/", "/api/notifications", "/api/currency",
            "/api/favorites", "/api/admin/audit-log");

    /** Empty when the request is not a write the log cares about. */
    public static Optional<AuditTarget> of(String method, String path) {
        if (method == null || path == null) return Optional.empty();
        String action = switch (method.toUpperCase()) {
            case "POST" -> "CREATE";
            case "PUT", "PATCH" -> "UPDATE";
            case "DELETE" -> "DELETE";
            default -> null;
        };
        if (action == null) return Optional.empty();

        String p = path.length() > 1 && path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
        if (!p.startsWith("/api/")) return Optional.empty();
        for (String skipped : SKIPPED) {
            if (p.equals(skipped.replaceAll("/$", "")) || p.startsWith(skipped)) return Optional.empty();
        }

        List<String> segments = new ArrayList<>(List.of(p.substring("/api/".length()).split("/")));
        if (segments.isEmpty() || segments.get(0).isBlank()) return Optional.empty();

        String type = segments.remove(0);
        if (type.equals("admin") && !segments.isEmpty()) type = "admin/" + segments.remove(0);

        String id = null;
        String verb = null;
        for (String s : segments) {
            if (id == null && isId(s)) id = s;
            else if (!isId(s) && verb == null) verb = s;
        }
        // A POST on a sub-path of an existing record is a state change, not a new record.
        if (action.equals("CREATE") && id != null && verb != null) action = "ACTION";
        return Optional.of(new AuditTarget(action, type, id, verb));
    }

    private static boolean isId(String segment) {
        return UUID.matcher(segment).matches() || segment.chars().allMatch(Character::isDigit);
    }
}
