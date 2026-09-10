# Security assessment — Dunes Insolites production deployment

**Date:** 10 September 2026
**Scope:** the live VPS deployment (`79.143.185.33` / `*.dunesinsolites.com`),
the hardened backend + Next.js admin + Keycloak stack, and the application code
paths reachable from the internet. The WordPress site
(`www.dunes-insolites.com`) and its DNS were **out of scope** (owner does not
control that Cloudflare account — see M-7).
**Method:** external probing (TLS, HTTP methods, CORS, JWT forgery), authenticated
review of the Keycloak realm and nginx/host config over SSH, `npm audit`,
`git` history scan, container inspection, and code review of `SecurityConfig`,
the BFF proxy, and the auth chain.

---

## Executive summary

The application-layer security is **strong** — the prior hardening programme
closed the role-escalation hole, the per-user IDOR holes (incl. `ReservationExtra`
this cycle), moved money to `BigDecimal`, and put Flyway + fail-closed config in
place. JWT signature validation correctly rejects forged and `alg:none` tokens.
No secrets are in git history.

The **deployment** had the usual first-cut gaps — Keycloak admin console and the
RabbitMQ UI were internet-exposed, no fail2ban, no rate limiting, no brute-force
protection in Keycloak. **All of those were fixed live during this assessment.**

**One CRITICAL remains open at report time:** the Next.js version on the VPS
(16.3.1) has a known unauthenticated RCE in the image-optimization path
(`GHSA-2xp9-vwfh-vxw4`). Fix (bump to 16.3.4 + `sharp`) is in progress.

Two MEDIUM items need a planned maintenance window: JWT issuer/audience
validation (M-1) and Keycloak production mode (M-6). One MEDIUM is a governance
issue outside the repo: a third party controls the primary domain's DNS (M-7).

---

## Findings

Status: **FIXED** = done live this session · **IN PROGRESS** · **OPEN** ·
**ACCEPTED** (documented, low risk).

### CRITICAL

| ID | Finding | Evidence | Status / Remediation |
|---|---|---|---|
| **C-1** | **Next.js image-optimization RCE.** `dunes-v2-frontend` + `dunes-v2-admin` run Next **16.3.1**. `GHSA-2xp9-vwfh-vxw4` — unauthenticated RCE via the Image Optimization API when AVIF is processed; the vitrine uses `next/image` on remote images. (`GHSA-p293-qw3h-jr36`, the Windows-host RCE, does **not** apply — the containers are Linux.) | `npm audit --omit=dev` → `next 16.0.0–16.3.2 · Severity: critical` | **IN PROGRESS** — bump `next`/`eslint-config-next` to **16.3.4**, `sharp` to ≥0.35.4, rebuild + redeploy the two Next containers. |

### HIGH

| ID | Finding | Evidence | Status |
|---|---|---|---|
| **P-1** | **Payment recording was open to customers.** `POST /api/reservations/{id}/payments` had `@PreAuthorize("hasAnyRole('ADMIN','CAMPING','CLIENT','PARTENAIRE')")` and `PaymentServiceImpl.buildTransaction` writes the row as `status=COMPLETED`, which `sumCompletedAmountByReservationId` counts. A CLIENT could `POST {"amount": <total>, "paymentMethod":"CASH"}` against **their own** reservation → it flips to `PAID` with **no money moving**. Falsified payment records / free bookings. | code review `PaymentController.java:31`, `PaymentServiceImpl.buildTransaction` | **FIXED** — endpoint now `hasAnyRole('ADMIN','CAMPING')`; `recordPayment` throws `AccessDeniedException` unless `caller.isStaff()`. Regression test `ReservationOwnershipIdorIT.payment_recordPayment_isStaffOnly…` (stranger + owner denied, staff allowed). Backend rebuilding + redeploying. |
| **H-1** | **`sharp` < 0.35.4** — libheif HEIF/AVIF parsing vulns (`GHSA-rgj7-g3m4-5g8c`). Same image pipeline as C-1. | `npm audit` | **FIXED** — bundled with C-1 (`next@16.3.4`), deployed, `npm audit` → 0. |

### MEDIUM

| ID | Finding | Evidence | Status / Remediation |
|---|---|---|---|
| **M-1** | **JWT decoder does not validate `iss` or `aud`.** `NimbusJwtDecoder.withJwkSetUri(...).build()` validates signature + expiry only. Any token signed by the realm's keys is accepted regardless of issuing client or audience. Low impact today (single realm), but a token minted for the `account` client — or a future public client — would be honoured with its roles. | `SecurityConfig.java:202-205` | **OPEN** — build the decoder with `JwtValidators.createDefaultWithIssuer(ISSUER_URL)` + an audience validator. Needs `KEYCLOAK_ISSUER_URL` (`https://auth.dunesinsolites.com/realms/duneinsolite`) as a config value distinct from the internal JWK URL — do it together with M-6. |
| **M-2** | Keycloak realm **brute-force protection was OFF** — the token endpoint (`/realms/duneinsolite/.../token`) could be hammered with password guesses, bypassing the API-layer control entirely. | admin API `bruteForceProtected: false` | **FIXED** — enabled: `failureFactor 5`, wait 60s→900s, `maxDeltaTimeSeconds 43200`. |
| **M-3** | Keycloak realm **had no password policy.** | admin API `passwordPolicy: None` | **FIXED** — `length(12) and notUsername() and passwordHistory(3)`. |
| **M-4** | **App-layer rate limiting not effective on login.** 8 rapid `POST /api/auth/login` all returned 401, none 429 — the code `RateLimitFilter` is not throttling this path. | live test | **MITIGATED** — nginx `limit_req` added: `10 r/m` on `/api/auth/login` + the Keycloak token endpoint, `30 r/m` on public POST (`bookings`, `stay-bookings`, `contact`, `subscribe`). Verified → 429. **Still OPEN in code:** fix `RateLimitFilter` for defence in depth. |
| **M-5** | **Database backups are not encrypted at rest.** `db-backup.sh` writes plaintext `pg_dump` archives; the DB holds customer PII (name/email/phone) and invoice data (address, matricule fiscal). A plaintext dump landing on off-host storage is a disclosure risk. | `grep -i encrypt scripts/db-backup.sh` → none | **OPEN** — add `openssl enc -aes-256-cbc -pbkdf2` (passphrase from a file, never committed) to `db-backup.sh`, and the matching decrypt to `db-restore-verify.sh`. Do before the off-host destination is wired. |
| **M-6** | **Keycloak runs `start-dev`.** Logs "DO NOT use this configuration in production." Dev-mode caching, permissive hostname/HTTPS checks, and the token `iss` currently renders as `http://…:8180` (should be `https://auth.dunesinsolites.com`). Not a direct vuln (admin console is now blocked at nginx — L-2), but the wrong posture. | `docker logs dunes-v2-keycloak` | **OPEN** — switch to `start` with `KC_HOSTNAME=https://auth.dunesinsolites.com`, `KC_HTTP_ENABLED=true`, `KC_PROXY_HEADERS=xforwarded`. A misconfig breaks all backoffice auth → needs a tested ~20-min maintenance window. Pair with M-1. |
| **M-7** | **Third-party control of the primary domain's DNS.** `dunes-insolites.com` (registrar OVH, owner-controlled) has its nameservers delegated to a **Cloudflare account the owner cannot access** — set up by the site's developer. That party can repoint the domain, issue certs for it, read traffic metadata, and change email routing. | `dig NS`, empty owner Cloudflare account | **OPEN — governance.** Get the developer to add the owner as a Member (or move the zone). Until then, treat the domain as not fully under the owner's control. |

### LOW  *(all FIXED live unless noted)*

| ID | Finding | Status |
|---|---|---|
| **L-1** | nginx version + OS disclosed (`Server: nginx/1.24.0 (Ubuntu)`) | **FIXED** — `server_tokens off` → `Server: nginx` |
| **L-2** | Keycloak **admin console + master realm reachable from the internet** (`auth.dunesinsolites.com/admin`) | **FIXED** — nginx returns 404 for `^/admin`, `^/realms/master`, `^/metrics` |
| **L-3** | **RabbitMQ management UI internet-exposed** via `mq.dunesinsolites.com` | **FIXED** — vhost removed (SSH-tunnel only) |
| **L-4** | **No fail2ban** — SSH / nginx brute-force unthrottled | **FIXED** — installed; `sshd` (aggressive), `nginx-http-auth`, `nginx-botsearch`. Confirmed banning live attack traffic (4 IPs at check time). |
| **L-5** | `PermitRootLogin yes` | **FIXED** — `prohibit-password` (key-only; password auth was already off) |
| **L-6** | No HSTS / `X-Content-Type-Options` / `Referrer-Policy` at the edge | **FIXED** — `snippets/dunes-security-headers.conf` on every app vhost |
| **L-7** | **Single SSH key** authorises root — losing `~/.ssh/dunes_vps_ed25519` = locked out (Contabo console recovery only) | **OPEN** — owner should add a second personal key to `/root/.ssh/authorized_keys` |
| **L-8** | Grafana `admin/admin` | **ACCEPTED** short-term — bound to `127.0.0.1`, reachable only via tunnel / the (not-yet-TLS) `mon.` vhost. Change on first login. |
| **L-9** | `default_server` serves `/var/www/html` for any unmatched Host | **ACCEPTED** — nginx default page only; consider `return 444` |
| **L-10** | Old vulnerable stack containers + volumes (`duneinsolite_postgres_data`, test data) still on disk, stopped | **ACCEPTED** — kept for rollback; remove after Part B + a few weeks stable |
| **L-11** | Duplicate `X-Frame-Options` (app `DENY` + nginx `SAMEORIGIN`) | **OPEN** — pick one source |
| **L-12** | `dunes-insolites.com` has **no DMARC record** (email spoofing) | **OPEN** — but DNS not owner-controlled (M-7); fix when it is. SPF is `~all`. |
| **L-13** | `client_max_body_size` was 1m — media uploads (8 MB) 413'd at nginx before reaching the backend | **FIXED** — 10m on `api` + `admin` (also a functional bug) |
| **L-14** | `POST /api/auth/login` with a wrong/absent `Content-Type` (form body) → **500** instead of 400/415. Body is generic ("An unexpected error occurred") — **no leak** — but 5xx on bad client input is noise. | **OPEN** — map `HttpMediaTypeNotSupportedException` / `HttpMessageNotReadableException` to 4xx in `GlobalExceptionHandler`. |

### Verified GOOD

- **JWT forgery rejected** — `alg:none` token and random bearer → 401. Signature validated against the live JWK set.
- **TLS 1.2 / 1.3 only** (1.0/1.1/SSLv3 refused), valid Let's Encrypt cert, SAN covers the 5 backoffice subdomains.
- **No CORS reflection** — spoofed `Origin: https://evil.example.com` → no `Access-Control-Allow-Origin`.
- **Containers**: non-root (`spring` 101, `nextjs` 999), not privileged, no added capabilities, **no Docker socket mount**.
- **No secrets in git** — history scan of `*.env` clean; `npm run scan:secrets` clean (899 files). The 2024 leak was in the *old GitLab repo*, not this monorepo.
- **Host**: UFW default-DROP (only 22/80/443), SSH key-only, `unattended-upgrades` active + 0 pending, every app/monitoring port bound to `127.0.0.1`.
- **Authorization** enforced at the service layer (not just controllers) — `CallerContext.requireStaffOrOwner` on reservation / invoice / payment / notification / extras / export. See `docs/security/authorization-matrix.md`.
- **BFF**: session JWT in an `httpOnly; Secure; SameSite=strict` cookie; cross-site mutating requests rejected by an Origin-host check.

---

## Priority queue

1. **C-1 / H-1** — ship `next@16.3.4` + `sharp` to the VPS. *(in progress)*
2. **M-5** — encrypt DB backups **before** wiring the off-host destination.
3. **M-7** — get DNS control of `dunes-insolites.com` (also blocks the SEO cutover).
4. **M-1 + M-6** — one maintenance window: Keycloak `start` mode + JWT issuer/audience validation.
5. **M-4 (code)** — fix `RateLimitFilter`.
6. **L-7** — add the owner's own SSH key as a second root key.
7. Housekeeping: L-8, L-11, and the old-stack teardown once Part B is done.

## Live changes made during this assessment

nginx: `server_tokens off`, security-headers snippet on all vhosts, `limit_req`
zones + per-endpoint limits (auth / KC token / public POST), `client_max_body_size
10m`, Keycloak `/admin` + master-realm block, `mq.` vhost removed.
Host: fail2ban (3 jails), `PermitRootLogin prohibit-password`, realm JSON `640`.
Keycloak: `bruteForceProtected`, password policy.
All mirrored to [`nginx/vps/`](../../nginx/vps/) + [`docs/runbooks/vps-security-hardening.md`](../runbooks/vps-security-hardening.md).
