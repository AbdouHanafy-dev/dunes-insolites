package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.ReservationStatusException;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import static com.camping.duneinsolite.model.enums.ReservationStatus.*;

/**
 * The one place the reservation lifecycle is written down.
 *
 * <pre>
 *   PENDING ──confirm──▶ CONFIRMED ──check-in──▶ CHECKED_IN ──complete──▶ COMPLETED (terminal)
 *      │                     │                                              ▲
 *      │                     └──────────────── complete ────────────────────┘
 *      ├── reject ──▶ REJECTED  (terminal)
 *      ├── cancel ──▶ CANCELLED (terminal)   (also allowed from CONFIRMED)
 *      └── hold expiry ──▶ EXPIRED (terminal, set by HoldExpiryJob)
 * </pre>
 *
 * <p>Per-transition effects (enforced in {@code ReservationServiceImpl.updateReservationStatus}
 * / the hold job — this class only gates the transition itself):
 *
 * <table>
 *   <tr><th>transition</th><th>authorization</th><th>inventory</th><th>payment</th><th>invoice</th><th>notification</th></tr>
 *   <tr><td>PENDING→CONFIRMED</td><td>ADMIN/CAMPING</td><td>re-checked, hold cleared</td><td>—</td><td>PROFORMA generated</td><td>client + CAMPING</td></tr>
 *   <tr><td>PENDING→REJECTED</td><td>ADMIN/CAMPING</td><td>released</td><td>—</td><td>—</td><td>client</td></tr>
 *   <tr><td>PENDING→CANCELLED</td><td>ADMIN/CAMPING, or the OWNER ≥48h before service</td><td>released</td><td>—</td><td>—</td><td>—</td></tr>
 *   <tr><td>PENDING→EXPIRED</td><td>system ({@code HoldExpiryJob}) only</td><td>released</td><td>—</td><td>—</td><td>—</td></tr>
 *   <tr><td>CONFIRMED→CHECKED_IN</td><td>ADMIN/CAMPING</td><td>occupied</td><td>—</td><td>—</td><td>—</td></tr>
 *   <tr><td>CONFIRMED→COMPLETED</td><td>ADMIN/CAMPING</td><td>released</td><td>—</td><td>FACTURE if companyType given</td><td>client</td></tr>
 *   <tr><td>CONFIRMED→CANCELLED</td><td>ADMIN/CAMPING, or the OWNER ≥48h before service</td><td>released</td><td>—</td><td>—</td><td>—</td></tr>
 *   <tr><td>CHECKED_IN→COMPLETED</td><td>ADMIN/CAMPING</td><td>released</td><td>—</td><td>FACTURE if companyType given</td><td>client</td></tr>
 * </table>
 *
 * <p><b>Deliberately forbidden</b> (some were <em>permitted</em> by the old inline
 * checks and are tightened here — see {@code docs/adr/0003-reservation-state-machine.md}):
 * anything out of a terminal state; {@code PENDING→CHECKED_IN} / {@code PENDING→COMPLETED}
 * (you confirm before check-in / completion); {@code CONFIRMED→REJECTED}
 * (a confirmed booking is cancelled, not rejected); {@code EXPIRED→*}; and every
 * no-op self-transition {@code X→X} (which used to re-run CONFIRMED's side effects
 * and mint a second proforma on a double-click).
 */
@Component
public class ReservationStateMachine {

    /** Terminal states — no transition leaves them. */
    public static final Set<ReservationStatus> TERMINAL = EnumSet.of(CANCELLED, REJECTED, COMPLETED, EXPIRED);

    private static final Map<ReservationStatus, Set<ReservationStatus>> ALLOWED = new EnumMap<>(ReservationStatus.class);
    static {
        ALLOWED.put(PENDING, EnumSet.of(CONFIRMED, REJECTED, CANCELLED, EXPIRED));
        ALLOWED.put(CONFIRMED, EnumSet.of(CHECKED_IN, COMPLETED, CANCELLED));
        ALLOWED.put(CHECKED_IN, EnumSet.of(COMPLETED));
        ALLOWED.put(CANCELLED, EnumSet.noneOf(ReservationStatus.class));
        ALLOWED.put(REJECTED, EnumSet.noneOf(ReservationStatus.class));
        ALLOWED.put(COMPLETED, EnumSet.noneOf(ReservationStatus.class));
        ALLOWED.put(EXPIRED, EnumSet.noneOf(ReservationStatus.class));
    }

    public boolean isAllowed(ReservationStatus from, ReservationStatus to) {
        if (from == null || to == null || from == to) return false;
        return ALLOWED.getOrDefault(from, EnumSet.noneOf(ReservationStatus.class)).contains(to);
    }

    public Set<ReservationStatus> allowedFrom(ReservationStatus from) {
        return EnumSet.copyOf(ALLOWED.getOrDefault(from, EnumSet.noneOf(ReservationStatus.class)));
    }

    /** Throws {@link ReservationStatusException} (→ HTTP 422) if the move is not allowed. */
    public void assertAllowed(ReservationStatus from, ReservationStatus to) {
        if (isAllowed(from, to)) return;

        String reason;
        if (from == to) {
            reason = "This reservation is already " + human(to) + ".";
        } else if (TERMINAL.contains(from)) {
            reason = "This reservation is " + human(from) + " and cannot be modified.";
        } else if (from == CHECKED_IN) {
            reason = "A checked-in reservation can only be marked as completed.";
        } else if (from == CONFIRMED && to == REJECTED) {
            reason = "A confirmed reservation cannot be rejected — cancel it instead.";
        } else if (from == PENDING && (to == CHECKED_IN || to == COMPLETED)) {
            reason = "A reservation must be confirmed before it can be " + human(to) + ".";
        } else if (to == EXPIRED) {
            reason = "EXPIRED is set only by the hold-expiry job, never by a request.";
        } else {
            reason = "A reservation cannot move from " + human(from) + " to " + human(to) + ".";
        }
        throw new ReservationStatusException(reason);
    }

    private static String human(ReservationStatus s) {
        return switch (s) {
            case PENDING -> "pending";
            case CONFIRMED -> "confirmed";
            case CHECKED_IN -> "checked in";
            case CANCELLED -> "cancelled";
            case REJECTED -> "rejected";
            case COMPLETED -> "completed";
            case EXPIRED -> "expired";
        };
    }
}
