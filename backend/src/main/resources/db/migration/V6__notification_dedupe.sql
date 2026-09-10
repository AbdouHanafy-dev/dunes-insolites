-- V6__notification_dedupe.sql
-- Engineering-quality pass: durable idempotency for the notification consumer.
--
-- A NotificationMessage now carries a `dedupeKey` (a UUID set by
-- NotificationPublisher, one per publish). The consumer fans a message out to
-- N recipient rows; each row records that key. The partial unique index below
-- is the real guarantee: a redelivery of an already-processed message — broker
-- replay after an ack timeout, a concurrent duplicate, a DLQ replay, a consumer
-- restart mid-batch — cannot create a second row for the same (user, message).
--
-- Additive and safe on the existing table: the column is nullable, and the
-- index is WHERE dedupe_key IS NOT NULL, so every historical row and any
-- message published without a key is unaffected.

ALTER TABLE notifications ADD COLUMN dedupe_key varchar(64);

CREATE UNIQUE INDEX ux_notifications_user_dedupe
    ON notifications (user_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL;
