# Roadmap

Single source of sequencing. The PDFs in this directory hold the reasoning and
the line-level detail; **this file is what gets updated** as work lands.

**Capacity:** 1 developer, full-time
**Plan date:** 25 August 2026 (Tuesday)

---

## Releases

| | Release | Sprints | Dates | Days |
|---|---|---|---|---|
| **R1** | Dunes Insolites live | 0–3 | 26 Aug → **15 Sep** | 15 |
| **R2** | Dunes hardening | 4–6 | 16 Sep → 27 Oct | 24 |
| **R3** | Shared backoffice | 7–11 | 28 Oct → 5 Jan | 40 |
| **R4** | Route Insolite | 12–15 | 6 Jan → 2 Mar | 32 |
| **R5** | TravelOrder + settlement | 16+ | Mar → | TBD |

---

## R1 — Dunes Insolites live · 15 working days

**Goal:** the vitrine live in French on the real domain, taking real bookings,
SEO migration complete. The Angular `admin-app` stays in service.

**Committed 12.5 d · buffer 2.5 d (17 %).** A solo plan with no buffer is not a
plan.

### What makes 15 days possible

Four cuts, ~34–44 days removed, all reversible:

| Cut | Saves | Cost |
|---|---|---|
| **Backoffice deferred to R3** | 25–35 d | None — `admin-app` is deployed and in daily use |
| **Blog stays on WordPress** behind an nginx split | 4 d | Two systems briefly; a visual seam until R2 |
| ~~**French only** — no `next-intl` at launch~~ **Reversed 26 Aug** — see [Languages](OPEN-QUESTIONS.md#-languages--all-6-french-default-at-root) | ~~3 d~~ | `next-intl` landed early: all 6 locales route, sitewide chrome is translated. Page-body content (activities/stays/legal/about/safety/contact) is still French/English-only — that work is now unscheduled extra scope, not covered by this plan's day counts |
| **Booking as request** — `PENDING`, staff confirm | 2 d | No instant confirmation; a manual step per booking |

Booking-as-request has a second benefit: the vitrine never triggers automatic
facture generation, so it adds no volume to the invoice sequence that
[Q4](OPEN-QUESTIONS.md#q4--what-is-the-remedy-for-invoices-already-issued-from-the-shared-sequence) has to repair.

### Sprint 0 — Wed 26 → Fri 28 Aug · 3 d
*Nothing exploitable, nothing unrecoverable.*

| ID | | Item | Est |
|---|---|---|---|
| DI-001 | ✅ | Remove caller-controlled `role` from registration | 0.25 |
| DI-002 | ⚠️ | Rotate secrets; untrack `.env` — **rotation still outstanding** | 0.5 |
| DI-003 | ✅ | Apply `.cors(...)`; remove dead `AsyncSupportConfigurer` | 0.25 |
| DI-004 | ✅ | `@PreAuthorize` on Chauffeur, Guide, Source | 0.5 |
| DI-005 | ⚠️ | **Archive SEO baseline** — crawl done ([`docs/seo-baseline/`](seo-baseline/)); Search Console export still needs your Google account | 0.5 |
| DI-006 | ✅ | `site.url` → real canonical host | 0.25 |
| DI-007 | ⚠️ | Staging environment — compose overlay + profile ready ([`backend/docker-compose.staging.yml`](../backend/docker-compose.staging.yml)); still needs a real host/domain to deploy to | 0.75 |

### Sprint 1 — Mon 31 Aug → Fri 4 Sep · 5 d
*The vitrine reads and writes real data.*

✅ DI-010 legacy French slugs on `Tour`/`TourType`/`Extra` (scoped to the
catalog rows that exist in `Seed.java` today — the rest backfill as products
are entered) · ✅ DI-011 `controller.publicapi` with dedicated DTOs · ✅ DI-012
public reads for stays and activities (marketing-copy fields not stored
server-side are derived, not invented — see `PublicCatalogText`) · ✅ DI-013
booking → real `PENDING` reservation, **server-side pricing authoritative**
(guest checkout via silent account creation — no login step; see
`PublicBookingServiceImpl`) · ✅ DI-014 confirmation email over RabbitMQ
(separate `email.queue` bound to `reservation.created`, see
`ReservationEmailConsumer`) · ✅ DI-015 rate-limit public writes (in-memory,
single-instance — `RateLimitFilter`) · ✅ DI-016 brand config by hostname
(`lib/site.ts` is now a `BrandConfig` record + `resolveBrand()`; still
statically defaults to Dunes Insolites everywhere — nothing calls
`resolveBrand()` per-request yet, that wiring is R4's job once a second
brand actually exists).

> **DI-016 is the half-day that makes R4 cheap.** Turn `lib/site.ts` into a brand
> record selected by hostname. R4 becomes a configuration plus content instead of
> a fork.

### Sprint 2 — Mon 7 → Fri 11 Sep · 5 d
*French, and every legacy URL answers.*

✅ DI-020 `trailingSlash: true` + `lang="fr"` (verified live: no-slash 308s,
lang attribute renders `fr`; superseded 26 Aug — `lang` is now dynamic per
locale, see the Languages decision reversal above) · ⚠️ DI-021 French
content — **further along than "out of scope," still not commissioned-grade.**
The multi-language rollout (26 Aug) shipped `next-intl` for all 6 locales plus
translated sitewide chrome; `activities`/`stays` long-form copy was already
translated into all 6 locales in `lib/data/*-i18n/` by that point. 28 Aug
closed the remaining gap: legal (Privacy/Terms, full body), about/safety/
contact page metadata, the auth forms and login/signup pages, and the gallery
filter labels are now translated across all 6 locales too — verified live
(build + a running server, real page fetches per locale, not just typecheck).
**Still draft-quality, not a commissioned professional translation** — flagged
hardest for the two legal pages, per the multi-language plan's own caveat;
budget a qualified review before treating them as binding in DE/IT/DA/AR
markets. The two items flagged as deferred earlier the same day — gallery
image alt text and the "8 yrs" stat-tile unit — were closed right after,
same verification standard (live per-locale render, not just a green build) ·
⚠️ DI-022 legacy slugs routed —
product-page rewrites done and build-verified (9 legacy URLs → real content,
each one's `<link rel="canonical">` now correctly points at the flat legacy
URL rather than the nested route — `lib/legacySlugs.ts` is the single
source of truth the rewrites, the canonical tags and the sitemap all read
from); blog/informational/brand-landing pages still have nowhere to land,
that's DI-021/DI-026 content, not routing · ⚠️ DI-023 nginx blog split —
**draft only, unverified** (`nginx/dunes-insolites.com.conf` +
`nginx/README.md`; nginx isn't in this repo, runs on the host, was written
blind and needs review + `nginx -t` on the real server before deploy) ·
✅ DI-024 301 map — unblocked 29 Aug (Q6 answered: circuits stay on
`dunes-insolites.com`). Built off the real Sprint 0 baseline crawl (63 URLs,
`docs/seo-baseline/`), not guessed at — 24 real redirects created via the new
Redirections backoffice (`/seo/redirections`, `scripts/seed-legacy-redirects.py`),
verified live (301s confirmed through `frontend/middleware.ts`, not just the
DB row). The 13 Route Insolite circuit URLs (Ksar Ghilane, Tataouine/Chenini,
Douz-Matmata, 4x4...) 301 to a new `/circuits` "coming soon" page — real
translated content across all 6 locales, not a placeholder — rather than 404
or a soft-404 homepage redirect. `nginx/dunes-insolites.com.conf` updated to
route all 24 to Next.js (was still falling through to WordPress); found and
fixed a pre-existing gap in the same file while there — `/account` was a real
route missing from the native-routes allowlist. Blog content, category
archives, and a handful of pages with no clear destination (`/panier/`,
`/review/`) are deliberately left on WordPress / unmapped, not guessed at —
see the seed script's own header for the full reasoning per URL. · ✅ DI-025 sitemap from
live data (rebuilt from `lib/api`, includes stays + accommodations,
canonical-consistent, no more fabricated `lastModified`) · ✅ DI-026 schema
*(first to cut if the sprint slips)* — `LodgingBusiness` sitewide,
`BreadcrumbList` on every detail page, `FAQPage` on `/safety` (real existing
Q&A, not invented for the schema); `sameAs` deliberately still omitted —
`site.social` links are placeholders, not this business's real profiles,
and emitting them would be wrong data, not just incomplete.

> **Found while verifying DI-022, unrelated to it:** `next.config.ts`'s
> `turbopack.root: __dirname` broke `next build`/`next dev` outright on any
> fresh `npm install` from the repo root (the documented install command) —
> Turbopack couldn't resolve the hoisted `next` package one directory up.
> Fixed to point at the monorepo root instead. Anyone who had a working dev
> server before this was likely running on a stale `frontend/node_modules`
> from before the monorepo restructure.

> `trailingSlash: true` is the most commonly missed step in a WordPress → Next
> migration. Without it all 53 legacy URLs become redirects.

### Sprint 3 — Mon 14 → Tue 15 Sep · 2 d
*Cut over and watch.*

DI-030 production config, TLS · DI-031 build guard on `NEXT_PUBLIC_API_URL` ·
DI-032 cutover, WordPress restorable 30 days · DI-033 post-cutover crawl +
alerting.

### Go / no-go — Monday 14 September

- [ ] Baseline archived (DI-005)
- [ ] No exploitable defect remains
- [ ] Secrets rotated, `.env` untracked
- [ ] All 53 legacy URLs return 200 or an intended 301
- [ ] `trailingSlash: true` verified against legacy URLs
- [ ] Zero seed fallbacks in production mode
- [ ] Booking reaches the Angular admin
- [ ] Confirmation email delivered
- [ ] Rate limiting active on public writes
- [ ] Rollback to WordPress tested, not assumed

**Any unticked box moves the date.** A ranking site is not worth losing to hit a
Tuesday.

---

## R2 — Dunes hardening · 24 d

Pays down every R1 shortcut, in the order risk demands.

| Sprint | Goal | Work |
|---|---|---|
| **4** · 16–29 Sep | Financial integrity | Per-company invoice sequences · restrict `toggleCompanyType` to `DRAFT` + credit-note reissue · money → `BigDecimal` · **accountant's remedy for issued invoices ([Q4](OPEN-QUESTIONS.md))** |
| **5** · 30 Sep–13 Oct | English + blog in-house | `next-intl`, FR root / EN `/en` · hreflang + `x-default` · 18 posts → MDX, slugs verbatim · retire the nginx split · decommission WordPress |
| **6** · 14–27 Oct | Engineering safety net | Flyway + `ddl-auto: validate` · authorization-matrix tests · pricing and capacity tests · CI with secret scanning · observability + correlation ids · live availability if the manual step hurts |

> Sprint 4 before Sprint 6 is deliberate: the invoice sequence is a live
> compliance defect. Tests matter, but a failing audit costs more.

---

## R3 — Shared backoffice · 40 d

**Blocker before Sprint 7 opens:** [Q8](OPEN-QUESTIONS.md) — read access to
`routeinsolite`. Also settle [Q9](OPEN-QUESTIONS.md), which decides whether the
shell is ADMIN-only or role-aware.

| Sprint | Goal | Work |
|---|---|---|
| **7** · 28 Oct–10 Nov | Company-aware foundations | `companyType` on `Reservation` and catalogue · company claim on staff, **enforced in repositories** · monorepo `apps/admin` · BFF auth, admin cookie scoped to its own subdomain · company switcher in the shell |
| **8** · 11–24 Nov | Core screens | Dashboard on the six statistics endpoints, company-filtered · Reservations: list, filter, search, detail, status, staff assignment |
| **9** · 25 Nov–8 Dec | Catalogue and people | Tours, tour-types, extras CRUD with slug and locale fields · Users + `UserProductRemise` · Guides and chauffeurs |
| **10** · 9–22 Dec | Money and comms | Invoices, proforma and facture sending · payments and transactions · review moderation *(the vitrine publishes these)* · notifications over the SSE proxy |
| **11** · 23 Dec–5 Jan | Cutover | Audit log on destructive and financial actions · optimistic concurrency on reservation edits · authorization re-verified per role **and** company · retire the Angular container and its CORS origin |

> **Company-aware from the first commit.** Retrofitting multi-tenancy costs 3–4×
> building it in. Sprint 7 exists so Sprint 8 onward cannot get it wrong.

---

## R4 — Route Insolite · 32 d

By now the backend is company-scoped, the backoffice is multi-brand and the
vitrine is a brand configuration. That is why a whole second site costs 32 days
rather than 75.

| Sprint | Goal | Work |
|---|---|---|
| **12** · 6–19 Jan | Route on the platform | Brand config · catalogue loaded as `ROUTE_INSOLITE` with legacy slugs · staff onboarded with the Route company claim · baseline archive for route-insolite.com |
| **13** · 20 Jan–2 Feb | Circuits template | Multi-day itinerary page driven by `programSteps` · destinations and listings · French content · `TouristTrip` schema |
| **14** · 3–16 Feb | Brand consolidation | **Cross-domain 301s** — the nine circuit pages move ([Q6](OPEN-QUESTIONS.md)) · reciprocal editorial links · both sitemaps · verify no query is contested by both domains |
| **15** · 17 Feb–2 Mar | Route cutover | Own 30-day rollback · post-migration crawl · monitor both properties — expect a 2–3 month dip on moved queries |

---

## R5 — TravelOrder and settlement

Per [ADR-0001](adr/0001-travel-order-and-settlement.md). Not scheduled; blocked
on [Q1](OPEN-QUESTIONS.md), [Q2](OPEN-QUESTIONS.md), [Q3](OPEN-QUESTIONS.md),
[Q5](OPEN-QUESTIONS.md).

Prerequisites are R2 Sprint 4 (money, sequences), R2 Sprint 6 (Flyway, tests)
and R3 Sprint 7 (company as a first-class dimension). Then:

1. `TravelOrder` + `travelOrderId` on `Reservation` + price snapshots
2. Payment provider, webhooks, idempotency, availability holds
3. `Settlement`, `SettlementLine`, inter-company invoices, reconciliation

---

## Working agreement

**Ceremonies, solo.** Daily written check (ten minutes: what closed, what is
blocked, is the sprint goal still reachable) · sprint review **by running the
acceptance criteria**, not reading code · fifteen-minute retro asking only *was
the estimate wrong, or was the scope wrong?* Skip standups and velocity charts —
at n=1 they measure nothing.

**Definition of Done.** Acceptance criteria verified by execution · runs on
staging against production-shaped config · no secret, token or internal
exception message reachable by a client · authorization verified for every role
that can reach it, including those that must not · from R2 S6, covered by a test
that fails on regression · rollback path known, and tested for anything touching
URLs, schema or money.

---

## Standing risks

| Risk | Trigger to watch | Response |
|---|---|---|
| Migration loses rankings | Any 404 in the post-cutover crawl | Roll back to WordPress within the hour |
| French copy late | Not delivered by Fri 4 Sep | **Commission it in Sprint 0.** Not a developer task; the likeliest cause of a slipped date |
| Sprint 1 overruns | DI-013 not started by Wed 2 Sep | Cut DI-026, then DI-025. Never DI-020 or DI-022 |
| Backoffice misses real workflows | `routeinsolite` access missing at Sprint 6 review | Hold Sprint 7; shadow the admin team for a day |
| Invoice sequence found by an audit | Any accountant review before Sprint 4 | Brief the accountant **now**, in R1 |
| Scope grows — three systems merging | Any new feature request during a replatform | Hard gates between releases |
