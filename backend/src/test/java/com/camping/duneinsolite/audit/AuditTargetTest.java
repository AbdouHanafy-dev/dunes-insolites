package com.camping.duneinsolite.audit;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuditTargetTest {

    private static final String ID = "e4650de2-cd5b-4785-90f4-c885f0a1a9dc";

    @Test
    void deleteOfARecord_isADeleteWithItsTypeAndId() {
        AuditTarget t = AuditTarget.of("DELETE", "/api/tours/" + ID).orElseThrow();
        assertThat(t.action()).isEqualTo("DELETE");
        assertThat(t.entityType()).isEqualTo("tours");
        assertThat(t.entityId()).isEqualTo(ID);
        assertThat(t.verb()).isNull();
    }

    @Test
    void putIsAnUpdate_postToTheCollectionIsACreate() {
        assertThat(AuditTarget.of("PUT", "/api/tour-types/" + ID).orElseThrow().action()).isEqualTo("UPDATE");
        assertThat(AuditTarget.of("PATCH", "/api/tours/" + ID).orElseThrow().action()).isEqualTo("UPDATE");
        AuditTarget created = AuditTarget.of("POST", "/api/tours").orElseThrow();
        assertThat(created.action()).isEqualTo("CREATE");
        assertThat(created.entityId()).isNull();
    }

    @Test
    void postOnASubPathOfARecord_isAnActionNamedByThatPath() {
        AuditTarget t = AuditTarget.of("POST", "/api/tours/" + ID + "/approve").orElseThrow();
        assertThat(t.action()).isEqualTo("ACTION");
        assertThat(t.verb()).isEqualTo("approve");
        assertThat(t.entityId()).isEqualTo(ID);
    }

    @Test
    void deletingASubRecord_staysADeleteAndKeepsTheParentId() {
        AuditTarget t = AuditTarget.of("DELETE", "/api/reservations/" + ID + "/extras/" + ID).orElseThrow();
        assertThat(t.action()).isEqualTo("DELETE");
        assertThat(t.entityType()).isEqualTo("reservations");
        assertThat(t.verb()).isEqualTo("extras");
    }

    @Test
    void adminPathsUseTheTwoSegmentsAsTheType() {
        AuditTarget t = AuditTarget.of("PUT", "/api/admin/role-permissions").orElseThrow();
        assertThat(t.entityType()).isEqualTo("admin/role-permissions");
    }

    @Test
    void trailingSlashIsIgnored() {
        assertThat(AuditTarget.of("DELETE", "/api/tours/" + ID + "/").orElseThrow().entityId()).isEqualTo(ID);
    }

    @Test
    void readsAndNoiseAreNotAudited() {
        assertThat(AuditTarget.of("GET", "/api/tours")).isEmpty();
        assertThat(AuditTarget.of("HEAD", "/api/tours")).isEmpty();
        assertThat(AuditTarget.of("POST", "/api/auth/login")).isEmpty();
        assertThat(AuditTarget.of("POST", "/api/public/tour-bookings")).isEmpty();
        assertThat(AuditTarget.of("PUT", "/api/notifications/" + ID + "/read")).isEmpty();
        assertThat(AuditTarget.of("POST", "/api/favorites")).isEmpty();
        assertThat(AuditTarget.of("POST", "/actuator/health")).isEmpty();
        assertThat(AuditTarget.of("GET", "/api/admin/audit-log")).isEmpty();
    }
}
