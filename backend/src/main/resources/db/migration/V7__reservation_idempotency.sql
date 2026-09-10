-- V7__reservation_idempotency.sql
-- Engineering-quality pass: make public booking creation safe against a
-- client network retry.
--
-- The vitrine sends an `idempotencyKey` (one UUID per booking attempt, re-used
-- on retry). createReservation short-circuits to the existing reservation if the
-- key is already recorded; the partial unique index below is the atomic
-- guarantee under a concurrent double-submit — the second INSERT fails, the
-- service catches it and returns the first reservation.
--
-- Additive: the column is nullable (staff-created and legacy reservations have
-- no key) and the index is WHERE idempotency_key IS NOT NULL, so nothing
-- existing is affected. Soft-deleted rows keep the key but the entity's
-- deleted_at filter excludes them, so a retry after a deletion creates a fresh
-- reservation — which is the correct behaviour.

ALTER TABLE reservations ADD COLUMN idempotency_key varchar(64);

CREATE UNIQUE INDEX ux_reservations_idempotency_key
    ON reservations (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
