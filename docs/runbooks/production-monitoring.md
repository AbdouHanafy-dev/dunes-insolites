# Runbook — production monitoring

**Status:** the stack is **built, committed, and proven locally** (Prometheus
scraping real backend metrics, 11 alert rules loaded, an alert delivered through
Alertmanager to a receiver, a Grafana dashboard). What remains for production is
infra: run it on the internal network, put a real receiver (Slack/PagerDuty)
behind Alertmanager, and put Grafana behind auth. Until that is done, treat
"production is monitored" as **not true**.

## What exists

| File | Purpose |
|---|---|
| `backend/docker-compose.observability.yml` | Prometheus + Alertmanager + blackbox-exporter + Grafana + a dev alert-sink |
| `backend/observability/prometheus.yml` | scrape config — backend metrics + a black-box readiness probe |
| `backend/observability/alert-rules.yml` | the alerts below, as PromQL |
| `backend/observability/alertmanager.yml` | routing; **placeholder receiver — replace before go-live** |
| `backend/observability/blackbox.yml` | `http_2xx` probe module |
| `backend/observability/grafana/` | datasource + dashboard provisioning (`dunes-overview.json`) |

## The private management port

The backend exposes `/actuator/prometheus` and `/actuator/metrics` **ADMIN-only**
on the main port. Set the env var **`MANAGEMENT_SERVER_PORT`** (e.g. `9099`) and
Spring Boot serves the whole actuator surface **only** on that port; the main
port returns 404 for `/actuator/**`. `SecurityConfig.actuatorSecurityFilterChain`
then permits the scrape with no JWT — **safe only because that port is bound to
the internal network and never published to the internet / Cloudflare.** On a
bare host also set `MANAGEMENT_SERVER_ADDRESS=127.0.0.1`.

`application-local.yml` sets `management.server.port: 9099` for local dev.

## Bring it up (local / staging)

```bash
# backend running with the local profile (management port 9099)
cd backend
docker compose -f docker-compose.observability.yml up -d
```

- Prometheus  http://localhost:9090   (Status → Targets: all `up`)
- Alertmanager http://localhost:9093
- Grafana     http://localhost:3300   (admin/admin) → dashboard "Dunes Insolites — service overview"

## Alerts (`alert-rules.yml`)

| Alert | Expr (summary) | Severity |
|---|---|---|
| `BackendMetricsUnreachable` | `up{job="dunes-backend"} == 0` for 2m | critical |
| `ApiNotReady` | `probe_success{job="dunes-readiness"} == 0` for 2m | critical |
| `ReadinessProbeHttpError` | readiness HTTP ≠ 200 for 3m | warning |
| `EmailDeadLettering` | `increase(email_dead_letter_total{action="recorded"}[15m]) > 0` | critical |
| `EmailFailureRate` | `rate(email_dispatch_total{result="failed"}[10m]) > 0` for 10m | warning |
| `NotificationDlqBacklog` | `rabbitmq_queue_messages{queue=~".*dlq"} > 0` for 10m | warning |
| `High5xxRate` | 5xx ratio > 2% for 5m | critical |
| `BookingEndpointErrors` | 5xx on `/api/public/*bookings*` for 5m | critical |
| `JvmHeapPressure` | heap used/max > 0.9 for 10m | warning |
| `BackupStale` | `time() - dunes_backup_last_success_timestamp_seconds > 36h` | critical |
| `OffsiteCopyFailing` | `increase(dunes_backup_offsite_failure_total[1h]) > 0` | critical |

The last two need the backup host to publish two metrics (a
`node_exporter` textfile or a Pushgateway push from `db-backup.sh`) — see
`offsite-backup-setup.md` step 6.

## Local proof (4 Sep 2026)

- `curl :9099/actuator/prometheus` → 200 (no JWT); `:8099/actuator/health` → 404
  (moved off the public port); `:8099/api/*` unaffected.
- Prometheus `Status → Targets`: `dunes-backend`, `dunes-readiness`,
  `prometheus` all **up**; `http_server_requests_seconds_count` series present.
- `curl -XPOST :9093/api/v2/alerts` with a synthetic alert → Alertmanager shows
  it `active` → the `alert-sink` container logged the firing payload
  (`send_resolved` included). End-to-end pipeline confirmed.
- `GET :3300/api/health` → `{"database":"ok"}`, dashboard provisioned.

## Evidence to close the "monitoring" launch item

- [ ] stack running on the internal network in staging/prod (not a laptop)
- [ ] `MANAGEMENT_SERVER_PORT` set; the port is confirmed **not** reachable from the internet (`curl` from outside → refused/filtered)
- [ ] Alertmanager receiver replaced with a real channel; a test alert delivered to it (screenshot / message link)
- [ ] Grafana behind auth (admin-app SSO or a proxy), default password changed
- [ ] `BackupStale` / `OffsiteCopyFailing` wired to real metrics from the backup host
- [ ] one real alert fired and acknowledged during a game-day (kill the backend, watch `ApiNotReady` fire and resolve)
