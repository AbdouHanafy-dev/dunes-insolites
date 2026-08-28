# The Pages CMS — a Payload-style pattern, on our own stack

Reference for how content editing works in `admin/`, how it reaches
`frontend/`, and exactly what is and isn't wired yet. Written after the
pattern was fully built and verified live — this is not a plan, it's what
exists today.

**Last verified:** 28 August 2026, against commit `83bb27a`.

---

## Contents

1. [Why Payload's pattern, not our own](#1-why-payloads-pattern-not-our-own)
2. [The document-editing shape](#2-the-document-editing-shape)
3. [Content — general fields](#3-content--general-fields)
4. [Blocs — the page builder](#4-blocs--the-page-builder)
5. [The repeater field](#5-the-repeater-field)
6. [SEO tab](#6-seo-tab)
7. [Live preview](#7-live-preview)
8. [How a block reaches the public site](#8-how-a-block-reaches-the-public-site)
9. [The five wired routes, one by one](#9-the-five-wired-routes-one-by-one)
10. [Safety guarantee: publish is the only way to affect the live site](#10-safety-guarantee-publish-is-the-only-way-to-affect-the-live-site)
11. [How to add a new block type](#11-how-to-add-a-new-block-type)
12. [How to wire a new route to the CMS](#12-how-to-wire-a-new-route-to-the-cms)
13. [What's not built](#13-whats-not-built)
14. [File map](#14-file-map)

---

## 1. Why Payload's pattern, not our own

The user showed a screenshot of Payload CMS's actual editor — a document
list, a full-page edit view (not a modal), tabs across the top
(Hero/Content/SEO in their example), a sidebar panel for save/status, and a
live split-pane preview of the real front-end updating as you type. The
brief was explicit: "je veux que mon backoffice marche comme Payload,
exactement."

That is the shape this CMS follows, adapted to two apps we already have —
`admin/` (Next.js backoffice) and `frontend/` (the public vitrine) — rather
than pulling in Payload itself. Three structural decisions came directly
from that screenshot:

- **A full page to edit a document, never a modal.** List rows navigate to
  a real route (`/content/pages/{id}`), not an inline drawer.
- **A sidebar panel, separate from the fields.** Save, status, Publish/
  Unpublish and Delete live in a sticky right-hand column — this is what
  actually makes editing feel like Payload rather than a generic admin
  table-with-drawer.
- **A live, split-pane preview of the real site**, not a "Preview" button
  that opens the published page in a new tab. See [§7](#7-live-preview).

## 2. The document-editing shape

Every Page record is edited at `admin/components/pages/PagesEditor.tsx`.
The layout, left to right on a wide screen:

```
┌──────────────┬───────────────────────────┬─────────────┐
│  Contenu     │                           │  [Créer]    │
│  Blocs       │     Live preview          │  [Annuler]  │
│  SEO         │     (iframe, real vitrine)│  Statut     │
│              │                           │  Publier    │
│  (tab body)  │                           │  Supprimer  │
└──────────────┴───────────────────────────┴─────────────┘
```

Grid: `xl:grid-cols-[400px_1fr_260px]` — form, preview, sidebar. Below the
`xl` breakpoint the preview column is hidden (`hidden xl:block`); the form
and sidebar still stack.

The whole thing — tabs, preview, sidebar — sits inside one `<form>`, so the
sidebar's `Créer`/`Enregistrer` button is a real native submit.

## 3. Content — general fields

The **Contenu** tab (internal tab key: `general` — renamed from "Général"
on request, see git history) holds the fields that exist outside any block:

| Field | Type | Notes |
|---|---|---|
| Titre | text, required | |
| Slug (URL) | text, required | Flat string, not a path — `legal-privacy`, not `legal/privacy`. Unique per `(slug, locale, companyType)` on the backend. |
| Langue | select | `FR` / `EN` / `DE` / `IT` / `DA` / `AR` — `PageLocale` |
| Marque | select | `DUNES_INSOLITES` / `ROUTE_INSOLITE` — `CompanyType` |

## 4. Blocs — the page builder

The **Blocs** tab (internal tab key: `content`) is `PageBuilder.tsx`: an
ordered list of blocks, each collapsible, with **add / reorder (↑↓) /
duplicate / delete** per block, and a "+ Ajouter un bloc" picker at the
bottom. Each block is `{ type: string, dataJson: string }` on the wire —
`dataJson` is a JSON string, parsed to an object for editing
(`parseBlockData`) and re-stringified on every field change
(`updateBlockData`).

**The registry** (`admin/components/pages/blockTypes.tsx`) is the single
source of truth for what a block type's fields are:

| Block | Fields | Preview label |
|---|---|---|
| **Hero** (`hero`) | `title` (required), `subtitle`, `imageUrl`, `ctaLabel`, `ctaUrl` — all text | the title, or "(vide)" |
| **Texte riche** (`richText`) | `heading` (text, optional) + `content` (textarea) | the heading if set, else the first ~48 characters of the content, or "(vide)" |
| **Appel à l'action** (`cta`) | `title` (required), `buttonLabel`, `buttonUrl` — all text | the title, or "(vide)" |
| **FAQ** (`faq`) | `question` (required, text), `answer` (textarea) | the question, or "(vide)" |
| **Vitrine hébergements** (`accommodationShowcase`) | no flat fields — rendered specially, see below | "N hébergement(s) sélectionné(s)" |
| **Équipe** (`team`) | `heading` (text) + `members` (**repeater**, see [§5](#5-the-repeater-field)) | the heading, or "N membre(s)" |
| **Bloc réutilisable** (`blockReference`) | no flat fields — a picker over `/api/content-blocks`, see [§13](#13-whats-not-built) | the referenced block's own label, or "(aucun bloc choisi)" |

`accommodationShowcase` is the one **relationship** block: instead of typed
fields it renders `AccommodationPicker`, a checkbox list of real
`AdminTourType[]` fetched from the backend. Its data is
`{ tourTypeIds: string[] }` — real catalogue ids, never duplicated content.
This is the concrete answer to "content blocks should reference real
catalogue entities," not invent their own copy of it.

A block type not in the registry still works — `PageBuilder` falls back to
a raw JSON textarea for it — just without typed fields.

## 5. The repeater field

Added specifically to unblock the `team` block's guide profiles (photo,
name, role, bio *per person*) — the registry's other fields are all flat
key→value pairs, which can't model "a list of objects."

`FieldDef` (`admin/components/payload/fields.tsx`) gained a new variant:

```ts
| {
    type: "repeater";
    key: string;
    label: string;
    itemLabel: string;      // singular noun shown per entry ("Membre")
    fields: FieldDef[];     // the shape of each entry
  }
```

`FieldInput` — the component that renders one control per `FieldDef` —
returns `null` for `type: "repeater"` on purpose: a repeater isn't one
input, it's a whole sub-form. `PageBuilder.tsx` special-cases it (the same
way it already special-cased `accommodationShowcase`) and renders
`admin/components/payload/RepeaterField.tsx` instead:

- Add / remove / reorder (↑↓) entries.
- Each entry renders its own `fields` via the normal `FieldInput`, so a
  repeater's sub-fields can themselves be any type except another repeater
  (not currently needed, not built).
- Data shape: the block's `key` (e.g. `members`) holds a plain array of
  objects — `[{ name, role, photo, bio }, ...]`.

This is a **general primitive**, not a one-off for guide profiles — any
future block needing a repeatable list (a gallery, a step-by-step
itinerary, a pricing table) reuses `RepeaterField` rather than inventing a
new pattern.

## 6. SEO tab

`admin/components/pages/SeoEditor.tsx`. Fields: `seoTitle`,
`metaDescription`, `focusKeyword`, `canonicalUrl`, `noIndex`, `noFollow`,
`ogTitle`, `ogDescription`, `ogImageUrl` — all optional, all fall back to
translated defaults on the vitrine side when unset (see [§9](#9-the-five-wired-routes-one-by-one)).

Includes a Google SERP preview and `seoChecks()` — a list of concrete
✓/⚠/✗ items (title length, missing meta description, etc.). Deliberately
**not** a fabricated numeric "SEO score" — a real checklist against real
thresholds, nothing invented to look more sophisticated than it is.

## 7. Live preview

This is the piece that actually earns the Payload comparison. Not a
"Preview" button that opens the *published* page in a new tab — a live,
split-pane render of the real vitrine that updates as you type, before
anything is saved.

**Mechanism**, deliberately simple — no preview tokens, no draft-fetch
endpoint, no shared session between the two apps:

```
admin (PagesEditor)                    frontend (iframe, ?livePreview=1)
────────────────────                   ──────────────────────────────────
form state (title, blocks)
        │
        │ on mount:                     LivePreview.tsx mounts,
        │                               posts {type:"cms-preview-ready"} ──►
        │◄────────────────────────────   
   sets ready = true
        │
        │ on every field change:
        │ postMessage
        │ {type:"cms-preview-update",
        │  page:{title, blocks}}  ─────► listens, setPage(payload),
        │                                re-renders <PageHead>+<CmsBlocks>
```

- `admin/components/pages/LivePreviewPane.tsx`: the iframe host. Embeds
  `${NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000"}${path}?livePreview=1`.
  Keeps an explicit `slug → vitrine path` map (`PREVIEW_PATHS`) — a slug
  not in the map renders an honest "no live preview for this slug yet"
  message instead of an iframe pointed at nothing. Includes a width
  selector (Responsive / Mobile 390px / Tablette 768px / Bureau 1440px),
  matching the screenshot.
- `frontend/components/LivePreview.tsx`: what actually renders inside the
  iframe. **Never calls the backend in this mode** — it only ever renders
  whatever the parent posts. `?livePreview=1` short-circuits the route
  before any `getCmsPage`/data fetch happens (see each route's `page.tsx`).

**Known fidelity gap, on `contact` specifically:** `LivePreview.tsx`
renders `<PageHead>` + `<CmsBlocks>` only. For `about` that's an acceptable
simplification — `Experience`/`CTA` are generic, non-editorial, unsurprising
to omit. For `contact`, the real route always keeps its form/map/info-card
shell around whatever the CMS overrides, but the live preview shows *only*
the hero block — it doesn't look like the final page. Not fixed; would need
`LivePreview.tsx` to know which routes have a fixed shell, not just whether
a CMS page exists.

## 8. How a block reaches the public site

**Backend** — one new unauthenticated endpoint, following the existing
`/api/public/**` convention (next to `PublicStayController`,
`PublicActivityController`, etc. — see `SecurityConfig`, `GET
/api/public/**` is `permitAll`):

```
GET /api/public/pages/{slug}?locale=FR&companyType=DUNES_INSOLITES
```

`PublicPageController` → `PageService.getPublishedPageBySlug(slug, locale,
companyType)` → only ever returns a page whose `status == PUBLISHED`; a
draft and "doesn't exist" both come back as a plain 404 — the vitrine
doesn't need to (and can't) tell the difference, it just falls back either
way. Response shape (`PublicPageResponse`) parses each block's `dataJson`
string into a real JSON object server-side, so the vitrine never parses
JSON-in-JSON.

**Frontend** — `frontend/lib/api.ts`'s `getCmsPage(slug, locale)`:
returns `null` immediately if no backend is configured (`NEXT_PUBLIC_API_URL`
unset) or on any fetch failure/404 — same silent-fallback convention as
every other read in that file. Cached with `revalidate: 300`, the same
pattern `getActivities`/`getStays` already use.

> ⚠️ **That 300s cache is real.** An admin publishing or unpublishing a page
> can take up to 5 minutes to show on the live site. It also **persists to
> `.next/cache` on disk**, not just in memory — a killed-and-restarted dev
> server can still serve a stale result. Not a bug; caught us once during
> verification.

**Rendering** — `frontend/components/CmsBlocks.tsx` maps each block's
`type` to a render function, using the vitrine's own CSS (`.prose`,
`.btn-accent`, `.faq`, `.team`) rather than a parallel style system:

- `richText`'s optional `heading` renders as a real `<h2>`. In `content`, a
  line starting with `- ` opens/continues a bullet list (consecutive such
  lines → a real `<ul>`); anything else is a plain paragraph. A plain-text
  authoring convention, not Markdown.
- **Runs of the same "flows as one article" block type are grouped**, not
  rendered as one padded section per block — `groupRuns()` does this before
  rendering:
  - Consecutive `richText` blocks share a single `.prose` wrapper with
    each one's `heading`/paragraphs inside it, in order — exactly the shape
    the hardcoded legal/safety/about pages always had (one flowing article
    with several `<h2>`s), not five separately-padded sand sections for a
    five-section page.
  - Consecutive `faq` blocks group into one accordion
    (`<details>`/`<summary>`, exactly the markup the hardcoded safety page
    always used) instead of one section per question. `extractFaqs()` is
    exported separately so a route can pull the same `{question, answer}`
    pairs to build its own `FAQPage` JSON-LD from CMS content (see
    `safety/page.tsx`).
- `team` renders the same `.team`/`.member` markup the hardcoded About
  page's guide cards always used — photo, name, role, bio, one `.member`
  per repeater entry.
- `accommodationShowcase` **does not render publicly yet** — no public
  endpoint resolves the `TourType` ids it stores into cards. A page using
  it just skips that block rather than showing broken data.

## 9. The five wired routes, one by one

All five follow the same opening: read `?livePreview=1` from
`searchParams` first, short-circuit to `<LivePreview>` before touching the
backend if present; otherwise `getCmsPage(slug, locale)` and decide what to
render.

**As of 28 Aug 2026, all 30 combinations (5 pages × 6 locales) are real,
published `Page` rows** — `scripts/seed-cms-pages.py` transferred the
already-translated text straight out of `messages/*.json` into blocks (no
retranslation), then published every one via the real API. So on this
database, all five routes are now genuinely CMS-driven in every locale, not
running on the hardcoded fallback. The fallback JSX described below still
exists and still works — delete or unpublish any of these rows and that
route reverts to it immediately, same guarantee as always
(see [§10](#10-safety-guarantee-publish-is-the-only-way-to-affect-the-live-site)).
A fresh database (or a re-seeded one) has none of this and every route
renders the fallback until `seed-cms-pages.py` runs again.

| Route | CMS slug | What the CMS controls |
|---|---|---|
| `/legal/privacy` | `legal-privacy` | Everything — full `<CmsBlocks>` replaces the hardcoded prose |
| `/legal/terms` | `legal-terms` | Everything — same shape as privacy |
| `/safety` | `safety` | Everything, **plus the `FAQPage` JSON-LD is rebuilt from the CMS's own `faq` blocks** via `extractFaqs()`. No `<script>` at all is emitted if that list is empty — never a fabricated/empty schema. `Experience`/`CTA`-equivalent: none on this page. |
| `/about` | `about` | Everything; `<Experience/>` and `<CTA/>` render unconditionally *after* the CMS content (or the hardcoded fallback) — they're conversion components, not editorial content, never in scope. |
| `/contact` | `contact` | **Only the hero title/lead**, via `heroBlock?.data.title` / `.subtitle` off the CMS page's first `hero` block. Eyebrow is always the translated default (`hero` has no eyebrow field). `ContactForm`, the info-card list, and the OpenStreetMap iframe always render, unconditionally — real functionality, never going to become CMS blocks. |

SEO title/description: on every route, `cms?.seoTitle || t("title")` and
`cms?.metaDescription || t("description")` — the CMS page's own SEO fields
win if an editor filled them in, otherwise the existing translated
defaults from `messages/*.json` apply exactly as before this system existed.

## 10. Safety guarantee: publish is the only way to affect the live site

Worth stating plainly, because it's what makes this safe to build
incrementally:

1. Creating a Page in the admin, unpublished (`DRAFT`, the default),
   changes **nothing** on the public site. `getPublishedPageBySlug` only
   returns `PUBLISHED` rows.
2. A published page only affects the **one route** matching its exact
   `(slug, locale, companyType)` — publishing `legal-privacy`/`FR`/
   `DUNES_INSOLITES` has no effect on `/en/legal/privacy` or on Route
   Insolite.
3. Every route's fallback path is its **original, already-shipped,
   already-translated** hardcoded content — not a placeholder, not "coming
   soon." Unpublishing (or never publishing) is always safe.
4. Nothing auto-migrates the existing `messages/*.json` content into
   `Page`/`PageBlock` rows. A page only starts overriding a route once
   someone deliberately authors and publishes it.

## 11. How to add a new block type

1. Add an entry to `BLOCK_TYPES` in `admin/components/pages/blockTypes.tsx`
   — `type`, `label`, `icon`, `fields: FieldDef[]`, and a `titleKey` if one
   field should show as the collapsed-card preview label.
2. If it needs a repeatable list, use `{ type: "repeater", ... }` — no new
   plumbing required, `PageBuilder`/`RepeaterField` already handle it.
3. If it needs a real relationship (references another entity, like
   `accommodationShowcase` does), skip `fields` and special-case
   `block.type === "yourType"` in `PageBuilder.tsx`'s render branch instead
   of the generic `def.fields.map(...)` loop.
4. Add a render function to `frontend/components/CmsBlocks.tsx`'s
   `renderItem()` switch, using the vitrine's existing CSS classes.
5. Update `blockPreviewLabel()` in `blockTypes.tsx` if the default
   `titleKey` lookup doesn't produce a good collapsed-card label.

## 12. How to wire a new route to the CMS

Copy the shape from `legal/terms/page.tsx` (full replacement) or
`contact/page.tsx` (partial override) depending on which fits:

1. Pick a `CMS_SLUG` constant.
2. `generateMetadata`: fetch `getCmsPage(CMS_SLUG, locale)` alongside the
   translated `t`, prefer `cms?.seoTitle`/`cms?.metaDescription`.
3. Page component: accept `searchParams: Promise<{ livePreview?: string }>`,
   short-circuit to `<LivePreview eyebrow={...} />` when `livePreview === "1"`.
4. Otherwise fetch `getCmsPage(CMS_SLUG, locale)`; if it has blocks, render
   `<CmsBlocks>` (full replacement) or pick specific fields off specific
   block types (partial override); else fall through to the existing
   hardcoded JSX, unchanged.
5. Add `CMS_SLUG: "/the/route/path"` to `PREVIEW_PATHS` in
   `admin/components/pages/LivePreviewPane.tsx`.
6. Verify live in both directions — publish, confirm the route changes;
   unpublish, confirm it reverts — before calling it done. Don't trust a
   plain-text substring search on the rendered HTML: next-intl serializes
   the *entire* locale message catalog onto the page for client hydration,
   so a naive `.includes()` can match translation strings that were never
   actually rendered. Check real DOM tags (`<h1>`, `<h2>`, `<details>`, a
   JSON-LD `<script>`'s own parsed content) instead.

## 13. What's not built

- ~~**Disponibilités**~~ **Done, scoped narrowly on purpose.** This one
  hit a real modeling gap, not just a feature gap: the backend has no
  "Accommodation" entity (Desert Tent / Desert Room / Dune Suite) at all —
  that model exists only in the frontend's seed data (DI-012, not yet
  migrated). Building availability against it would mean inventing a
  second, competing definition of a thing the platform hasn't decided on
  yet. Confirmed the scope with the user before writing code (per
  CLAUDE.md's "if a task touches something undecided, stop and ask") and
  built against **TourType** instead — the real, already-CRUD'd backend
  entity — and **read-only, additive-only**: zero changes to
  `ReservationServiceImpl` (1,788 lines, explicitly flagged in CLAUDE.md
  as needing tests before any refactor).
  `AvailabilityBlock` (`tourType`, `date`, `note`, unique per
  tourType+date) is a brand new, isolated table — a staff-entered "not
  taking bookings this day" marker with **no effect on the booking flow
  itself** (that's real and stated plainly in the page's own copy, not
  glossed over). `/api/availability/calendar?tourTypeId=&month=` merges
  two independently-read sources: real occupancy counts from
  `ReservationTourType` (a brand new additive repository query, filtered
  to exclude `CANCELLED`/`REJECTED` reservations, joined only to read
  `Reservation.status` — never calls `ReservationService` or
  `ReservationServiceImpl`) and any manual block for that day. No
  computed "% full" anywhere: `TourType` has no capacity field to divide
  against, so showing one would mean inventing a number, not reading one.
  `/catalogue/disponibilites` — tour + month picker, one row per day
  (real reservation count, real adult/child totals, open/closed status),
  block/unblock inline. Verified live end-to-end: real calendar days,
  block creation reflected immediately, duplicate-block correctly
  rejected as 409, delete confirmed via a follow-up read, all through
  both a direct API client and the admin's own proxy routes (the exact
  path the UI itself calls) — no leftover test data.
- ~~**Rôles & permissions**~~ **Done, deliberately read-only.** Roles
  (`CLIENT`/`PARTENAIRE`/`CAMPING`/`ADMIN`) are a fixed enum backed by
  Keycloak realm roles, not a database table — this page does not try to
  make them one. A free-form roles/permissions CRUD would fabricate a
  second, fake source of truth next to the real one and risks reopening
  the exact "caller-supplied role" hole CLAUDE.md documents as already
  closed once. This directly touches `docs/OPEN-QUESTIONS.md` Q9
  ("role-aware shell?", still unanswered) — asked the user before
  building rather than guessing, per the "stop and ask" rule.
  `/administration/roles` shows, per role, a real user count
  (`getUserCountsByRole` — one `searchUsers` call per role, `size=1`, only
  `totalElements` read) and a short prose description of what it covers.
  Below that, a live table of every `@PreAuthorize` rule actually guarding
  the backend: `SecurityOverviewServiceImpl` reflects over the running
  `RequestMappingHandlerMapping` (the app's own, disambiguated from
  Actuator's `controllerEndpointHandlerMapping` via `@Qualifier` — Spring
  Boot 4 registers both) rather than a hand-copied table, specifically
  because a hand-copied table drifts the moment someone adds an endpoint
  and forgets to update it — which is how the `/api/notifications` IDOR
  gap and the guide/booking-source deletion holes went unnoticed. Endpoints
  with no `@PreAuthorize` are flagged in the UI (filterable by "Sans
  règle") rather than hidden — confirmed live that this correctly surfaces
  `NotificationController`'s unguarded routes, the exact known gap CLAUDE.md
  already documents. `GET /api/admin/security-overview/endpoints`, ADMIN
  only, is read-only and returns structural metadata about the app's own
  routing table — no sensitive data.
- ~~**Media Library**~~ **Done.** Local-disk storage, deliberately —
  `MediaAsset` (`assetId`, `filename`, `storedFilename` UUID-prefixed on
  disk, `mimeType`, `sizeBytes`, `companyType`, `createdAt`), no
  draft/publish, full CRUD at `/api/media` (ADMIN). `MediaServiceImpl`
  enforces an 8 MB size cap and an image-only MIME allowlist
  (jpeg/png/webp/gif/svg) at upload time — both also declared in
  `application.yml`'s `spring.servlet.multipart` limits so a request over
  the cap never reaches the service layer at all. Files are served
  publicly and unauthenticated at `/media/**` via `WebConfig`'s
  `addResourceHandlers` (`permitAll` for `GET` in `SecurityConfig`, right
  after the `/api/public/**` rule) — a URL an editor copies into a block's
  "Image (URL)" field has to actually resolve on the live site, so it
  can't sit behind the ADMIN-only `/api/media` collection endpoint.
  `MediaController` rewrites each response's relative `/media/xyz.jpg`
  into an absolute URL via `ServletUriComponentsBuilder` before it ever
  reaches the admin UI, so a copied link works regardless of which host
  served the page.
  `admin/app/api/proxy/media-upload/route.ts` is a **second**, dedicated
  proxy route — the generic `app/api/proxy/[...path]/route.ts` passthrough
  hardcodes `Content-Type: application/json` and reads the body as text,
  which would corrupt a multipart upload. This one rebuilds a real
  `FormData` and lets `fetch` set its own boundary.
  One real bug found and fixed while verifying this: a request for a
  missing/deleted file under `/media/**` returned 500, not 404. Spring's
  own `NoResourceFoundException` (its default 404 for an unmatched static
  resource) was being caught by `GlobalExceptionHandler`'s
  `@ExceptionHandler(Exception.class)` catch-all before Spring's normal
  404 resolution ran. Fixed with an explicit
  `@ExceptionHandler(NoResourceFoundException.class)` returning 404,
  placed before the generic handler — the same "most specific handler
  wins" pattern the file's `BusinessException` comment already documents.
- ~~**Blocks-as-a-reusable-collection**~~ **Done.** A `ContentBlock` entity
  (label, type, dataJson, locale, companyType — same shape as one `Page`
  block, plus an admin-only `label` so an editor can tell "Summer promo"
  from "Winter promo" in a list) with full CRUD at `/api/content-blocks`
  (ADMIN). A Page references one via a new `blockReference` block type
  (`{"blockId": "..."}`) — never a type the vitrine sees directly:
  `PublicPageController.resolveBlock()` substitutes the referenced block's
  real `type`/`data` before the response leaves the backend, falling back
  to an empty `richText` block for a dangling or unset reference rather
  than 500ing or leaking a raw `blockReference` type downstream. Live
  preview mirrors the same resolution client-side in
  `LivePreviewPane.tsx` (fetches `/api/content-blocks` once, resolves
  before `postMessage`) — the iframe itself still never talks to the
  backend, only this app does the lookup.
  `admin/components/pages/BlockFieldsEditor.tsx` is the other real change
  here: the per-block field form (typed fields, the repeater, the
  accommodation picker) was pulled out of `PageBuilder.tsx` so the new
  standalone block editor (`ContentBlocksCrud.tsx`) could reuse the exact
  same UI for editing one block outside any page, instead of a second
  copy. A reusable block can be any type except `blockReference` itself
  — referencing a reference would resolve infinitely.
- ~~**Pages SEO**~~ **Done.** `app/(app)/seo/pages/page.tsx` — a read-only
  overview table of every `Page`, reusing the exact same `seoChecks()`
  logic the per-page SEO tab uses (moved to `admin/lib/seo.ts` so there's
  one source of truth, not two copies that could drift). Shows per-page
  error/warning counts and whether `seoTitle`/`metaDescription` are set;
  clicking a row opens that page's real editor. Needed zero new backend —
  pure aggregation of data the Pages collection already returns.
- ~~**Redirections**~~ **Done.** `Redirect` (`fromPath` unique, `toPath`,
  `statusCode` 301/302, no draft/publish) — full CRUD at `/api/redirects`
  (ADMIN), plus `/api/public/redirects` (permitAll) returning the full
  list unfiltered. Deliberately distinct from the DI-022 legacy WordPress
  slug rewrites in `frontend/next.config.ts`
  (`LEGACY_STAY_SLUGS`/`LEGACY_ACTIVITY_SLUGS`): those are invisible,
  build-time rewrites that keep an *existing* ranking URL as canonical and
  never change; this is for a URL that's going away, going forward (e.g. a
  Page's slug gets renamed in the CMS). Two validations reject bad state
  before it reaches the DB's unique constraint as a raw 500: a
  self-redirect (`fromPath === toPath`) and a duplicate `fromPath`, both
  409s with a real message.
  `frontend/middleware.ts` — previously only `next-intl`'s
  `createMiddleware` — now fetches the public redirect list (best-effort
  in-memory cache, 60s TTL, since middleware runs in the Edge runtime
  where instances can recycle) and checks the incoming pathname against it
  *before* handing off to `next-intl`'s middleware. No backend configured,
  or a fetch failure, means an empty list and zero redirects fire — same
  "fail open, never blank the page" convention as every other CMS
  fallback in `lib/api.ts`. Verified live: created a redirect via the API,
  confirmed the frontend actually issued a real `301` with the correct
  `Location` header for that exact path, confirmed an unrelated route
  (`/activities/`) still served normally, deleted the redirect, confirmed
  the count went back to 0.
- ~~**Sitemap**~~ **Done, and deliberately not a rebuilt copy.**
  `admin/lib/sitemap.ts` fetches the vitrine's own live `/sitemap.xml` at
  request time and parses it with a small regex-based reader (no new XML
  dependency for a format this narrow and well-defined) — this is the
  actual file Google receives, not a second implementation of
  `frontend/app/sitemap.ts`'s logic that could quietly drift from it.
  Same `NEXT_PUBLIC_FRONTEND_URL` convention `LivePreviewPane.tsx`
  already uses, kept out of `lib/api.ts` since that module's own doc
  comment reserves it for the Spring Boot backend. `/seo/sitemap` shows
  every URL with its priority/changefreq/hreflang count, and flags three
  real structural facts computed from the parsed data itself — duplicate
  `loc`s, a missing `x-default` alternate, an hreflang count that differs
  from what most other entries have (compared to the *mode*, not a
  hardcoded "7", so it never needs updating if a locale is added or
  removed) — nothing scored or invented. A fetch failure (vitrine not
  running) degrades to an explicit "vitrine injoignable" message, never a
  crash. Verified live: rendered through a real authenticated admin
  session, showed the actual 66 URLs the running vitrine serves, matched
  exactly against a direct `curl` of the same `/sitemap.xml`.
- ~~**Audit SEO**~~ **Done.** The one section this pass that's a genuine
  crawler, not a read of one existing artifact: `admin/lib/seoAudit.ts`
  fetches every real URL from the Sitemap overview above and checks the
  *actual rendered* `<title>`/`<meta description>`/`<link canonical>` of
  each one — unlike Pages SEO, which only ever sees what an editor typed
  into the CMS form. This is what caught a real bug while building it: the
  sitemap's URLs didn't have the trailing slash the site's own
  `trailingSlash: true` config requires, so every non-homepage sitemap
  entry 308-redirected instead of serving directly — fixed in
  `frontend/app/sitemap.ts` (a `withTrailingSlash()` helper wrapping every
  URL and hreflang alternate it builds), confirmed live via
  `curl`. `/seo/audit` flags real, computed facts: missing/wrong-length
  title or meta description (same 30–60 / 70–160 thresholds as
  `admin/lib/seo.ts`, one convention across the backoffice), a missing or
  mismatched canonical tag, and duplicate titles/descriptions across
  different URLs — genuinely found some real ones on the current site,
  not manufactured for the demo. Fetches are cached 30 minutes per URL
  (`next: { revalidate: 1800 }`) specifically so opening this page
  repeatedly doesn't add real crawl load to the public site — confirmed
  live: an uncached run over the vitrine's 66 URLs took ~12s, a cached
  repeat took ~1s.
- ~~Navigation's admin side is built; the vitrine doesn't consume it yet.~~
  **Done.** `app/[locale]/layout.tsx` fetches `getNavigation(locale)`
  alongside `getActivities`/`getStays`; a non-empty result (something
  authored for that locale) wins over the hardcoded `nav` array from
  `lib/site.ts`, resolved into `{label, href, menu}` *before* it reaches
  `Header.tsx` — the component itself doesn't know or care which source it
  came from, it just maps over `navItems`. `menuType`
  (`NONE`/`EXPERIENCES`/`STAYS`) only decides *which* item triggers a
  mega-menu; the dropdown's actual cards still always come from live
  `activities`/`stays` data, exactly as before. Verified live: fallback
  labels matched the original hardcoded French nav exactly
  (`Le campement`/`Expériences`/`Séjour`/`Galerie`/`Sécurité`/`Contact`);
  publishing 3 CMS items replaced desktop nav, mobile drawer, *and* kept
  the mega-menu working under the CMS-flagged `EXPERIENCES` item; deleting
  them (0 items again) reverts to the fallback path, same ternary already
  exercised the other way. Hover/keyboard state now keys off `item.href`
  instead of the old `item.labelKey`, since a CMS label is no longer a
  stable identifier the way a translation key was.
- **`accommodationShowcase` doesn't render publicly** — no public endpoint
  resolves `TourType` ids into cards yet.
- **The `contact` live-preview fidelity gap** — see [§7](#7-live-preview).
- **No test coverage** of the public pages endpoint, the BFF proxy, or the
  postMessage preview flow.
- **`admin/lib/api.ts` has its own request/response types**, independent
  of `packages/api-types` — drift risk between the two apps' understanding
  of a `Page`'s shape exists but hasn't been paid for yet.
- **No `.env.example` entry** for `NEXT_PUBLIC_FRONTEND_URL` in either app
  — falls back to `http://localhost:3000` locally, needs setting explicitly
  anywhere else.

## 14. File map

```
scripts/seed-cms-pages.py    one-time content migration — see §9

backend/src/main/java/com/camping/duneinsolite/
├── controller/publicapi/PublicPageController.java   GET /api/public/pages/{slug}
├── dto/response/publicapi/PublicPageResponse.java   wire shape, blocks as real JSON
├── service/PageService.java                         getPublishedPageBySlug(...)
└── service/impl/PageServiceImpl.java

admin/components/
├── pages/
│   ├── PagesEditor.tsx        the 3-column layout, tabs, sidebar, save/publish
│   ├── PageBuilder.tsx        the Blocs tab — add/reorder/duplicate/delete
│   ├── SeoEditor.tsx          the SEO tab — SERP preview + seoChecks()
│   ├── blockTypes.tsx         BLOCK_TYPES registry — the source of truth
│   └── LivePreviewPane.tsx    iframe host, PREVIEW_PATHS map, width selector
└── payload/
    ├── fields.tsx             FieldDef union, FieldInput
    └── RepeaterField.tsx      add/remove/reorder list of objects

frontend/
├── lib/api.ts                 getCmsPage(slug, locale)
├── components/
│   ├── CmsBlocks.tsx           block → JSX, groupRuns(), extractFaqs()
│   └── LivePreview.tsx         what renders inside the admin's iframe
└── app/[locale]/
    ├── legal/privacy/page.tsx  full replacement
    ├── legal/terms/page.tsx    full replacement
    ├── safety/page.tsx         full replacement + FAQPage JSON-LD from CMS
    ├── about/page.tsx          full replacement (content) + fixed Experience/CTA
    └── contact/page.tsx        partial override (hero title/lead only)
```
