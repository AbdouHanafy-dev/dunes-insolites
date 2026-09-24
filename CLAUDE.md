# Dunes Insolites — working agreement

Read this before writing code. It is the short version; the reasoning lives in
[`ARCHITECTURE.md`](ARCHITECTURE.md) and [`docs/`](docs/).

---

## Orient yourself first

| Question | File |
|---|---|
| What exists, what is missing, what is undecided? | [`docs/PROJECT-STATE-2026-09-23.md`](docs/PROJECT-STATE-2026-09-23.md) — **read first** |
| How is the system built, and what is broken? | [`ARCHITECTURE.md`](ARCHITECTURE.md) (§10 backoffice predates the state doc) |
| Scores, risks, security | [`docs/PROJECT-AUDIT-2026-09-20.md`](docs/PROJECT-AUDIT-2026-09-20.md) |
| Why is it built that way? | [`docs/adr/`](docs/adr/) |
| Backoffice conventions | [`admin/CLAUDE.md`](admin/CLAUDE.md) |
| What does the API return? | [`packages/api-types/src/index.ts`](packages/api-types/src/index.ts) |

**If a task touches something in §4 of the state document ("Décisions à prendre"),
stop and ask.** Those are business decisions. Guessing produces work that gets
thrown away. (`docs/ROADMAP.md` and `docs/OPEN-QUESTIONS.md` were deleted at
`d73c7e2`; older Q-numbers cited below live only in git history.)

---

## The business, correctly

**Two separate legal entities share one platform.** This explains structure that
otherwise looks arbitrary.

| | Dunes Insolites | Route Insolite |
|---|---|---|
| Sells | Nuitées at the Sabria camp + on-site activities | Multi-day circuits from Djerba |
| Registered | El Faouar 4264, Kébili | Houmet Souk, Djerba 4180 |
| Site | `www.dunes-insolites.com` | `www.route-insolite.com` |
| Enum | `CompanyType.DUNES_INSOLITES` | `CompanyType.ROUTE_INSOLITE` |

They are not competitors. Route circuits **overnight at the Dunes camp** — which
is why `ReservationTourHebergement` exists and why one shared database is right.

### The Dunes product, precisely

The product is the **nuitée**:

- `nuitee-campement` — the fixed camp. Guests pick one accommodation: Desert
  Tent / Desert Room / Dune Suite (`Stay.accommodations`).
- `nuitee-bivouac` — a simpler night further into the dunes. No accommodation
  choice.

Camel trek, quad safari and sandboarding are **optional add-ons to a nuitée**,
not a separate bookable line. No time-of-day picker — the camp confirms the hour
on arrival, depending on who else is booked that day.

> **Do not add multi-day touring to the Dunes vitrine — this rule held from
> launch through 17 Sep 2026 and was corrected twice in that window.** The
> backend *does* model multi-day tours (`Tour.programSteps`) because it
> serves both companies — that was never the contradiction.
>
> **Reversed 18 Sep 2026, business owner, explicit — see
> `docs/OPEN-QUESTIONS.md` Q6's addendum for the full tradeoff.** `/circuits`
> is now a real, admin-managed, publicly indexed Tour listing + detail page.
> Route Insolite still has no vitrine of its own (R4, unscheduled) and
> `dunes-insolites.com` still is not `route-insolite.com` — the business
> owner chose to publish real tour content on the Dunes domain now rather
> than wait, accepting that it starts the domain's own ranking history
> instead of `route-insolite.com`'s. Don't re-flag this as the old rule; do
> flag anything that looks like it's guessing at scope beyond what Q6's
> addendum actually settled.

---

## Repository

```
frontend/      @dunes/frontend — the public site (espace client)
admin/         @dunes/admin — the backoffice (Next.js, port 3100)
backend/       Spring Boot API + docker-compose
packages/
  api-types/   the wire contract — imported by every frontend
scripts/       cross-platform tooling
design/        design handoff + brand assets
docs/          roadmap, ADRs, open questions, plans
```

Git root is the repository root. **The Next.js app is `frontend/`** — it used to
be `sabria/` under a nested folder; anything saying otherwise is stale.

`../_dunes_old_repos/` holds pre-monorepo backups. Never edit there.

---

## Commands

```bash
npm install              # once, at the root

npm run dev              # frontend dev server (localhost:3000)
npm run dev:admin        # backoffice dev server (localhost:3100)
npm run build
npm run typecheck        # every workspace
npm run lint

npm run backend:compile
npm run backend:run
npm run backend:test        # full suite, needs a real Postgres/Keycloak/RabbitMQ
npm run backend:test:unit   # everything except DuneinsoliteApplicationTests — no infra needed

npm run test:web         # frontend + admin unit tests
npm run verify           # typecheck + lint + test:web + backend:test:unit + prod-config check — run before done
```

Run `npm run verify` before calling anything finished. `.github/workflows/ci.yml`
runs the same three steps on every push/PR to `main` — the CI gate this line
used to say didn't exist yet now does.

---

## Rules that are not negotiable

### Never trust the client for authority

- **Roles come from the server.** `RegisterRequest` has no `role` field; the role
  is a parameter of `registerUser()` and `AuthController` always passes `CLIENT`.
  A caller-supplied role on a `permitAll()` endpoint previously let anyone on the
  internet grant themselves realm admin.
- **Prices are computed server-side.** A client may display an estimate. A
  client-sent total is never trusted.
- **Payment success is confirmed server-side.** The frontend is never the source
  of truth.

### Authorization is declared in two places

`SecurityConfig` URL rules are **first-match-wins** — ordering is load-bearing.
`/api/tours/active` is declared *before* `/api/tours/{tourId}` precisely so
`active` is not swallowed as a path variable and made public. Do not reorder
without understanding why.

Anything without an explicit rule falls through to
`anyRequest().authenticated()` — meaning **any logged-in user**. That is how
three controllers let a `CLIENT` delete guides and booking sources. Every new
controller gets an explicit `@PreAuthorize`.

### Money

`BigDecimal`, scale 3 (the millime), explicit `RoundingMode`. Never `Double`,
`double` or `float`.

The existing entities still use `Double` — that is [tracked debt](ARCHITECTURE.md#12-known-architectural-debt),
not a pattern to copy. New monetary fields use `BigDecimal`.

**Guest types.** Adults are 18+, children 3–18, infants 0–3. Infants are priced on
their own (0 = free until the back office sets a price) and never count toward
`MAX_PARTY_SIZE` or a room's capacity. Accommodation tiers are priced **per person
per night**, one price per guest type (`AccommodationType.adult/child/infantPriceTtc`);
the legacy `unitPriceTtc` column is kept only so old reservations still total the same.
A timed activity's `unitPrice` is the price of its base duration
(`Extra.baseDurationMinutes`, 30 by default); a longer session costs
unit price × minutes ÷ base, computed server-side (`ExtraDurationPricing`).


### Do not refactor the money path before tests exist

`ReservationServiceImpl` is 1,788 lines and deserves splitting. Doing it without
a safety net is how a pricing bug reaches production and is found by a customer.
Tests first — R2 Sprint 6.

### Entities never cross the controller boundary

Return DTOs. `AuthController.register` still returns `User`; that is a known
violation, not a precedent.

---

## Conventions

### Backend

Layering is `controller → service (interface) → service.impl → repository`.
Entities stay below the service layer. MapStruct maps entity ↔ DTO. Separate
request and response DTOs, deliberately.

**Exceptions.** Subclass `BusinessException` with the right status. Never throw
bare `RuntimeException` — roughly 37 sites still do, mapped to 400 by a
`@Deprecated` handler that shrinks as they migrate. A defect should surface as a
500 with a generic message, never as a 400 leaking internals.

### Frontend

`lib/api.ts` is **the single seam** to the backend. Nothing outside it imports
`lib/data/*`.

Server components by default; `"use client"` only when genuinely needed — Core
Web Vitals is a ranking input for a business that lives on organic search.

TypeScript is `strict` with zero `any`, `as any` or `@ts-ignore` across the tree.
Keep it that way.

> ✅ DI-031 done (29 Aug 2026). `lib/api.ts` still falls back to seed data on
> a transient fetch failure — that degrade is correct, a blank page is worse —
> but a real production deploy (`DEPLOY_ENV=production`, set on the real host
> as part of DI-030, not `NODE_ENV`: `next build` always sets `NODE_ENV=
> production`, including a plain local build with no backend, confirmed by
> actually running it) with `NEXT_PUBLIC_API_URL` unset now fails the build
> immediately instead of silently shipping 100% seed content. A transient
> failure in production also now logs loudly (`console.error`) instead of
> in total silence.

### The contract

`packages/api-types` holds everything crossing the network. Three rules:

1. Only wire shapes. No view models.
2. Only rules both sides enforce — `MAX_PARTY_SIZE` is there because the client
   validates and the server enforces.
3. Changing it is a breaking change for two applications.

Presentation — labels, formatting, copy — stays in the app. Those become
translated strings and have no business in a contract shared with a Java service.

### SEO — the migration is irreversible

The vitrine replaces a WordPress site with **53 indexed URLs** holding real
French rankings.

- **Keep legacy French slugs verbatim.** `/nuitee-campement-desert/` carries the
  keyword; `/camp/camp-night` carries nothing. The strongest migration is one
  where the URL does not change.
- **`trailingSlash: true`.** WordPress serves trailing slashes; Next strips them.
  Miss this and all 53 URLs become redirects.
- Never 301 to the homepage. Google treats it as a soft 404.
- French is the default locale at the root. English goes under `/en`.

### Git

Commit messages explain **why**, not what — the diff already says what. Do not
commit or push unless asked. Never commit `.env` or any secret.

---

## Working style

- **Verify by running, not by reading.** Several real bugs here were only caught
  by looking at rendered output — a `display:none` killing a whole section, a CSS
  specificity clash making button text the same colour as its background.
- **Check the caller before changing a signature.** `registerUser` is called by
  both `AuthController` and `Seed`; hard-coding the role inside it would have
  broken seeding silently.
- **Say what is not done.** A partial fix reported as complete is worse than no
  fix. ~~`/api/notifications` is still IDOR-able~~ **Fixed 29 Aug 2026** —
  `markAsRead` now checks the notification's owner against the caller's JWT
  subject before mutating, silently no-opping either way (missing id or
  someone else's id) so the response can't be used to probe other accounts'
  notification IDs; the controller also got the explicit `@PreAuthorize` it
  never had (found via the Rôles & permissions audit built earlier this
  session). Verified against a real cross-user attempt, not assumed: a
  second real account's request to mark the first account's notification as
  read returned `200` (no error leak) but the row's `is_read` stayed
  `false` in Postgres; the owning account's own request against the same
  row correctly flipped it to `true`.
- **Payment and email work is not covered by end-to-end tests.** Unit tests cover
  amounts, translations and email rendering; nobody has run the flow against a
  real database or SMTP server. Say so when reporting it done.
- **Tooling gotchas on this Windows checkout.** Many files are CRLF, so a
  multi-line `Edit` anchor can fail to match — use a one-line anchor, or a small
  node script that normalises \r\n and writes the original line endings back.
  A Bash heredoc containing an apostrophe can break the shell call; write the file
  with the Write tool instead. Do not drive a browser to check UI — the user checks
  it themselves.
- **Commits.** Only when asked, under the user's own git identity, without a
  Claude co-author trailer.
- `frontend/AGENTS.md` is regenerated by `next dev`. Do not hand-edit it; seeing
  it in `git status` after running the dev server is normal.

---

## Current state

**Where the product stands (23 Sep 2026):** see
[`docs/PROJECT-STATE-2026-09-23.md`](docs/PROJECT-STATE-2026-09-23.md) — the
backoffice reservations/payment/email work, what is still missing, and the open
business decisions. Update that file when what exists changes.

The security items below are older and **still open** — they are not superseded.

**Sprint 0, R1.** Original target: Dunes Insolites live **15 September 2026**
(that date has passed; the platform is in the hardening phase per the audit).

Done: role escalation closed, CORS applied, staff controllers locked down,
`site.url` corrected, monorepo with shared contract, `BusinessException`
hierarchy started.

**Outstanding and blocking:**

- **Keycloak client secret (local dev)** — rotated 28 Aug 2026. Regenerated via
  the Keycloak Admin API against the local Docker realm; the value the leaked
  `../duneinsolite/.env` (old GitLab-hosted pre-monorepo repo, commits
  `b8849e0`/`a8c7889`) exposed is dead there. Verified end-to-end: login →
  bearer token → authorized `/api/pages` call, all 200. `backend/.env` holds
  the new value; local runs activate it via
  `-Dspring.profiles.active=local` (new `application-local.yml`, gitignored —
  see below).
- **Keycloak client secret / any other host** — `application.yml`'s default
  `KEYCLOAK_SERVER_URL` and `SPRING_DATASOURCE_URL` point at a remote IP
  (`79.143.185.33`) unreachable from this dev machine. **Unverified whether
  that host is live, and if so whether it uses the same leaked secret.** If
  it is a real staging/demo deployment, its Keycloak client secret (and
  whatever Gmail credential it uses) needs rotating separately, directly on
  that host — not something done from here.
- **Gmail app password — still not rotated.** Requires the Google account
  owner: revoke the old app password (Google Account → Security → App
  Passwords), then, if SMTP is still needed, generate a new one and put it
  directly into the relevant `.env` yourself rather than pasting it into a
  chat transcript. Local `backend/.env` currently has this empty, so mail
  sending fails locally (`jakarta.mail.AuthenticationFailedException`) —
  harmless for dev, but the leaked value is still live until revoked.

Until the Gmail password is revoked and the remote host is checked, treat
both as still public.

**Local dev note:** `application-local.yml` (backend, gitignored) is now the
supported way to run the backend against the docker-compose stack instead of
the remote defaults — activate with
`node scripts/mvn.mjs -q spring-boot:run -Dspring-boot.run.jvmArguments=-Dspring.profiles.active=local`.
Passing multiple `-D`/env overrides directly on the command line does **not**
reliably reach the forked JVM through `scripts/mvn.mjs`'s Windows `shell:
true` spawn — args containing spaces get re-split by `cmd.exe` before Maven
sees them. A single no-space flag (profile activation) sidesteps it; a
config file is the fix, not more flags.
