package com.camping.duneinsolite.audit;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Reads a record's display name just before it is changed or deleted, so the log can say
 * "deleted the circuit <i>Tunisie : 2 jours…</i>" rather than only a UUID nobody can
 * look up any more.
 *
 * <p>Table and column names come from the fixed map below, never from the request, so
 * nothing the caller sends reaches the SQL text. A lookup that fails for any reason yields
 * nothing: a missing label must never fail the request being audited.
 */
@Slf4j
@Component
public class AuditEntityLabels {

    /** table, id column, SQL expression for the label. */
    private record Source(String table, String idColumn, String labelSql) {}

    private static final Map<String, Source> SOURCES = Map.ofEntries(
            Map.entry("tours", new Source("tours", "tour_id", "name")),
            Map.entry("tour-types", new Source("tour_types", "tour_type_id", "name")),
            Map.entry("extras", new Source("extras", "extra_id", "name")),
            Map.entry("accommodation-types", new Source("accommodation_types", "id", "name")),
            Map.entry("pages", new Source("pages", "page_id", "title")),
            Map.entry("redirects", new Source("redirects", "redirect_id", "from_path")),
            Map.entry("maintenance-windows", new Source("maintenance_windows", "maintenance_id", "path")),
            Map.entry("content-blocks", new Source("content_blocks", "block_id", "label")),
            Map.entry("navigation", new Source("navigation_items", "nav_item_id", "label")),
            Map.entry("guide-profiles", new Source("guide_profiles", "guide_profile_id", "first_name || ' ' || last_name")),
            Map.entry("driver-profiles", new Source("driver_profiles", "driver_profile_id", "first_name || ' ' || last_name")),
            Map.entry("chauffeurs", new Source("chauffeurs", "chauffeur_id", "first_name || ' ' || last_name")),
            Map.entry("guides", new Source("guides", "guide_id", "first_name || ' ' || last_name")),
            Map.entry("users", new Source("users", "user_id", "email")),
            Map.entry("invoices", new Source("invoices", "invoice_id", "invoice_number")),
            Map.entry("sources", new Source("sources", "source_id", "name")),
            Map.entry("external-reviews", new Source("external_reviews", "external_review_id", "title")));

    private final JdbcTemplate jdbc;

    public AuditEntityLabels(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<String> labelFor(String entityType, String entityId) {
        Source source = SOURCES.get(entityType);
        if (source == null || entityId == null) return Optional.empty();
        try {
            UUID id = UUID.fromString(entityId);
            List<String> rows = jdbc.queryForList(
                    "SELECT " + source.labelSql() + " FROM " + source.table() + " WHERE " + source.idColumn() + " = ?",
                    String.class, id);
            return rows.stream().filter(s -> s != null && !s.isBlank()).findFirst();
        } catch (Exception e) {
            log.debug("audit label lookup failed for {} {}: {}", entityType, entityId, e.toString());
            return Optional.empty();
        }
    }
}
