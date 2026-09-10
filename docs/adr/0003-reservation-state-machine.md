# ADR-0003 — Explicit reservation state machine

**Status:** Accepted · implemented
**Date:** 3 September 2026
**Supersedes:** the four inline `if` guards at the top of
`ReservationServiceImpl.updateReservationStatus`.

---

## Decision

Move the reservation lifecycle into one class, `ReservationStateMachine`, with an
explicit allowed-transition table and a full 7×7 test matrix
(`ReservationStateMachineTest`, 30 cases).

```
PENDING ──confirm──▶ CONFIRMED ──check-in──▶ CHECKED_IN ──complete──▶ COMPLETED (terminal)
   │                     │                                              ▲
   │                     └──────────────── complete ────────────────────┘
   ├── reject ──▶ REJECTED  (terminal)
   ├── cancel ──▶ CANCELLED (terminal)   (also from CONFIRMED)
   └── hold expiry ──▶ EXPIRED (terminal, HoldExpiryJob only)
```

| from | allowed to |
|---|---|
| PENDING | CONFIRMED, REJECTED, CANCELLED, EXPIRED |
| CONFIRMED | CHECKED_IN, COMPLETED, CANCELLED |
| CHECKED_IN | COMPLETED |
| CANCELLED / REJECTED / COMPLETED / EXPIRED | — (terminal) |

## What changed vs the old inline checks

The old code only rejected: any transition **out of** COMPLETED / CANCELLED /
REJECTED, and CHECKED_IN → anything-but-COMPLETED. Everything else was permitted.
The new table additionally forbids:

| newly forbidden | why |
|---|---|
| `X → X` (no-op self-transition) | a double-confirm click re-ran the CONFIRMED branch and **minted a second PROFORMA invoice**. Now a 422. |
| `PENDING → CHECKED_IN`, `PENDING → COMPLETED` | a guest is confirmed before they can be checked in or completed — no business process skips confirmation. |
| `CONFIRMED → REJECTED` | a confirmed booking is **cancelled**, not rejected (rejection is for a pending request). |
| `EXPIRED → *` | `EXPIRED` is terminal; only `HoldExpiryJob` sets it (via a bulk `UPDATE`, not this method), so a request can never move a reservation into or out of it. |
| `CONFIRMED → PENDING`, `CHECKED_IN → CONFIRMED`, … | no backward steps. |

These are **tightenings of a permissive gate**, each with a regression test.
Behaviour that was already correct is unchanged — the happy path
(PENDING→CONFIRMED→CHECKED_IN→COMPLETED), cancellation from PENDING or CONFIRMED,
rejection from PENDING, and the owner-cancel-within-48h rule all still work
exactly as before.

**If the backoffice turns out to need one of the newly-forbidden paths** (e.g.
an admin "quick complete" that skips confirm), it is one line in
`ReservationStateMachine.ALLOWED` plus a test — a deliberate decision, not an
accident. Confirm with the business before adding it.

## Per-transition effects

The state machine gates only the transition. The *effects* stay in
`updateReservationStatus` / `HoldExpiryJob` and are documented in the
`ReservationStateMachine` javadoc table: which transitions re-check inventory,
clear the hold, generate a PROFORMA / FACTURE, and which notifications fire.

## Not in scope

`updateReservation` (the content edit, not the status change) has its own
status guard (`CHECKED_IN`/`COMPLETED`/`CANCELLED` → no edit) — left as-is; it is
not a lifecycle transition.
