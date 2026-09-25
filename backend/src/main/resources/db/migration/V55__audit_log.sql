-- Who changed or deleted what, and when.
--
-- One row per authenticated request that writes (POST / PUT / PATCH / DELETE), recorded
-- by AuditLogFilter after the response is known. No request body is stored: bodies carry
-- customer details and credentials, and the log must never become a second copy of them.
-- entity_label is the record's name AT THE TIME of an update or delete, so a deleted
-- circuit is still identifiable afterwards.
CREATE TABLE audit_log (
    id            UUID PRIMARY KEY,
    occurred_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actor_id      VARCHAR(64),
    actor_email   VARCHAR(255),
    actor_name    VARCHAR(255),
    actor_roles   VARCHAR(255),
    action        VARCHAR(20)  NOT NULL,
    verb          VARCHAR(80),
    method        VARCHAR(8)   NOT NULL,
    path          VARCHAR(500) NOT NULL,
    entity_type   VARCHAR(80),
    entity_id     VARCHAR(64),
    entity_label  VARCHAR(255),
    status_code   INTEGER      NOT NULL,
    ip            VARCHAR(64),
    user_agent    VARCHAR(300),
    correlation_id VARCHAR(64)
);

CREATE INDEX idx_audit_log_occurred_at ON audit_log (occurred_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log (actor_id);
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);
