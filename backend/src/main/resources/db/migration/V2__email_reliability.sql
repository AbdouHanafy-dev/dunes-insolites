-- V2__email_reliability.sql
-- Production-hardening item 2: make transactional email delivery recoverable.
--
--   email_dispatch      - one row per (reservation, email type). The idempotency
--                         key for the confirmation-email consumer: a duplicate
--                         RabbitMQ delivery finds an existing SENT row and skips.
--   dead_letter_message - a durable operational record of every message that
--                         exhausted its retries and hit notification.dlq, so it
--                         can be inspected and replayed by an admin.

CREATE TABLE email_dispatch (
    id              uuid NOT NULL,
    reservation_id  uuid,
    email_type      varchar(64) NOT NULL,
    recipient       varchar(320) NOT NULL,
    status          varchar(16) NOT NULL,
    attempts        integer NOT NULL DEFAULT 0,
    last_error      text,
    correlation_id  varchar(64),
    created_at      timestamp(6) without time zone NOT NULL,
    updated_at      timestamp(6) without time zone NOT NULL,
    sent_at         timestamp(6) without time zone,
    CONSTRAINT email_dispatch_pkey PRIMARY KEY (id),
    CONSTRAINT email_dispatch_status_check
        CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    CONSTRAINT email_dispatch_reservation_type_uk
        UNIQUE (reservation_id, email_type)
);

CREATE TABLE dead_letter_message (
    id                    uuid NOT NULL,
    original_exchange     varchar(255),
    original_routing_key  varchar(255),
    queue_name            varchar(255),
    amqp_message_id       varchar(255),
    correlation_id        varchar(64),
    reservation_id        uuid,
    message_type          varchar(64),
    payload               text NOT NULL,
    headers               text,
    failure_reason        text,
    death_count           integer NOT NULL DEFAULT 1,
    first_failed_at       timestamp(6) without time zone,
    recorded_at           timestamp(6) without time zone NOT NULL,
    status                varchar(16) NOT NULL,
    replayed_at           timestamp(6) without time zone,
    replayed_by           varchar(255),
    CONSTRAINT dead_letter_message_pkey PRIMARY KEY (id),
    CONSTRAINT dead_letter_message_status_check
        CHECK (status IN ('UNRESOLVED', 'REPLAYED', 'DISCARDED'))
);

-- The DLQ consumer dedups redeliveries of the same still-unresolved failure on
-- this fingerprint (a dead-lettered message often carries no amqp_message_id).
CREATE UNIQUE INDEX dead_letter_message_open_fingerprint_uk
    ON dead_letter_message (queue_name, md5(payload))
    WHERE status = 'UNRESOLVED';

CREATE INDEX dead_letter_message_status_idx ON dead_letter_message (status, recorded_at);
CREATE INDEX email_dispatch_status_idx ON email_dispatch (status);
