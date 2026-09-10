# Runbook — observability

Built in production-hardening item 5. Baseline only — useful signals over a
dashboard full of noise.

## Endpoints (`/actuator`, on the app port)

| Endpoint | Auth | Purpose |
|---|---|---|
| `/actuator/health` | public | `{"status":"UP\|DOWN"}` only — **no component detail** unauthenticated (`show-details: when-authorized`) |
| `/actuator/health/liveness` | public | process is alive — restart if DOWN |
| `/actuator/health/readiness` | public | alive **and** `db` + `rabbit` reachable — pull from load balancer if DOWN |
| `/actuator/health` (as ADMIN) | ADMIN | full per-component breakdown |
| `/actuator/metrics`, `/actuator/prometheus` | ADMIN | metrics; Prometheus scrape format |
| `/actuator/info` | ADMIN | build / java / os (no env, no config) |

Nothing that dumps environment, configuration, heap or threads is exposed.

**Readiness is dependency-aware on purpose.** A pod whose database or RabbitMQ
connection is down reports `readiness: DOWN` and should be removed from rotation
even though the JVM is fine — it cannot serve a booking.

## Logs

- Correlation id on every line: `%X{correlationId}` in the log pattern. The id
  is read from / minted into the `X-Correlation-Id` request header
  (`CorrelationIdFilter`), threaded onto RabbitMQ messages, and echoed on the
  response. One trip through HTTP → booking → queue → email → DLQ → replay
  shares one id.
- Set `LOG_FORMAT=ecs` on production for structured JSON logs (MDC fields
  included) that a log aggregator can index.
- `BusinessException` → WARN (expected). Anything reaching the catch-all
  handler → ERROR with stack trace (a real defect).

## Metrics worth alerting on

| Alert | Condition | Why |
|---|---|---|
| **API unavailable** | `/actuator/health/readiness` DOWN > 2 min | can't take bookings |
| **DB unavailable** | health component `db` DOWN | total outage |
| **RabbitMQ unavailable** | health component `rabbit` DOWN | notifications + confirmation emails stop |
| **Email dead-lettering** | `increase(email_dead_letter_total{action="recorded"}[15m]) > 0` | confirmation emails are failing — see `email-and-dead-letters.md` |
| **Email failure rate** | sustained `rate(email_dispatch_total{result="failed"}[10m]) > 0` | SMTP degraded |
| **High 5xx rate** | `rate(http_server_requests_seconds_count{status=~"5.."}[5m])` above baseline | a defect in production |
| **Booking errors** | 5xx on `POST /api/public/*bookings` | guests can't book |
| **JVM heap** | `jvm_memory_used_bytes / jvm_memory_max_bytes{area="heap"} > 0.9` for 10 min | leak / undersized |

## Monitoring stack — built (4 Sep 2026)

`backend/docker-compose.observability.yml` + `backend/observability/*` now
provide Prometheus + Alertmanager + blackbox-exporter + Grafana with the 11
alerts above as PromQL. Proven locally: real backend metrics scraped on the
private `MANAGEMENT_SERVER_PORT` (9099), an alert delivered through Alertmanager
to a receiver, dashboard provisioned. Full runbook + go-live checklist:
**`docs/runbooks/production-monitoring.md`**.

## Not yet done (follow-ups)

- The stack has not run anywhere but a laptop; the Alertmanager receiver is a
  placeholder (no real Slack/PagerDuty), Grafana is not behind auth.
- No distributed tracing (single service today; revisit if a second service or
  the SSE proxy lands).
- Consider a dedicated `management.server.port` bound to 127.0.0.1 so the
  Prometheus scraper needs no JWT.
