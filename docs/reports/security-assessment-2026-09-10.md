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

The **deployment** had the usual first-cut gaps — a CRITICAL dependency RCE
(Next.js image optimization), a HIGH payment-fraud hole (customers could mark
their own booking paid), Keycloak admin console + RabbitMQ UI internet-exposed,
no fail2ban / rate limiting / Keycloak brute-force protection, plaintext
backups. **All of those were fixed and deployed during this assessment.**

**Nothing CRITICAL or HIGH is open at report time.**

Three items remain, none an open door:
- **M-6** (Keycloak `start-dev` → prod mode) + **M-1** (JWT `iss`/`aud` validation)
  — one planned ~20-min maintenance window, paired.
- **M-7** — a third party (the site developer) controls the primary domain's DNS.
  Governance, outside the repo; also blocks the SEO cutover.

## Score

**Security posture: ~8.6 / 10** (from ~5/10 at the start of the assessment).
Every CRITICAL/HIGH closed and deployed; staff MFA (TOTP) now enforced via a
Keycloak-hosted OIDC login. Defence in depth at edge (nginx rate-limit +
headers + fail2ban), IdP (Keycloak prod mode + brute-force + policy + MFA), app
(authz matrix, IDOR, staff-only payment ledger, hardened rate-limit key, JWT
iss/azp validation), data (encrypted backups), supply chain (`npm audit` gate,
0 vulns). Held below 9 by operational maturity, not holes: no secret manager,
no centralized/SIEM security logging + real alert routing, backups' key still
on the DB host, code not through remote CI, and no external pentest. The one
open finding with real exposure is M-7 (third-party DNS control), which is
governance outside the repo. See "Priority queue".

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
| **M-1** | JWT decoder validated signature + expiry only — not `iss`/`aud`. A token minted for another realm client would have been honoured. | `SecurityConfig.jwtDecoder()` | **FIXED + deployed** — when `KEYCLOAK_ISSUER_URL` is set (production), the decoder adds `JwtValidators.createDefaultWithIssuer(...)` + an `azp == duneinsolite-api` check. Verified live: forged-issuer token → 401, real token → 200. Unset (local/tests) keeps the lenient decoder. |
| **M-2** | Keycloak realm **brute-force protection was OFF** — the token endpoint (`/realms/duneinsolite/.../token`) could be hammered with password guesses, bypassing the API-layer control entirely. | admin API `bruteForceProtected: false` | **FIXED** — enabled: `failureFactor 5`, wait 60s→900s, `maxDeltaTimeSeconds 43200`. |
| **M-3** | Keycloak realm **had no password policy.** | admin API `passwordPolicy: None` | **FIXED** — `length(12) and notUsername() and passwordHistory(3)`. |
| **M-4** | **`RateLimitFilter` trusted a client-controlled header for the per-IP key.** `clientIp()` read the leftmost `X-Forwarded-For` value — an attacker could rotate the header to reset the window and bypass the limit. (The app *does* limit `/api/auth/login` at 10/min; the earlier "no 429" observation was an 8-request test, under threshold.) | code review | **FIXED** — `clientIp()` now uses the proxy-set `X-Real-IP` (nginx overwrites any client value), falling back to `getRemoteAddr()`. nginx `limit_req` (5-burst, IP by `$binary_remote_addr`) is the primary, stricter control. Both verified. |
| **M-5** | Database backups were plaintext `pg_dump` archives (customer PII + invoice data). | — | **FIXED** — `db-backup.sh` encrypts with `openssl enc -aes-256-cbc -pbkdf2` when `BACKUP_ENC_KEY_FILE` is set (loud warning when unset); `db-restore-verify.sh` decrypts transparently. Round-trip proven on the VPS (`file` → *openssl salted*, restore → PASS). Key `/root/.dunes-backup.key` (root-only, not in git). **Follow-up:** keep a copy of the key off the DB host. |
| **M-6** | Keycloak ran `start-dev` ("DO NOT use in production"); token `iss` was `http://…:8180`. | `docker logs` | **FIXED + deployed** — `command: start`, `KC_HOSTNAME=https://auth.dunesinsolites.com`, `KC_PROXY_HEADERS=xforwarded`. Verified: `Profile prod activated`, `iss` = `https://auth.dunesinsolites.com/realms/duneinsolite`, login end-to-end 200. |
| **M-8** | **No MFA for staff.** Enforcing TOTP via a Keycloak *required action* broke the old admin app: its login was a custom form → BFF → password grant, which returns `invalid_grant: Account is not fully set up` when TOTP enrolment is pending. | live test | **FIXED + deployed** — admin app switched to the **OIDC Authorization-Code + PKCE** redirect flow (`admin/lib/oidc.ts`, `admin/middleware.ts`, `admin/app/api/auth/{login,callback,logout}`; custom `LoginForm` deleted). Keycloak now hosts the login page (→ password-reset, lockout messages, account console for free). Client `duneinsolite-api` given `standardFlowEnabled` + `redirectUris`. Full round-trip verified on the VPS with real credentials: `/` → Keycloak → callback → httpOnly `admin_session` + `admin_refresh`, `/api/auth/me` returns the ADMIN session; access token never reaches the browser. **`CONFIGURE_TOTP` required action now set** on `admin@` and `camping@dunesinsolites.com` — next login forces authenticator enrolment. OTP policy TOTP/6-digit/30s. |
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
| **L-9** | `default_server` served `/var/www/html` for any unmatched Host | **FIXED** — `return 444` (connection dropped) |
| **L-10** | Old vulnerable stack containers + volumes (`duneinsolite_postgres_data`, test data) still on disk, stopped | **ACCEPTED** — kept for rollback; remove after Part B + a few weeks stable |
| **L-11** | Duplicate `X-Frame-Options` / `X-Content-Type-Options` (app + nginx) | **FIXED** — the nginx snippet now sends **only** HSTS (`includeSubDomains`); the apps own the rest. Verified single `X-Frame-Options: DENY`. |
| **L-12** | `dunes-insolites.com` has **no DMARC record** (email spoofing) | **OPEN** — but DNS not owner-controlled (M-7); fix when it is. SPF is `~all`. |
| **L-13** | `client_max_body_size` was 1m — media uploads (8 MB) 413'd at nginx before reaching the backend | **FIXED** — 10m on `api` + `admin` (also a functional bug) |
| **L-14** | Malformed body / bad `Content-Type` / wrong method → **500** instead of 4xx (no leak, just noise). | **FIXED** — `GlobalExceptionHandler` maps `HttpMessageNotReadableException`, `HttpMediaTypeNotSupportedException`, `MissingServletRequestParameterException`, `MethodArgumentTypeMismatchException` → 400 and `HttpRequestMethodNotSupportedException` → 405. |

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

1. **M-7** — get DNS control of `dunes-insolites.com` (also blocks the SEO cutover). *The only open finding with real exposure.*
2. **L-7** — add the owner's own SSH key as a second root key.
3. Off-host copy of the backup encryption key (`/root/.dunes-backup.key`).
4. External pentest before the public launch.
5. Housekeeping: L-8, L-11, and the old-stack teardown once Part B is done.

Closed and deployed this session: C-1/H-1 (`next@16.3.4`), M-1, M-2, M-3,
M-4, M-5, M-6, **M-8 + staff MFA**, P-1, and L-1..L-14 bar the two noted.

## Live changes made during this assessment

nginx: `server_tokens off`, security-headers snippet on all vhosts, `limit_req`
zones + per-endpoint limits (auth / KC token / public POST), `client_max_body_size
10m`, Keycloak `/admin` + master-realm block, `mq.` vhost removed.
Host: fail2ban (3 jails), `PermitRootLogin prohibit-password`, realm JSON `640`.
Keycloak: `bruteForceProtected`, password policy.
All mirrored to [`nginx/vps/`](../../nginx/vps/) + [`docs/runbooks/vps-security-hardening.md`](../runbooks/vps-security-hardening.md).
