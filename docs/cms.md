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
| **Texte riche** (`richText`) | `content` — one textarea | the content, or "(vide)" |
| **Appel à l'action** (`cta`) | `title` (required), `buttonLabel`, `buttonUrl` — all text | the title, or "(vide)" |
| **FAQ** (`faq`) | `question` (required, text), `answer` (textarea) | the question, or "(vide)" |
| **Vitrine hébergements** (`accommodationShowcase`) | no flat fields — rendered specially, see below | "N hébergement(s) sélectionné(s)" |
| **Équipe** (`team`) | `heading` (text) + `members` (**repeater**, see [§5](#5-the-repeater-field)) | the heading, or "N membre(s)" |

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

- `richText`'s `content`: a line starting with `- ` opens/continues a
  bullet list (consecutive such lines → a real `<ul>`); anything else is a
  plain paragraph. A plain-text authoring convention, not Markdown.
- Consecutive `faq` blocks are **grouped** into one accordion
  (`<details>`/`<summary>`, exactly the markup the hardcoded safety page
  always used) instead of one section per question —
  `groupFaqRuns()` does this before rendering. `extractFaqs()` is exported
  separately so a route can pull the same `{question, answer}` pairs to
  build its own `FAQPage` JSON-LD from CMS content (see `safety/page.tsx`).
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
render. **With no CMS page published for any of them (true today — every
test page created while building this was deleted afterward), all five
render exactly what they always did.**

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

- **Blocks-as-a-reusable-collection, Media Library** — still `soon: true`
  in `components/Sidebar.tsx`. Both need real backend work (new entities,
  new controllers), not just admin UI.
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
│   ├── CmsBlocks.tsx           block → JSX, groupFaqRuns(), extractFaqs()
│   └── LivePreview.tsx         what renders inside the admin's iframe
└── app/[locale]/
    ├── legal/privacy/page.tsx  full replacement
    ├── legal/terms/page.tsx    full replacement
    ├── safety/page.tsx         full replacement + FAQPage JSON-LD from CMS
    ├── about/page.tsx          full replacement (content) + fixed Experience/CTA
    └── contact/page.tsx        partial override (hero title/lead only)
```
