# Runbook — VPS security hardening (79.143.185.33)

**Applied 10 Sep 2026** during the Part-A deployment. The live nginx / fail2ban
config is mirrored in [`nginx/vps/`](../../nginx/vps/) for review — those files
are the source of truth for what's on the box under `/etc/nginx` and
`/etc/fail2ban/jail.d/`.

## Baseline (already in place before this pass)

- **UFW active** — only `22`, `80`, `443` open; default DROP
- **SSH key-only** — `PasswordAuthentication no` (`60-cloudimg-settings.conf`)
- `unattended-upgrades` active, 0 security updates pending
- Every app/monitoring container port bound to `127.0.0.1` (not `0.0.0.0`) — the
  Docker-bypasses-UFW class of issue does not apply
- Containers run as non-root (`spring` uid 101, `nextjs` uid 999)

## Applied this pass

| Item | Change |
|---|---|
| **fail2ban** | installed; jails `sshd` (aggressive, 4 tries → 1h ban), `nginx-http-auth`, `nginx-botsearch`. Confirmed banning live traffic. |
| **Keycloak admin surface** | `auth.dunesinsolites.com` nginx returns **404** for `^/admin`, `^/realms/master`, `^/metrics`. Only `/realms/duneinsolite/*` + login assets are public. Manage KC via `ssh -L 8280:127.0.0.1:8280`. |
| **RabbitMQ mgmt UI** | `mq.dunesinsolites.com` vhost **removed**. Access via `ssh -L 15682:127.0.0.1:15682`. |
| **SSH** | `PermitRootLogin prohibit-password` (`90-dunes-hardening.conf`) |
| **Security headers** | `snippets/dunes-security-headers.conf` (HSTS 1y, nosniff, SAMEORIGIN, referrer-policy) included on every app vhost |
| **Rate limiting** | `conf.d/dunes-ratelimit.conf` — `10r/m` on `POST /api/auth/login`, `30r/m` on `POST /api/public/{bookings,stay-bookings,contact,subscribe}`; `429` on exceed. Verified: brute-force → 429, real login unaffected. |
| **Upload size** | `client_max_body_size 10m` on `api` + `admin` vhosts (was default 1m → media upload would 413 before reaching the backend's own 8 MB check) |
| **File perms** | `.env.vps` `600` root; realm JSON `640` |
| **Old stack** | `duneinsolite-*` containers stopped (kept for rollback) |

## NOT done — needs a maintenance window / owner decision

| Item | Why deferred | Risk if left |
|---|---|---|
| **Keycloak `start-dev` → `start`** | Production mode needs `KC_HOSTNAME=https://auth.dunesinsolites.com` + proxy config exactly right; a mistake breaks all backoffice auth. Needs a tested maintenance window. | dev-mode caching, permissive hostname checks, the ugly `http://…:8180` token issuer. Not a direct vuln. |
| **App-level `RateLimitFilter`** | `POST /api/auth/login` was NOT throttled by the app (8 rapid 401s, no 429) — nginx now covers it, but the code filter should be fixed too | defence-in-depth gap; nginx limit is the current control |
| Duplicate headers | app sends `X-Frame-Options: DENY`, nginx adds `SAMEORIGIN` — browsers may ignore both. Pick one place. | cosmetic / clickjacking policy ambiguity |
| Full old-stack teardown | keep for rollback until Part B done + a few weeks stable | disk only; containers are stopped |
| Grafana default `admin/admin` | bound to 127.0.0.1, reachable only via tunnel or the (not-yet-TLS) `mon.` vhost | low while loopback-only; change on first login |

## Verify

```bash
ssh root@79.143.185.33 fail2ban-client status sshd
curl -sI https://api.dunesinsolites.com/api/public/stays | grep -i strict-transport
curl -s -o /dev/null -w '%{http_code}\n' https://auth.dunesinsolites.com/admin/   # -> 404
for i in $(seq 1 8); do curl -s -o /dev/null -w '%{http_code} ' -XPOST https://api.dunesinsolites.com/api/auth/login -d '{}'; done  # -> 429s
```
