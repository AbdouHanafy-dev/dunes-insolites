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
| **French only** — no `next-intl` at launch | 3 d | English visitors get French for six weeks; EN blog still serves from WordPress |
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
| DI-005 | ☐ | **Archive SEO baseline** — crawl + Search Console export | 0.5 |
| DI-006 | ✅ | `site.url` → real canonical host | 0.25 |
| DI-007 | ☐ | Staging environment | 0.75 |

### Sprint 1 — Mon 31 Aug → Fri 4 Sep · 5 d
*The vitrine reads and writes real data.*

DI-010 legacy French slugs on `Tour`/`TourType`/`Extra` · DI-011
`controller.publicapi` with dedicated DTOs · DI-012 public reads for stays and
activities · DI-013 booking → real `PENDING` reservation, **server-side pricing
authoritative** · DI-014 confirmation email over RabbitMQ · DI-015 rate-limit
public writes · DI-016 brand config by hostname.

> **DI-016 is the half-day that makes R4 cheap.** Turn `lib/site.ts` into a brand
> record selected by hostname. R4 becomes a configuration plus content instead of
> a fork.

### Sprint 2 — Mon 7 → Fri 11 Sep · 5 d
*French, and every legacy URL answers.*

DI-020 `trailingSlash: true` + `lang="fr"` · DI-021 French content · DI-022
legacy slugs routed · DI-023 nginx blog split · DI-024 301 map · DI-025 sitemap
from live data · DI-026 schema *(first to cut if the sprint slips)*.

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
