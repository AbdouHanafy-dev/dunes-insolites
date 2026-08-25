# Dunes Insolites — working agreement

Read this before writing code. It is the short version; the reasoning lives in
[`ARCHITECTURE.md`](ARCHITECTURE.md) and [`docs/`](docs/).

---

## Orient yourself first

| Question | File |
|---|---|
| How is the system built, and what is broken? | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| What am I meant to build next? | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| Why is it built that way? | [`docs/adr/`](docs/adr/) |
| What is undecided? | [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md) |
| What does the API return? | [`packages/api-types/src/index.ts`](packages/api-types/src/index.ts) |

**If a task touches something in `OPEN-QUESTIONS.md`, stop and ask.** Those are
business decisions. Guessing produces work that gets thrown away.

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

> **Do not add multi-day touring to the Dunes vitrine.** That is Route Insolite's
> product. This has been corrected twice. The backend *does* model multi-day
> tours (`Tour.programSteps`) because it serves both companies — that is not a
> contradiction.

---

## Repository

```
frontend/      @dunes/frontend — the public site (espace client)
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

npm run dev              # frontend dev server
npm run build
npm run typecheck        # every workspace
npm run lint

npm run backend:compile
npm run backend:run
npm run backend:test

npm run verify           # typecheck + lint + backend compile — run before done
```

Run `npm run verify` before calling anything finished. It is the CI gate that
does not exist yet.

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

### Never fabricate reviews or ratings

Publishing invented reviews as real is illegal in the EU and most markets. Real
reviews are entered by hand from what the user provides. Keep `body` in the
guest's original language — translating misrepresents what they said.
`AggregateRating` JSON-LD is emitted **only** when real reviews back it; faking
it risks a Google manual action.

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

> ⚠️ `lib/api.ts` silently falls back to seed data on any fetch failure. In
> production that serves stale prices with no error anywhere. It must be gated on
> `NODE_ENV` before launch — see roadmap DI-031.

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
  fix. `/api/notifications` is still IDOR-able — that is written down rather than
  papered over.
- `frontend/AGENTS.md` is regenerated by `next dev`. Do not hand-edit it; seeing
  it in `git status` after running the dev server is normal.

---

## Current state

**Sprint 0, R1.** Target: Dunes Insolites live **15 September 2026**.

Done: role escalation closed, CORS applied, staff controllers locked down,
`site.url` corrected, monorepo with shared contract, `BusinessException`
hierarchy started.

**Outstanding and blocking:** the leaked Gmail app password and Keycloak client
secret are untracked but **not yet rotated**. Until they are, treat both as
public.
