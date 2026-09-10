package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.ReservationStatusException;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Set;

import static com.camping.duneinsolite.model.enums.ReservationStatus.*;
import static org.assertj.core.api.Assertions.*;

/**
 * The complete reservation state-transition matrix. Every (from, to) pair in the
 * 7×7 grid is covered — the allowed ones by {@link #allowed}, the rest by
 * {@link #everyOtherPairIsForbidden}.
 */
class ReservationStateMachineTest {

    private final ReservationStateMachine sm = new ReservationStateMachine();

    // ── the 8 allowed transitions ──────────────────────────────────────
    @ParameterizedTest(name = "{0} -> {1} is allowed")
    @CsvSource({
            "PENDING,   CONFIRMED",
            "PENDING,   REJECTED",
            "PENDING,   CANCELLED",
            "PENDING,   EXPIRED",
            "CONFIRMED, CHECKED_IN",
            "CONFIRMED, COMPLETED",
            "CONFIRMED, CANCELLED",
            "CHECKED_IN, COMPLETED",
    })
    void allowed(ReservationStatus from, ReservationStatus to) {
        assertThat(sm.isAllowed(from, to)).isTrue();
        assertThatCode(() -> sm.assertAllowed(from, to)).doesNotThrowAnyException();
    }

    // ── the specific invalid transitions the brief calls out ───────────
    @ParameterizedTest(name = "{0} -> {1} is forbidden")
    @CsvSource({
            "PENDING,    COMPLETED",
            "PENDING,    CHECKED_IN",
            "EXPIRED,    CONFIRMED",
            "CANCELLED,  CHECKED_IN",
            "COMPLETED,  CANCELLED",
            "REJECTED,   CONFIRMED",
            "CHECKED_IN, CONFIRMED",
            "CHECKED_IN, PENDING",
            "CONFIRMED,  REJECTED",
            "CONFIRMED,  PENDING",
            "COMPLETED,  CHECKED_IN",
    })
    void forbidden(ReservationStatus from, ReservationStatus to) {
        assertThat(sm.isAllowed(from, to)).isFalse();
        assertThatThrownBy(() -> sm.assertAllowed(from, to))
                .isInstanceOf(ReservationStatusException.class);
    }

    @ParameterizedTest
    @CsvSource({"PENDING", "CONFIRMED", "CHECKED_IN", "CANCELLED", "REJECTED", "COMPLETED", "EXPIRED"})
    void noOpSelfTransitionIsRejected(ReservationStatus s) {
        assertThat(sm.isAllowed(s, s)).isFalse();
        assertThatThrownBy(() -> sm.assertAllowed(s, s))
                .isInstanceOf(ReservationStatusException.class)
                .hasMessageContaining("already");
    }

    @Test
    void terminalStatesHaveNoOutgoingTransitions() {
        for (ReservationStatus t : ReservationStateMachine.TERMINAL) {
            assertThat(sm.allowedFrom(t)).isEmpty();
        }
        assertThat(ReservationStateMachine.TERMINAL)
                .containsExactlyInAnyOrder(CANCELLED, REJECTED, COMPLETED, EXPIRED);
    }

    @Test
    void everyOtherPairIsForbidden() {
        Set<String> allowed = Set.of(
                "PENDING-CONFIRMED", "PENDING-REJECTED", "PENDING-CANCELLED", "PENDING-EXPIRED",
                "CONFIRMED-CHECKED_IN", "CONFIRMED-COMPLETED", "CONFIRMED-CANCELLED",
                "CHECKED_IN-COMPLETED");
        for (ReservationStatus from : ReservationStatus.values()) {
            for (ReservationStatus to : ReservationStatus.values()) {
                boolean expected = allowed.contains(from + "-" + to);
                assertThat(sm.isAllowed(from, to))
                        .as("%s -> %s", from, to)
                        .isEqualTo(expected);
            }
        }
    }

    @Test
    void nullsAreNeverAllowed() {
        assertThat(sm.isAllowed(null, CONFIRMED)).isFalse();
        assertThat(sm.isAllowed(PENDING, null)).isFalse();
        assertThat(sm.isAllowed(null, null)).isFalse();
    }

    @Test
    void theLinearHappyPathIsWalkable() {
        assertThat(sm.isAllowed(PENDING, CONFIRMED)).isTrue();
        assertThat(sm.isAllowed(CONFIRMED, CHECKED_IN)).isTrue();
        assertThat(sm.isAllowed(CHECKED_IN, COMPLETED)).isTrue();
    }
}
