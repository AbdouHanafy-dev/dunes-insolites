package com.camping.duneinsolite.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises the real Flyway migration set against a real PostgreSQL container -
 * no mocks. Guards the two things production-hardening item 1 established:
 *
 *  1. a brand-new empty database is fully built by the migrations, and
 *  2. re-running is a no-op (idempotent),
 *
 * plus a checksum/ordering validation of every migration file so a malformed
 * or edited-after-apply migration fails CI, not a deploy.
 */
@Testcontainers
class FlywayMigrationsIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16")
                    .withDatabaseName("duneinsolite_test")
                    .withUsername("postgres")
                    .withPassword("postgres");

    private Flyway flywayFor(DataSource ds) {
        return Flyway.configure()
                .dataSource(ds)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("1")
                .load();
    }

    private DataSource dataSource() {
        org.springframework.jdbc.datasource.DriverManagerDataSource ds =
                new org.springframework.jdbc.datasource.DriverManagerDataSource();
        ds.setUrl(POSTGRES.getJdbcUrl());
        ds.setUsername(POSTGRES.getUsername());
        ds.setPassword(POSTGRES.getPassword());
        return ds;
    }

    @Test
    void freshDatabaseIsFullyBuiltByMigrationsAndReRunIsANoOp() throws Exception {
        DataSource ds = dataSource();
        Flyway flyway = flywayFor(ds);

        // Fresh, empty database: V1 (and any later Vn) must actually execute.
        MigrateResult first = flyway.migrate();
        assertThat(first.success).isTrue();
        assertThat(first.migrationsExecuted).isGreaterThanOrEqualTo(1);
        assertThat(first.targetSchemaVersion).isNotNull();

        // The core business tables the rest of the app assumes exist.
        Set<String> tables = publicTables(ds);
        assertThat(tables).contains(
                "users", "reservations", "reservation_tour_types", "reservation_extras",
                "invoices", "invoice_items", "transactions", "tour_types", "extras",
                "tours", "sources", "document_sequences", "camping_settings",
                "flyway_schema_history");

        // Second run against the now-migrated database: nothing to do.
        MigrateResult second = flywayFor(ds).migrate();
        assertThat(second.success).isTrue();
        assertThat(second.migrationsExecuted).isZero();
    }

    @Test
    void v5ConvertsMoneyColumnsToNumericWhilePreservingExistingValues() throws Exception {
        // Own database so migration state can't collide with the other tests.
        String db = "v5_test_" + System.nanoTime();
        try (Connection admin = dataSource().getConnection()) {
            admin.createStatement().execute("CREATE DATABASE " + db);
        }
        org.springframework.jdbc.datasource.DriverManagerDataSource ds =
                new org.springframework.jdbc.datasource.DriverManagerDataSource();
        ds.setUrl(POSTGRES.getJdbcUrl().replaceFirst("/[^/?]+(\\?|$)", "/" + db + "$1"));
        ds.setUsername(POSTGRES.getUsername());
        ds.setPassword(POSTGRES.getPassword());

        // Migrate only up to V4 — the pre-money-migration world, where price
        // columns are still `double precision`.
        Flyway toV4 = Flyway.configure().dataSource(ds)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true).baselineVersion("1")
                .target(org.flywaydb.core.api.MigrationVersion.fromVersion("4"))
                .load();
        toV4.migrate();

        try (Connection c = ds.getConnection()) {
            assertThat(columnType(c, "extras", "unit_price")).isEqualTo("float8");
            // A historical row with binary-float noise, as ddl-auto would have stored it.
            c.createStatement().execute(
                    "INSERT INTO extras (extra_id, name, unit_price, tva, is_active) " +
                    "VALUES ('11111111-1111-1111-1111-111111111111', 'legacy', 4.9, 7.0, true)");
        }

        // Now run the rest (V5 onward — V5 is the money conversion under test;
        // later migrations ride along and must not disturb the legacy row).
        MigrateResult rest = flywayFor(ds).migrate();
        assertThat(rest.success).isTrue();
        assertThat(rest.migrationsExecuted).isGreaterThanOrEqualTo(1);
        assertThat(rest.migrations).anyMatch(m -> "5".equals(m.version));

        try (Connection c = ds.getConnection()) {
            assertThat(columnType(c, "extras", "unit_price")).isEqualTo("numeric");
            ResultSet rs = c.createStatement().executeQuery(
                    "SELECT unit_price, tva FROM extras " +
                    "WHERE extra_id = '11111111-1111-1111-1111-111111111111'");
            rs.next();
            assertThat(rs.getBigDecimal("unit_price")).isEqualByComparingTo("4.900");
            assertThat(rs.getBigDecimal("unit_price").scale()).isEqualTo(3); // millime
            assertThat(rs.getBigDecimal("tva")).isEqualByComparingTo("7.000");
        }
    }

    /**
     * The promise behind the translation migrations (V66-V68): applying them to a database that already
     * holds data removes and rewrites nothing. Fills a database built up to V65, applies the rest, then
     * checks that no pre-existing table lost a row and that a saved translation is byte-for-byte intact.
     */
    @Test
    void translationMigrationsLeaveExistingDataUntouched() throws Exception {
        String db = "translation_test_" + System.nanoTime();
        try (Connection admin = dataSource().getConnection()) {
            admin.createStatement().execute("CREATE DATABASE " + db);
        }
        org.springframework.jdbc.datasource.DriverManagerDataSource ds =
                new org.springframework.jdbc.datasource.DriverManagerDataSource();
        ds.setUrl(POSTGRES.getJdbcUrl().replaceFirst("/[^/?]+(\\?|$)", "/" + db + "$1"));
        ds.setUsername(POSTGRES.getUsername());
        ds.setPassword(POSTGRES.getPassword());

        Flyway toV65 = Flyway.configure().dataSource(ds)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true).baselineVersion("1")
                .target(org.flywaydb.core.api.MigrationVersion.fromVersion("65"))
                .load();
        toV65.migrate();

        java.util.Map<String, Long> before;
        try (Connection c = ds.getConnection()) {
            c.createStatement().execute(
                    "INSERT INTO extras (extra_id, name, unit_price, tva, is_active) " +
                    "VALUES ('22222222-2222-2222-2222-222222222222', 'Quad', 40, 7, true)");
            c.createStatement().execute(
                    "INSERT INTO extra_translations (extra_translation_id, extra_id, locale, name, description, about_text) " +
                    "VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', " +
                    "'DE', 'Quad-Tour', 'Eine Fahrt', 'Ueber uns')");
            c.createStatement().execute(
                    "INSERT INTO extra_translation_highlights (extra_translation_id, highlight, display_order) " +
                    "VALUES ('33333333-3333-3333-3333-333333333333', 'Sonnenuntergang', 0)");
            before = rowCounts(c);
        }

        MigrateResult rest = flywayFor(ds).migrate();
        assertThat(rest.success).isTrue();
        assertThat(rest.migrations).extracting(m -> m.version).contains("66", "67", "68");

        try (Connection c = ds.getConnection()) {
            java.util.Map<String, Long> after = rowCounts(c);
            before.forEach((table, rows) ->
                    assertThat(after.get(table)).as("rows in " + table + " after the migrations").isEqualTo(rows));

            ResultSet rs = c.createStatement().executeQuery(
                    "SELECT name, description, about_text, review_status, source_hash FROM extra_translations " +
                    "WHERE extra_translation_id = '33333333-3333-3333-3333-333333333333'");
            assertThat(rs.next()).isTrue();
            assertThat(rs.getString("name")).isEqualTo("Quad-Tour");
            assertThat(rs.getString("description")).isEqualTo("Eine Fahrt");
            assertThat(rs.getString("about_text")).isEqualTo("Ueber uns");
            assertThat(rs.getString("review_status")).as("saved by hand before: no status").isNull();
            assertThat(rs.getString("source_hash")).isNull();

            ResultSet hl = c.createStatement().executeQuery(
                    "SELECT highlight FROM extra_translation_highlights " +
                    "WHERE extra_translation_id = '33333333-3333-3333-3333-333333333333'");
            assertThat(hl.next()).isTrue();
            assertThat(hl.getString("highlight")).isEqualTo("Sonnenuntergang");
        }
    }

    /** Row count of every public table except Flyway's own bookkeeping. */
    private java.util.Map<String, Long> rowCounts(Connection c) throws Exception {
        java.util.Map<String, Long> counts = new java.util.TreeMap<>();
        java.util.List<String> tables = new java.util.ArrayList<>();
        try (ResultSet rs = c.getMetaData().getTables(null, "public", "%", new String[]{"TABLE"})) {
            while (rs.next()) tables.add(rs.getString("TABLE_NAME"));
        }
        for (String table : tables) {
            if (table.equals("flyway_schema_history")) continue;
            try (ResultSet rs = c.createStatement().executeQuery("SELECT count(*) FROM \"" + table + "\"")) {
                rs.next();
                counts.put(table, rs.getLong(1));
            }
        }
        return counts;
    }

    private String columnType(Connection c, String table, String column) throws Exception {
        try (ResultSet rs = c.getMetaData().getColumns(null, "public", table, column)) {
            rs.next();
            return rs.getString("TYPE_NAME");
        }
    }

    @Test
    void everyMigrationFileValidatesCleanly() {
        DataSource ds = dataSource();
        Flyway flyway = flywayFor(ds);
        flyway.migrate();
        // Checksums, ordering, naming - throws if any migration file was edited
        // after being applied or is otherwise malformed.
        flyway.validate();
    }

    private Set<String> publicTables(DataSource ds) throws Exception {
        Set<String> names = new HashSet<>();
        try (Connection c = ds.getConnection();
             ResultSet rs = c.getMetaData().getTables(null, "public", "%", new String[]{"TABLE"})) {
            while (rs.next()) {
                names.add(rs.getString("TABLE_NAME"));
            }
        }
        return names;
    }
}
