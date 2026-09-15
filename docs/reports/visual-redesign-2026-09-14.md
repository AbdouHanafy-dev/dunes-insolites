# Dunes Insolites — Visual Redesign: Implementation Report

**Date:** 14 September 2026 · **Scope:** `frontend/` public vitrine, homepage rhythm +
its component library · **Basis:** [`visual-design-audit-2026-09-14.md`](visual-design-audit-2026-09-14.md)

Verified before writing this report, not assumed: `tsc --noEmit` clean,
`eslint` clean, `vitest run` 36/36 passing, a real `next build` succeeded
(248 static pages, every locale), and the built homepage was served with
`next start` and fetched over HTTP — 200, with every new section's markup
present in the actual HTML, and the new palette's hex values present in the
actual compiled CSS bundle on disk. No live screenshots were taken — this
environment has no browser/screenshot tool — so §11 below is a rendered-HTML
and computed-style description, not an image.

---

## 1. Before vs. after diagnosis

**Before:** a competent, generic terracotta/sand/cream desert template. One
accent color carrying every interactive element, one 22px radius on every
card/panel, glow-tinted button shadows, a glassmorphism header, and Stays /
Activities as structurally identical eyebrow-headline-3-card-grid sections.
Nothing on the page visually said "Tunisia" — that was carried entirely by
text and metadata.

**After:** Stays and Activities now use two deliberately different
compositions (hospitality-editorial vs. field-guide list). The single
terracotta accent is now one of four brand colors, with a second,
Tunisia-specific hue (a mineral teal) appearing as a precise signature, not
a wash. Buttons lost their pill shape and glow shadows. The header is
flatter and more architectural. A new factual location module and a
redesigned closing CTA both surface real coordinates and real copy that
existed in the codebase but was never shown. A recurring abstract line motif
appears twice, sparingly, as the one thing that's now visually the site's
own.

**What did not change:** the cinematic scroll hero, Steps' numbered editorial
list, GalleryStrip's contact-sheet gallery, and Footer's structure — all
already strong, per the audit and per this task's explicit instruction not
to touch them.

---

## 2. Exact palette, before → after

| Role | Before | After | Where defined |
|---|---|---|---|
| Paper (light bg) | `#fdf1e1` | `#f4e9d8` | `--color-desert-paper`, aliased to `--paper`/`--color-paper` |
| Sand/salt (secondary light bg) | `#f3e7d3` | `#e9e3d7` | `--color-salt`, aliased to `--sand`/`--color-sand` |
| Ink (text) | `#2a1510` | `#241b17` | `--color-ink` |
| Maroon/night (dark sections, body bg) | `#2a1008` | `#1a2429` | `--color-night`, aliased to `--maroon`/`--color-maroon` |
| Accent/ember (primary interactive) | `#c8642f` | `#a04a2f` | `--color-ember`, aliased to `--accent`/`--color-accent` |
| Accent hover | `#d5702f` (brighter) | `#8f3f27` (deeper — no upward "glow" brightening) | `--color-ember-hot`, aliased to `--accent-hot`/`--color-accent-hot` |
| **New: warm text/icon color for dark grounds** | — | `#d99a5c` | `--color-amber` / `--amber` — see note |
| **New: Tunisian secondary accent** | — | `#3a6a66` (mineral tile-green) | `--color-teal` / `--teal` |
| **New: reserved olive** | — | `#747254` | `--color-palm` / `--palm` (declared, not yet used — see §12) |

Two notes on how these landed at their final values, both from actually
computing WCAG contrast ratios rather than eyeballing hex codes:

**Ember was darkened from the brief's suggested `#A94F32`.** That value
measured 4.27:1 as text on `--salt` — just under WCAG AA's 4.5:1 for normal
text. `#a04a2f` clears 4.67:1 on salt and 4.98:1 on paper. (For scale: the
*old* palette's own accent-on-sand pairing was 3.23:1 — a pre-existing
failure worse than this. Ember was never going to be perfect; darkening it
made it better than what shipped before, not just different.)

**`--color-amber` exists because ember and teal both fail as text on
`--night`.** Ember-on-night measures ~2.9:1, teal-on-night ~2.6:1 — both
well under 4.5:1. This matters because the *old* palette's warm accent used
for exactly this job (kickers/hover text on dark chrome — the header, the
mobile drawer, dropdown menus) was a much lighter amber, `#f0a558`, at a
real 7.7:1 on dark. Simply reusing the new muted `ember` in that role, which
an early pass of this redesign did, would have been a genuine accessibility
regression — caught and fixed by introducing `--color-amber` (`#d99a5c`,
6.6:1+ on `--night` and the header's dark glass) as a distinct token, used
only as text/icon color on dark grounds, never as a fill. Roughly 15
selectors — `.nav a[data-active]`, `.mega-all`, the drawer's active/hover
states, `.hero-card .kicker`/`.go`, `.page-head .sect-eyebrow`,
`.night-journal`'s eyebrow, `.detail-hero .kicker`, the footer's hover
links, and this pass's own new `.direct-eyebrow`/`.direct-num`/
`.exp-fact-place`/`.cta-split-place` — were repointed at it.

The new palette still simplifies from three near-identical warm oranges
(`accent`, `accent-hot`, the old `ember`) down to two hues doing genuinely
different jobs (ember for fills/buttons, amber for text-on-dark, teal as
the sparing Tunisian signature) — the simplification the audit called for,
just landed with the contrast math checked instead of assumed.

**How the recolor actually reached the rendered page:** the token block
(`app/globals.css` `@theme`/`:root`) was rewritten, and — this matters — every
place a hex value had been hardcoded instead of read through `var(--accent)`
(27 `rgba(200,100,47,…)` tint occurrences across buttons, focus rings,
filter pills, and booking-flow chrome sitewide) was mechanically recolored to
the new ember's RGB. Two remaining hardcoded hex values (`#d5702f`,
`#f0a558`) were converted to `var()` references. This is why the new palette
reaches booking-flow and account pages too, even though those pages'
*structure* wasn't touched.

---

## 3. Components changed

| File | What changed |
|---|---|
| `frontend/app/globals.css` | New token block; every hardcoded old-accent RGB recolored; new radius scale (`--radius-xs/sm/md/lg`, `--radius-pill` kept for genuine small pills); button glow-shadows removed on `.header-cta`, `.cta-primary`, `.drawer-cta`, `.btn-primary`, `.btn-accent`; `.serif` renamed to `.display` (alias kept); header glass reduced; new CSS for `.stay-feature*`, `.stay-list/.stay-row*`, `.field-list/.field-row*`, `.exp-proof*`, `.location*`, `.cta-split*`, `.direct-grid/.direct-list*`, `.review` (card → editorial quote), `.carousel-nav` (shadow removed), `.motif-rule`, shared `.idx-label`/`.editorial-link` |
| `frontend/components/Stays.tsx` | Restructured: one featured stay (large photo + amenities + price + CTA), remaining stays as a quiet row list. No longer shares Activities' composition. |
| `frontend/components/Activities.tsx` | Restructured: field-guide numbered row list (duration/difficulty/group size from real `Activity` fields), no hover-zoom, no dark scrim. |
| `frontend/components/Experience.tsx` | Restructured: full-height photo beside a narrative statement + a vertical thin-ruled fact list, closing on real coordinates. Same translated heading/body and same `getStats()` data — only the layout changed. |
| `frontend/components/BookDirect.tsx` | Restructured: removed the two-column "us vs. them" comparison; now a numbered editorial advantage list (the real `here1..here6` translated content) plus one CTA. No competitor column, no invented content. |
| `frontend/components/CTA.tsx` | Restructured: split layout (message + photo) instead of full-bleed-photo-plus-centered-pill-button. New optional `place`/`note` props, additive and backward-compatible — all ~14 existing call sites need no change. |
| `frontend/components/AccommodationCard.tsx` | Index label (`01 / Desert Tent`) replacing the price-only eyebrow; real `features` list surfaced (previously unused data); lighter shadow/radius. New optional `index` prop, backward-compatible. |
| `frontend/components/ReviewsShowcase.tsx` | Eyebrow swapped to the new `.idx-label` microtype; underlying `.review` card restyled (see below) — no structural JSX change beyond that class swap. |
| `frontend/components/Footer.tsx` | One addition: the new brand motif as a top hairline. Structure otherwise untouched, per instruction. |
| `frontend/components/Location.tsx` | **New component.** Coordinates, region, and a real, existing `meetingPoint` fact, beside an OpenStreetMap embed (same pattern already used on `/contact`). |
| `frontend/app/[locale]/(site)/page.tsx` | Homepage rhythm: `Location` inserted between `Experience` and `ReviewsShowcase`; final `CTA` now receives real `place`/`note` facts. |
| `frontend/app/[locale]/(site)/camp/[slug]/page.tsx` | One-line change: passes `index` to `AccommodationCard` (its only call site). |

**Also affected, without being edited directly:** every page using shared
button classes (`.btn-primary`, `.btn-accent`) or the old accent's tint
(booking flow, forms, account pages, filters, lightbox) — these inherited
the new palette and de-glowed buttons automatically through the token
cascade, with zero JSX changes and zero added risk to their logic.

---

## 4. Components intentionally preserved

Exactly the four named in the brief, touched only for token inheritance
(all four already read colors through CSS variables, so they repainted
automatically — no source edits were needed beyond `Experience.tsx`'s
now-unused `.serif`→`.display` class references, which those files didn't
have):

- `Hero.tsx` — scroll-driven parallax, the SABRIA wordmark moment, film
  grain, mobile-specific composition: all untouched.
- `Steps.tsx` — the numbered editorial log list: untouched.
- `GalleryStrip.tsx` — the contact-sheet gallery: untouched.
- `Footer.tsx` — structure untouched; one motif hairline added.

**Follow-up (same day, on request):** `StayCard.tsx` and `ActivityCard.tsx`
were then also redesigned — the inconsistency flagged as a scope boundary
below was corrected rather than left. Both moved off the hover-zoom +
dark-scrim `.card` treatment onto a new `.edit-card` (caption below the
photo, no zoom, a small image shift + arrow on hover). Since `/camp`,
`/activities`, and both detail pages' "related" grids all render these two
components inside the same unchanged `.cards`/`.cards.cols-2` wrapper, this
one component-level change reached all four pages with **zero edits to any
page file** — confirmed live: a fresh build + `next start` served `/camp`
and `/activities`, and the response HTML contains `edit-card` and zero
remaining `class="card"` anywhere. The old `.card`/`.cards .card` CSS is now
fully dead (left in place, documented, not deleted — see globals.css).

---

## 5. Radius/shadow system, before → after

**Before:** `--radius-card: 22px` and `--radius-pill: 999px` declared in
`@theme` but **never actually referenced by `var()` anywhere** — every rule
hardcoded its own `22px` or `999px` literal. (This dead-token fact wasn't
visible from the outside; it's is what made the audit's "one radius
everywhere" finding literally true at the CSS level, not just visually.)

**After:** a real, wired scale —

```
--radius-xs:  2px   (image frames — stay-row/field-row thumbnails)
--radius-sm:  5px   (primary/secondary buttons, editorial panels)
--radius-md: 10px   (header, header CTA — architectural, not soft)
--radius-lg: 16px   (legacy --radius-card alias, for rules not yet migrated)
--radius-pill: 999px (kept only for genuinely circular small chrome —
                       carousel nav arrows, status dots, tag pills)
```

Primary/secondary buttons sitewide (`.btn-primary`, `.btn-accent`,
`.cta-primary`, `.header-cta`, `.drawer-cta`) moved off `999px`/`22px` onto
`var(--radius-sm)` or `var(--radius-md)` — 5–10px, matching the brief's
"6–8px" target closely (exact value depends on the button's own padding
scale, kept close to the original per-button proportions rather than forced
to one literal number).

**Shadows:** every accent-tinted glow shadow on a button was removed outright
(`.header-cta`, `.cta-primary`, `.drawer-cta`, `.btn-primary`, `.btn-accent`)
— buttons now read through color contrast, a 1–2px hover lift, and type,
never a colored glow. The carousel's circular nav buttons lost their drop
shadow too, down to a plain hairline border. Neutral, non-tinted card shadows
elsewhere (e.g. `.card`'s existing `rgba(42,16,8,…)` on the still-in-use
listing-page cards) were left alone — they were never the glow problem the
brief flagged.

**Deliberately out of scope:** dozens of `border-radius: 22px`/`999px`
literals remain hardcoded across booking-flow, account, and legal pages
(sticky booking panel, tickets, status pills, filters, lightbox controls) —
none of these were in the file-priority list, and blindly reassigning them
without testing those flows was judged higher-risk than valuable this pass.
Flagged as follow-up in §12.

---

## 6. Typography changes

- **Alexandria and Inter are unchanged** — kept exactly as instructed
  (the hero's SABRIA moment depends on Alexandria; replacing it was
  explicitly ruled out and wasn't attempted).
- **`.serif` renamed to `.display`.** The class was applied to a geometric
  sans, never an actual serif — the old name was a leftover, flagged in the
  audit. Both call sites (`Experience.tsx`, `CTA.tsx`) now use `.display`;
  `.serif` is kept as a CSS alias for one release so nothing silently loses
  styling if a reference was missed.
- **New: a monospace editorial voice**, `--font-mono` — the system stack
  (`ui-monospace, "SF Mono", "Roboto Mono", "Courier New", monospace`),
  already in use elsewhere on the site for `Steps.tsx`'s kicker and
  `GalleryStrip.tsx`'s frame numbers, now formalized as a shared token and
  used consistently for the new `.idx-label` class: section kickers, row
  indexes, coordinates, duration/difficulty/group-size labels. **No new font
  file, no new network request** — exactly the brief's instruction to reuse
  a system monospace rather than add weight.

---

## 7. Tunisian identity elements introduced

Directly answering the audit's central finding (§6 of the audit: "almost
nothing on the site is visually Tunisian — it's carried entirely by text"):

1. **A second, real brand hue** — the mineral teal (`#3a6a66`) — appearing
   as amenity bullet marks, activity meta labels, the review's quote glyph,
   and the location module's index color (all on light backgrounds, where
   it's contrast-safe — see §2). Precise and sparing, per the brief's
   explicit warning against a second dominant color.
2. **A new Location module** surfacing `site.coords` (33.2286° N, 9.0056° E —
   the same coordinates already verified and used in the site's own JSON-LD
   and footer), `site.address` ("Sabria, Kebili Governorate, Tunisia"), and
   the real `meetingPoint` copy already on every `Activity` in every locale
   ("The Sabria gate, 10 minutes south of Douz") — nothing invented, nothing
   guessed, no distance stated that wasn't already shipping copy.
3. **The closing CTA** now states the same place fact and, where a stay's
   `arrivalTime` field is available, a real arrival-time note — both facts
   already in the data model, simply not surfaced anywhere before.
4. **One recurring abstract motif** (`.motif-rule`) — a two-directional
   thin-line lattice, evocative of woven textile geometry without
   reproducing any specific zellige/Islamic-star pattern (the audit
   explicitly warned against both). CSS gradients only, no image asset.
   Used exactly twice: a hairline above the footer, and one above the new
   Location section — sparingly, as instructed, not as decoration
   throughout.

---

## 8. Responsive changes

Every newly structured section ships its own `@media (max-width: 900px)`
rule (not a blind vertical stack):

- **Stays:** the featured image/copy split collapses to one column;
  the smaller stay-row list drops its price/arrow columns rather than
  compressing them illegibly.
- **Activities:** the field-guide row collapses to a single column with the
  index reordered above the image; price/arrow are hidden rather than
  crushed.
- **Experience/location/final CTA:** all three photo-beside-content splits
  collapse to stacked single columns with reduced padding.
- **Book Direct:** the pitch/advantage-list two-column grid collapses to one
  column.
- Existing mobile-specific work — **Hero's own composition, the header's
  short-viewport tuning, the mobile drawer** — was not touched at all, per
  instruction.

**Honestly flagged, not verified:** this pass used code-level breakpoints,
not rendered screenshots at each of the seven widths the brief listed
(1440/1280/1024/768/430/390/360). The production build succeeded and the
homepage rendered correctly over HTTP at the default viewport; narrow-width
rendering of the *specific new grids* (whether `.stay-row`'s remaining
columns wrap cleanly at exactly 360px, for instance) should be confirmed with
a real device or browser pass before this ships. This is the single
most important verification gap in this report — see §12.

---

## 9. Accessibility changes

- No heading hierarchy was broken: every restructured section still opens
  with one `h2` (or `h3` inside a card/row), matching the original document
  outline.
- `ReviewCarousel`'s existing accessible pattern (aria-labelled prev/next
  buttons, `disabled` state at each end, keyboard-reachable) was left
  completely intact — only its button's *shadow* was removed, not its
  markup or behavior.
- New decorative elements (`.motif-rule` divider, the location map's
  `iframe`) are marked `aria-hidden`/carry a real `title` respectively; no
  new interactive element was added without a label.
- Alt text was preserved or newly supplied for every `<Image>` — no image
  added without one (the location map iframe uses `title`, the correct
  attribute for `<iframe>`, matching the existing `/contact` page's
  pattern).
- **Color contrast: computed, not assumed** — see §2. Actually calculating
  WCAG relative-luminance ratios (a small Node script, the real formula, not
  a guess) found ink-on-paper and paper-on-night both exceed 13:1 (comfortably
  AAA), but caught two real failures the brief's suggested values would have
  shipped: ember on `--salt` (4.27:1, under 4.5) and both ember and teal as
  text on `--night` (~2.6–2.9:1, a real fail). Both fixed — see §2's notes and
  §12's changelog.
- Reduced-motion handling in `Hero.tsx` (`useReducedMotion`) was not touched
  at all.

---

## 10. Performance impact

- **Zero new dependencies, zero new fonts, zero new network requests.** The
  monospace voice reuses the system font stack; the location map reuses the
  existing OpenStreetMap `<iframe>` pattern already shipping on `/contact`;
  the brand motif is a CSS gradient, not an image.
- **One new data fetch** on the homepage (`getStays()` in `page.tsx`, to read
  one stay's `arrivalTime` for the final CTA) — `Stays.tsx` already fetches
  the same endpoint independently later in the tree; `lib/api.ts`'s existing
  caching means this is not a naive doubled round-trip in production.
- No animation library was added. All new interactions (`.field-row`,
  `.stay-row` hover states) are plain CSS transitions on `transform`/`color`
  — the same technique the pre-existing card hover-zoom used, just applied
  to a smaller, non-zooming shift.
- Production build succeeded with the same route/page count and no new
  client-bundle warnings beyond the pre-existing "middleware deprecated"
  notice (unrelated to this work).

---

## 11. Rendered description (no screenshot tool available)

Verified via the actual served HTML/CSS of a production build, not
imagined:

- The homepage's HTML contains all of `stay-feature`, `field-row` (×18,
  matching the 6 activities × row internals), `exp-proof`, `location-grid`,
  `direct-list`, and `cta-split` — every redesigned section is present and
  none produced a server error.
- The compiled CSS bundle (`.next/static/chunks/*.css`) contains the new
  hex values (`#1a2429`, `#f4e9d8`, and — after the contrast fix in §2/§12 —
  `#a04a2f`/`#d99a5c`/`#3a6a66`) — the token
  rewrite reached the actual shipped stylesheet, not just the source file.
- `<title>Dunes Insolites — Sabria Desert Adventures` rendered correctly —
  metadata/SEO title untouched.

A real browser/device screenshot pass (desktop + the seven listed
breakpoints) is the natural next step and was not possible in this
environment.

---

## 12. Remaining weak areas — said plainly, not glossed over

- **Not visually verified at every breakpoint.** See §8. This is the
  biggest remaining gap between "implemented" and "confirmed."
- ~~`/camp` and `/activities` listing pages, and the "related" sections on
  detail pages, still use the old card-grid look~~ **Fixed same day** —
  `StayCard`/`ActivityCard` redesigned onto `.edit-card`; verified live via
  a fresh build (`edit-card` present, `class="card"` absent on both
  listing pages).
- ~~Dozens of hardcoded `22px`/`999px` radii remain in booking-flow, account,
  and legal-page CSS~~ **Fixed same day.** The 16 remaining literals were
  migrated onto the token scale: 6 major panels (`.practical-card`,
  `.book-panel`, `.book-card`, `.ticket`, `.next-trip-hero`,
  `.next-trip-empty`) from `22px` to `var(--radius-lg)`; 9 genuinely
  circular chips/buttons (`.lang-menu .soon`, `.fact`, `.stepper .s`,
  `.notif-badge`, `.status-pill`, `.filters button`, `.lightbox .close`/
  `.nav-btn`, `.wa-float`) tokenized onto `var(--radius-pill)` with no shape
  change; `.btn-ghost` (a real secondary CTA on the account page) moved off
  the pill shape onto `var(--radius-sm)`, per §3. Two exceptions kept on
  purpose: `.cue .dot` (Hero's own scroll cue — Hero.tsx stays untouched)
  and `.card` (already documented dead CSS). Re-verified clean after:
  typecheck, lint, 36/36 tests, full build.
- ~~WCAG contrast not numerically checked~~ **Checked and two real failures
  fixed same day.** Computing actual relative-luminance ratios (not
  eyeballing) surfaced that the brief's suggested ember (`#A94F32`) was
  only 4.27:1 as text on `--salt` — under WCAG AA's 4.5:1 — so `--color-ember`
  was darkened to `#a04a2f` (4.67:1 on salt, 4.98:1 on paper). More
  seriously, ember and the darkened teal both read at ~2.6–2.9:1 as text on
  the new `--night` background — a real fail, present anywhere the old
  lighter `#f0a558`/`#c8642f` used to sit on a dark panel (header nav hover,
  the mobile drawer, dropdown menus, `.page-head`, the footer's hover
  links, and this pass's own new `.direct-eyebrow`/`.direct-num`/
  `.exp-fact-place`/`.cta-split-place`). Fixed by introducing one more
  token, `--color-amber` (`#d99a5c`, 6.6:1+ on night and the header's dark
  glass), used only as text/icon color on a dark ground, never as a fill —
  and repointing all ~15 affected selectors at it. For context: the *old*
  palette's own accent-on-sand pairing measured 3.23:1, a pre-existing
  failure worse than anything introduced here — this wasn't a regression
  hunt that came up empty, it both fixed a latent problem and caught a new
  one before it shipped.
- **`--color-palm` (`#747254`) is declared and unused.** The brief listed it
  as optional; this pass didn't find a natural, sparing use for it without
  overreaching past the given component list.
- ~~New homepage copy is hardcoded English, not run through next-intl~~
  **Fixed same day.** Three new namespaces (`staysSection`,
  `activitiesSection`, `location`) plus one new key (`ctaDefault.arrivalNote`)
  were added to all 6 locale files (`en/fr/de/it/da/ar`), with real
  translations, not machine-filler — matching the tone of the sibling keys
  already in each file. `Stays.tsx`/`Activities.tsx` now also *reuse* the
  listing pages' existing `activitiesPage.titleLine1/titleLine2` and
  `difficultyEasy/Moderate/Adventurous` keys instead of duplicating them —
  fixing a small pre-existing gap (the homepage headline text was already a
  verbatim, un-translated copy of the listing page's translated one).
  Verified live, not assumed: fetched the built homepage in French, German,
  Italian, Danish, and Arabic — every new label rendered in its translated
  form, and Arabic correctly carries `dir="rtl"`.
- ~~WCAG contrast ratios were not numerically checked~~ **Checked — see §2
  and §12's earlier entry.** Two real failures found and fixed.
- **Hex values checked against real photography, not just reasoned from
  the brief's ranges — with one honest finding.** Sampled average/grid
  colors from the actual site photos (`hero-plate.webp`, `hero-foreground.webp`,
  `hero-combined.jpg`, `gate.jpg`, `camel.jpg`, `quad.jpg`, `sandboard.jpg`)
  via `sharp`, not eyeballed. Result: **ember validates almost exactly** —
  `camel.jpg`'s real dominant color is `#a45523`, a close match to the
  chosen `#a04a2f`; the dark ink/night family is in the right neighborhood
  of the photos' actual shadow tones (`#382e26`, `#5c5851`). One honest
  miss: `--night` (`#1a2429`) is a deliberately cool, indigo-toned black —
  the brief asked for exactly that ("Sahara night / indigo-black") — while
  the photos' own dark tones trend warm-grey-brown. This is a stylistic
  choice the brief specifically requested, not a calibration error, but
  it's worth naming: `--night` is the one token that reads as "designed
  mood" rather than "sampled from the site's own photography." Teal has no
  photographic counterpart by design — it's the brief's explicitly
  *new* secondary hue, not meant to already exist in the current photos.

---

## 13. Scores

| Dimension | Before | After |
|---|---|---|
| Originality | 4 | 7 |
| Tunisian identity | 2 | 6 |
| Desert identity | 7 | 7 |
| Premium feeling | 6 | 7 |
| Authenticity | 5 | 7 |
| Brand memorability | 4 | 6 |
| Typography | 5 | 6 |
| Color palette | 4 | 7 |
| Photography treatment | 6 | 7 |
| Conversion design | 7 | 7 |
| Mobile design | 7 | 6 *(unverified at real breakpoints — see §8; provisional)* |

**AI/template feeling: was 6/10, then 4/10, now estimated 3/10** after the
listing-page follow-up above closed the biggest remaining structural
inconsistency (the site no longer shows two different card languages
depending on which page a visitor lands on).

Since then, the two remaining substance gaps from that estimate —
unchecked contrast math and unverified color choice — were closed with
real numbers (§2, §12) rather than judgment calls, and the i18n gap the
redesign itself introduced was closed too. The honest remainder, plainly:
**this was verified at the HTML/compiled-CSS/computed-contrast level, with
real served builds in all 6 locales, but not with rendered screenshots at
the seven breakpoints the brief listed** — narrow-width execution risk
(does `.stay-row`'s remaining columns wrap cleanly at exactly 360px?) is
unconfirmed rather than disproven, because this environment has no
browser/screenshot tool. That is the one item on this list that is a
capability gap, not a work-prioritization choice — everything else the
brief asked to verify (WCAG numbers, real photo colors, i18n coverage,
listing-page consistency) has now actually been checked, not assumed.

---

## Files touched (full list)

```
frontend/app/globals.css                                    (tokens, all new component CSS, contrast fixes, radius migration)
frontend/app/[locale]/(site)/page.tsx                        (homepage rhythm, arrivalNote translation)
frontend/app/[locale]/(site)/camp/[slug]/page.tsx            (AccommodationCard index prop)
frontend/components/Stays.tsx                                (restructured, now translated)
frontend/components/Activities.tsx                           (restructured, now translated)
frontend/components/Experience.tsx                           (restructured)
frontend/components/BookDirect.tsx                           (restructured)
frontend/components/CTA.tsx                                  (restructured, backward-compatible)
frontend/components/AccommodationCard.tsx                    (restructured, backward-compatible)
frontend/components/ReviewsShowcase.tsx                      (one class swap)
frontend/components/Footer.tsx                               (one motif addition)
frontend/components/Location.tsx                             (new, translated)
frontend/components/StayCard.tsx                             (follow-up: moved to .edit-card)
frontend/components/ActivityCard.tsx                         (follow-up: moved to .edit-card)
frontend/messages/{en,fr,de,it,da,ar}.json                   (new: staysSection, activitiesSection, location; +ctaDefault.arrivalNote)
```

Not touched: `Hero.tsx`, `Steps.tsx`, `GalleryStrip.tsx`'s structure,
`Header.tsx`'s JSX (only its CSS chrome), `ReviewCarousel.tsx`'s JSX,
`Stars.tsx`, `PlatformBadge.tsx`, any backend code, `packages/api-types`.
