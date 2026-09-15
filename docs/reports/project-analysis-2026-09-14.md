# Dunes Insolites — Project Analysis

**Date:** 14 September 2026 · **Target launch:** 15 September 2026 (tomorrow)
**Author:** this Claude Code session, from the repo, `ARCHITECTURE.md`, `docs/`,
the live VPS, and this session's own work.

This is a snapshot, not a plan — for what to build next see
[`docs/ROADMAP.md`](../ROADMAP.md); for undecided business calls see
[`docs/OPEN-QUESTIONS.md`](../OPEN-QUESTIONS.md).

---

## 1. What this actually is

Two legal entities, one platform:

| | Dunes Insolites | Route Insolite |
|---|---|---|
| Sells | Nights at the Sabria desert camp + on-site activities (camel trek, quad, sandboard) | Multi-day circuits from Djerba |
| Registered | El Faouar 4264, Kébili | Houmet Souk, Djerba 4180 |
| Domain | `www.dunes-insolites.com` | `www.route-insolite.com` |

They share one database on purpose — a Route circuit can overnight at the Dunes
camp, so a single trip can touch both entities' books. That's a deliberate
trade-off, not an oversight: it buys one reconciled system at the cost of
"company" not yet being modelled as a first-class dimension (§4).

**Repo shape:** monorepo, `frontend/` (public vitrine), `admin/` (staff
backoffice, Next.js BFF), `backend/` (Spring Boot 4 / Java 21 API),
`packages/api-types` (the wire contract), ~660 source files
(412 backend Java, 141 frontend, 107 admin TS/TSX), 126 commits total, 62 of
them **not yet pushed** to `github.com/AbdouHanafy/dunes-insolites`.

---

## 2. Where it runs

**Live** on the owner's Contabo VPS (`79.143.185.33`, Ubuntu 24.04), behind
nginx + Let's Encrypt, alongside — not yet replacing — the WordPress site that
holds the real SEO rankings:

| Host | Serves | TLS |
|---|---|---|
| `api.dunesinsolites.com` | Spring Boot backend | ✅ |
| `auth.dunesinsolites.com` | Keycloak (prod mode) | ✅ |
| `admin.dunesinsolites.com` | New Next.js backoffice | ✅ |
| `camping.` / `partner.dunesinsolites.com` | Legacy Angular staff apps | ✅ |
| `www.dunesinsolites.com` | New Next.js vitrine (staging) | pending certbot |
| `mon.dunesinsolites.com` | Grafana | pending certbot |
| `www.dunes-insolites.com` (hyphen) | **The real site** — WordPress, 53 ranked FR URLs | untouched |

The no-hyphen domain is a safe staging ground; the hyphen domain is the one
with SEO value and is deliberately not touched yet (§6).

---

## 3. Security — the thing most worked on this cycle

**Score: ~8.6/10**, up from ~5/10 at the start of this hardening pass. Full
detail: [`docs/reports/security-assessment-2026-09-10.md`](security-assessment-2026-09-10.md).

Closed this cycle (all deployed, all with a regression test where the codebase
has tests):

- **Next.js image RCE** (critical, `GHSA-2xp9-vwfh-vxw4`) — bumped to 16.3.4.
- **Payment forgery** (high) — a `CLIENT` could `POST` a payment against their
  own reservation and mark it `PAID` with no money moving. Now staff-only,
  enforced at the service layer, not just the controller.
- **JWT validation** — decoder only checked signature + expiry; now validates
  `iss` and `azp` in production.
- **Keycloak** moved off `start-dev` into production mode; brute-force
  protection and a password policy were both off, now on.
- **Rate-limit bypass** — the per-IP key trusted a client-spoofable
  `X-Forwarded-For`; now keyed on the proxy-set `X-Real-IP`.
- **Backups were plaintext** — now AES-256 encrypted, round-trip restore
  proven on the VPS.
- **IDOR on reservation extras and notifications** — ownership now checked
  before every read/write.
- **Staff MFA** — the hardest one. Enforcing TOTP broke the old custom
  login form (password grant can't walk a user through enrolment), so the
  admin app was moved to a real **OIDC Authorization-Code + PKCE** flow —
  Keycloak now hosts the login page. Verified end-to-end on the VPS with real
  credentials. TOTP is now a required action on both staff accounts.
- Follow-up hardening: IdP fetch timeouts (a hung Keycloak can no longer
  freeze every page load), a real Keycloak healthcheck (kills a first-boot
  race the backend used to self-heal from), Grafana's `admin/admin` default
  removed from the compose contract.

**Only open finding with real exposure — M-7:** the primary SEO domain's DNS
sits in a Cloudflare account the owner doesn't control (set up by a third-party
developer). Not a code fix; needs the developer to grant access or hand the
zone over. This also blocks the SEO cutover (§6).

**Not done, tracked, not urgent:** no secret manager, no SIEM/real alert
routing, the backup encryption key lives on the same host as the database, no
external pentest yet. Do the pentest before real payments go live.

---

## 4. Architectural debt — what an audit would actually flag

Full list with line references: [`ARCHITECTURE.md` §13](../../ARCHITECTURE.md#13-known-architectural-debt).
The load-bearing ones:

**Critical (money/legal risk):**
1. **Shared invoice sequence across both legal entities** — numbering has
   gaps in both ledgers. That's exactly what a tax audit flags.
2. **`toggleCompanyType` can rewrite an issued invoice's legal identity**
   with no status guard — a sent, stamped facture can silently switch
   entities. The correct fix (credit note + reissue) already has the enum
   (`InvoiceType.CREDIT_NOTE`) but not the code.
3. **Money is still `Double`** on the older entities (`totalAmount`,
   `tvaAmount`, `timbreFiscal`, …) despite `Money` (BigDecimal, scale 3)
   existing and being the mandated pattern for anything new. Binary float
   cannot represent currency correctly; these are legally binding documents.

**High:**
- **"Company" only exists on `Invoice`.** An unbilled reservation belongs to
  no legal entity. "What did Route Insolite sell in July?" has no answer
  today. This is the root cause of items 5–7 (statistics, catalogue, and
  staff roles all inherit the same gap) and is explicitly deferred to
  [ADR-0002](../adr/0002-company-scoping.md) as **business-blocked**, not
  forgotten.
- **Test coverage is thin relative to the codebase's size** (~18.5k LOC).
  Growing, and every recent refactor (`ReservationInvoiceService`,
  `ReservationStateMachine`) shipped with a characterization-test net first —
  but there isn't nearly enough to safely refactor the remaining 1,660-line
  `ReservationServiceImpl` freely.

**Already fixed and worth naming, because they were real:** `ddl-auto:
update` against a live DB (now Flyway + `validate`), the frontend's seed-data
fallback silently masking a dead backend in production, no CI (now two gates:
unit + integration), the `RuntimeException`-to-400 leak, unbounded
`findAll()` on the reservations table, `AuthController` leaking an entity
instead of a DTO, the notification IDOR.

**Structural, lower stakes:** two live frontend stacks (Angular for
`partner-app`/`camping-app`, Next.js for `admin` and the vitrine) because the
admin migration only covers the role in active development; `admin` defines
its own types instead of importing the shared `packages/api-types` contract.

---

## 5. Business decisions still blocking code

[`docs/OPEN-QUESTIONS.md`](../OPEN-QUESTIONS.md) lists ten; these are the ones
actually gating work, not academic:

| | Question | Blocks |
|---|---|---|
| Q1 | Who invoices a mixed Route+Dunes trip? | The commercial layer (`TravelOrder`, ADR-0001 — accepted design, not built) |
| Q2 | One reservation per product, or per company? | Same |
| Q3 | Which payment provider? | Real payment integration (`docs/runbooks/payment-integration-security.md` has the security bar ready; provider choice is the owner's call) |
| Q4 | Remedy for invoices already issued from the broken shared sequence? | Fixing debt item 1 without silently rewriting financial history |
| Q7/Q8 | Is WordPress booking work stopped? Read access to `routeinsolite`? | Content parity for the SEO cutover |

None of these are code problems. Guessing at them produces work that gets
thrown away — which is why they're still open rather than answered by an
agent.

---

## 6. The SEO migration — paused on purpose

The vitrine (`frontend/`) is feature-complete enough to replace WordPress at
`www.dunes-insolites.com`, which holds **53 indexed French URLs with real
rankings**. The migration plan (legacy slugs kept verbatim, `trailingSlash:
true`, no soft-404 redirects to the homepage, French default at root) is
written and the rollback runbook exists.

**It has not been executed**, at the owner's explicit instruction — "I don't
need any risk" — because the domain's DNS is controlled by a third party
(§3, M-7) and cutting over without that access removed would mean trusting
someone else's Cloudflare account with a live SEO asset. This is the right
call: the two-record DNS edit that completes the cutover is trivial and
reversible in 30 seconds *once the owner has DNS access*; doing it without
that access is not reversible on the owner's terms.

---

## 7. What's actually ready for tomorrow (15 Sep)

**Ready:**
- Backend, database, auth, and both new frontends are deployed and running on
  the VPS, isolated from the untouched WordPress site.
- Login (including MFA) works end-to-end with real credentials.
- The high-severity security holes that would matter most in front of real
  users or real money are closed.

**Not ready / explicitly deferred:**
- The commercial layer for mixed-entity trips doesn't exist yet (waiting on
  Q1/Q2).
- No payment provider is wired in (waiting on Q3).
- The public SEO domain still serves WordPress; the new vitrine is proven on
  a staging domain, not switched over.
- 62 commits of this work sit only on the local machine, unpushed.

**Read this as:** the backoffice and the underlying platform are in genuinely
good shape to start using internally and to keep building on. Going fully
public on the ranked domain, or taking real money, both have specific,
named blockers above — not vague caution.

---

## 8. If you only read one section

The platform's engineering quality and security posture are no longer the
limiting factor — they were the highest-value thing to fix and they're fixed.
What's left blocking a full launch is, in order:

1. **Get DNS control back** (M-7) — an email/conversation, not code.
2. **Decide Q1–Q3** — who invoices what, and which payment provider — so the
   commercial layer and real payments can be built instead of guessed at.
3. **Book an external pentest** before real customer money moves through it.
4. Push the 62 local commits so this work has a backup and CI actually runs
   on it.
