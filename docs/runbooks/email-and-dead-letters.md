# Runbook — transactional email & the dead-letter queue

**Status:** built in production-hardening item 2 (2 Sep 2026). Replaces the prior
fire-and-forget path where a failed confirmation email was lost silently.

---

## How it works now

```
Reservation created
  -> NotificationPublisher.publish("reservation.created", msg)   [stamps x-correlation-id]
  -> notification.exchange (topic)
       |-- notification.queue  -> NotificationConsumer (staff SSE + bell)
       |-- email.queue         -> ReservationEmailConsumer
                                     - claims email_dispatch(reservation_id, RESERVATION_RECEIVED)
                                     - already SENT?  -> skip (idempotent), ack
                                     - sends synchronously on the listener thread
                                     - success -> mark SENT, ack
                                     - failure -> mark FAILED, throw
                                                  -> retry (app.email.retry.*, default 4 attempts)
                                                  -> exhausted -> RejectAndDontRequeue
                                                     -> email.queue x-dead-letter-exchange
                                                     -> notification.dlq
                                                     -> DeadLetterConsumer records a
                                                        dead_letter_message row, THEN acks
```

The message is never acked before the email actually succeeds (or is a proven
duplicate).

## Tables

| Table | Purpose |
|---|---|
| `email_dispatch` | idempotency + audit: one row per `(reservation_id, email_type)`, `status` PENDING/SENT/FAILED, `attempts`, `last_error` |
| `dead_letter_message` | every message that exhausted retries: original exchange/routing-key/queue, raw payload, `x-death` metadata, `failure_reason`, `status` UNRESOLVED/REPLAYED/DISCARDED |

## Metrics (Prometheus, `/actuator/prometheus`)

```
email_dispatch_total{result="sent|failed|skipped_duplicate"}
email_dead_letter_total{action="recorded|replayed|discarded"}
```

**Alert on:** `increase(email_dead_letter_total{action="recorded"}[15m]) > 0`
and any sustained `email_dispatch_total{result="failed"}` rate.

## Operating the dead-letter queue (ADMIN only)

```
GET  /api/admin/ops/dead-letters?status=UNRESOLVED     list (metadata only - no payload / recipient)
GET  /api/admin/ops/dead-letters/{id}                  one record
POST /api/admin/ops/dead-letters/{id}/replay           re-publish to the ORIGINAL queue, mark REPLAYED
POST /api/admin/ops/dead-letters/{id}/discard          mark DISCARDED (no republish)
```

Replay is one-way from `UNRESOLVED` - replaying an already-resolved record is a
409, so a double-click can't double-send. Replay targets the specific origin
queue via the default exchange, so only the consumer that failed reprocesses
(not every consumer bound to `reservation.created`).

### Typical incident: SMTP credential expired

1. Alert fires: `email_dead_letter_total{action="recorded"}` climbing.
2. Fix the credential (`SPRING_MAIL_PASSWORD`), restart / roll the backend.
3. `GET /api/admin/ops/dead-letters?status=UNRESOLVED` - review the backlog.
4. `POST .../{id}/replay` for each (or script it). Each replay re-runs the
   idempotent consumer: `email_dispatch` moves FAILED -> SENT.
5. Confirm `dead_letter_message` rows are all REPLAYED and `email_dispatch`
   has no FAILED rows left.

## Config knobs

```
app.email.retry.max-attempts       (APP_EMAIL_RETRY_MAX_ATTEMPTS)   default 4
app.email.retry.initial-interval-ms (APP_EMAIL_RETRY_INITIAL_MS)     default 2000
app.email.retry.multiplier          (APP_EMAIL_RETRY_MULTIPLIER)     default 2.0
app.email.retry.max-interval-ms     (APP_EMAIL_RETRY_MAX_MS)         default 15000
```

## Known follow-ups

- `NotificationConsumer` (staff SSE) still catches-and-nacks rather than
  throwing, so it does not retry - but its failures now dead-letter to the same
  queue and are recorded, so they are no longer invisible. Lower stakes than
  customer email; align it with the email consumer's pattern in a later pass.
- `dead_letter_message` records reference a reservation but cannot be
  company-scoped until `Reservation.companyType` exists (tracked debt #4-7).
