# Dunes Insolites — Visual/Design Forensic Audit

**Date:** 14 September 2026 · **Scope:** `frontend/` only (the public vitrine) ·
**No code was changed to produce this report.** Every claim below is cited to
an actual file/line so the next redesign prompt can act on specifics instead
of impressions.

Read alongside [`ARCHITECTURE.md`](../../ARCHITECTURE.md) and the earlier
[`docs/reports/project-analysis-2026-09-14.md`](project-analysis-2026-09-14.md)
for the business/engineering context this doesn't repeat.

**One thing worth knowing before the rest of this:** the codebase already
contains one prior differentiation pass. `Steps.tsx`, `GalleryStrip.tsx`, and
`Footer.tsx` all carry comments referencing a (since-deleted) plan doc,
`audit-differentiation.md`, which explicitly flagged the old numbered-icon
grid, boxed hover-zoom gallery, and three-equal-column footer as matching a
named competitor's structure, and replaced them with the "Field Log" editorial
treatment you'll see praised below (§5, §11). **That work is real and holds
up.** It did not touch color, typography, the hero, the card components, or
`BookDirect`/reviews — which is where most of what follows still lives.

---

## 1. Current color palette

Defined in **one place**: `frontend/app/globals.css`, inside the Tailwind v4
`@theme` block (lines 6–23) and mirrored as plain CSS custom properties on
`:root` (lines 25–32). There is no `tailwind.config.*` file — this project
uses Tailwind v4's CSS-native theme, so these `--color-*` tokens *are* the
Tailwind config. No competing color source exists — no inline hex in
components, no second token set in `admin/` or `packages/api-types` bleeding
in. That part is disciplined.

| Token | Hex | Role | Where used |
|---|---|---|---|
| `--color-paper` | `#fdf1e1` | Primary light background (cream) | `.stays`, review cards' page ground, body text-on-dark contexts |
| `--color-sand` | `#f3e7d3` | Secondary light background | `.activities`, `.log-gallery`, `.review` card fill |
| `--color-ink` | `#2a1510` | Primary text on light backgrounds | headings, `.faq`, body copy |
| `--color-maroon` | `#2a1008` | Global `<body>` background + dark sections | `body`, `.site-header.menu-open`-adjacent dark panels, `.site-footer`, `.page-head` |
| `--color-accent` | `#c8642f` | **The** brand color — terracotta/burnt-orange | CTA buttons, `.sect-eyebrow`, active nav, `::selection`, log-index numerals |
| `--color-accent-hot` | `#d5702f` | Accent hover state | every `.cta-primary:hover`, `.header-cta:hover`, `.btn-accent:hover` |
| `--color-ember` | `#f0a558` | Secondary warm accent (amber/gold) | kicker labels, dot indicators, nav hover text, "soon" pills |
| `--muted` | `rgba(42,21,16,.66)` | Muted body text | every section's supporting paragraph |

**Gradients** — all functional (photo legibility), not decorative:
- Hero `.grade`: two radial + one linear dark gradient over the photo (lines 873–883) to seat text.
- `.card::after` (Stays/Activities cards): `linear-gradient(180deg, transparent 40% → rgba(20,8,4,.72))` — the standard "dark bottom scrim for card caption" gradient (line 1495–1500).
- `.page-head .bg::after`: near-identical vertical scrim (line 1418–1423).
- `.cta .bg::after`, `.exp .bg::after`: flat/linear scrims, same family.

No decorative brand gradient exists anywhere (no "sunset gradient button," no gradient text). That's actually a point in the palette's favor — see §7.

**Where else colors could hide, checked and clean:** no inline `style={{color:...}}` hex values in the component files read for this audit beyond two intentional exceptions (`BookDirect.tsx:52` sets an inline `rgba(253,241,225,.5)` for a de-emphasized label, and `ReviewsShowcase.tsx:42` sets a font-size only). No Tailwind arbitrary-value colors (`bg-[#...]`) found in the files inspected. Everything routes through the `--color-*` tokens or their raw hex twins on `:root`.

### Palette character

This is a **terracotta/sand/cream** desert palette with one warm amber accent
— structurally the single most common palette formula for "desert/Morocco/
adventure travel" sites globally. Reading down the checklist you asked about:

- **Generic:** partially — the *hue family* (burnt orange + cream + dark
  brown) is the default choice almost anyone reaches for when asked to
  design "desert." It is not wrong, but it is not chosen *for* Dunes
  Insolites specifically — nothing in the current three-color accent set
  (`#c8642f` / `#d5702f` / `#f0a558`) references Sabria, the Sahara at this
  latitude, or Tunisia's own visual vocabulary (see §6).
- **Desert:** yes, unambiguously — this is the palette's real strength.
- **Overly orange:** borderline. The single accent hue (`#c8642f`) is reused
  for *everything interactive* — every primary button, every active nav
  state, every eyebrow label, every hover, `::selection`. There is no second
  accent hue to relieve it (see §7).
- **Overly beige:** no — `paper`/`sand` are warmer and more saturated than a
  flat beige, and the dark maroon sections (footer, page headers, hero)
  give real contrast.
- **Luxury / premium:** the *palette* alone doesn't signal luxury one way or
  the other — luxury here is being carried by typography and imagery
  choices (§3, §8), not the colors.
- **Traditional Tunisian:** no. Nothing here draws on Tunisian tilework
  blues/greens, the Sahara's specific dune-at-dusk pink-violet range, or any
  motif specific to Kébili/Douz. It's a generic warm-desert triad.
- **Modern:** yes, in execution — flat colors, no dated gradients-on-gradients.

**Bottom line on color:** the palette is competent and on-theme, and it is
the least distinctive part of the identity. If a competitor showed you three
buttons in `#c8642f`, a cream card grid, and a dark-maroon footer, you could
not tell it apart from a dozen other Morocco/Jordan/Sahara operators from
color alone.

---

## 2. Why it can read as AI-generated / templated

Being specific and critical, with files:

| Pattern | Evidence | File |
|---|---|---|
| **One border-radius value used everywhere** | `--radius-card: 22px` is applied identically to: activity/stay cards (`.card`, line 1477), review cards (`.review`, line 3843), the accommodation card (`.accommodation-card`, line 2300), the `BookDirect` compare panels (`.compare .col`, line 4020), the language dropdown, the mega-menu panel. When one radius value governs a card, a comparison table, a photo tile, and a dropdown alike, the page reads as "one component library's default," not a designed system. | `globals.css` (multiple) |
| **Identical eyebrow → headline → paragraph → 3-col-grid skeleton** | `Stays.tsx`, `Activities.tsx` are **structurally identical** components: `<p className="sect-eyebrow">` → `<h2 className="sect-title">two-line-headline</h2>` → `<p>supporting copy</p>` → `.cards` grid of identical hover-zoom tiles. This is the single most recognizable "AI travel template" shape — it is copy-pasted almost verbatim between the two sections. | `components/Stays.tsx`, `components/Activities.tsx` |
| **Repeated hover-zoom photo card** | The exact same interaction — `object-fit: cover` photo, `transform: scale(1.07)` on hover, dark-bottom gradient scrim, caption pinned to the bottom-left — appears on Stays, Activities, and (as `.review`) reviews. Three different content types, one visual mechanic. | `.card:hover img` (line 1492), used by `StayCard.tsx`, `ActivityCard.tsx` |
| **Numbered kicker label above every headline** | `.sect-eyebrow` (small caps, letter-spacing, accent color) precedes almost every section headline — Stays, Activities, ReviewsShowcase, BookDirect, page-heads. It's a fine device once; used on 5+ sections it reads as a template's default heading pattern rather than an authored rhythm. | `globals.css:1375-1381`, used across components |
| **Glassmorphism header** | `backdrop-filter: blur(18px) saturate(1.15)` + translucent dark background + hairline border + inset highlight (lines 86–92) is the canonical "frosted glass navbar" — extremely common in template/SaaS design since ~2021, regardless of industry. | `.site-header`, `globals.css:72-95` |
| **Floating "preview card" over the hero** | `.hero-card` (lines 1116–1139): a glass card, `border-radius: 16px`, `backdrop-filter: blur(16px)`, hovering top-right of the hero with a photo + kicker + title + arrow. This exact device — a floating glass content card breaking out of a full-bleed hero photo — is a very common stock pattern in travel/SaaS hero sections. | `components/HeroExperienceCard.tsx`, styles at `globals.css:1116-1216` |
| **Pill buttons + heavy colored shadow** | `.btn-primary` (`border-radius: 999px`) and every accent button carries a colored drop shadow tuned to the button's own fill (`box-shadow: 0 10px 28px rgba(200,100,47,.4)`, repeated near-verbatim on `.cta-primary`, `.header-cta`, `.btn-accent`). Glow-shadow CTA buttons are a near-universal "premium SaaS" tell. | `globals.css:1744-1801` |
| **Generic icon-badge "here vs. there" comparison** | `BookDirect.tsx`'s two-column compare block (checkmark list vs. dot list, one column highlighted with a colored border) is a stock SaaS pricing-page pattern ("us vs. competitors") transplanted onto a travel booking pitch. | `components/BookDirect.tsx:34-67` |
| **Everything on the page is centered and symmetric** | The hero is centered; `Stays`/`Activities` headers are left-aligned but the card grids below are perfectly even 3-up grids; `Experience.tsx`'s stat row is three equal columns; `Steps.tsx` (post-differentiation) is the one section that breaks this into a real list. Almost every *other* section still resolves to a centered- or evenly-gridded block. | `Stays.tsx`, `Activities.tsx`, `Experience.tsx` |

**What's *not* on this list, credited fairly:** the hero (`Hero.tsx`,
`Header.tsx`) is genuinely bespoke — scroll-driven parallax across three
photographic layers, a custom cinematic wordmark reveal, hand-tuned easing
curves, real engineering (Core Web Vitals work documented inline). `Steps.tsx`
and `GalleryStrip.tsx` are deliberately off-template (monospace kicker,
numbered row list, contact-sheet captions) — the prior differentiation pass
did real work here. The "AI-generated" feeling concentrates specifically in
the **card grids, the comparison block, and the glass-UI chrome**, not in the
whole page uniformly.

---

## 3. Typography

**Two typefaces**, both from Google Fonts, loaded via `next/font/google` in
`app/fonts.ts`:

- **Display: Alexandria** — weights 400/500/600/700/800, mapped to
  `--font-display`. Used for every heading, the hero wordmark, kickers, button
  labels, card titles.
- **Body: Inter** — default weight range, mapped to `--font-body`. Used for
  paragraphs, nav utility text, form inputs.

**A specific, telling inconsistency:** the CSS class that wraps display type
in several places is literally named `.serif` (`globals.css:66-69`) —
`font-family: var(--font-display)`. Alexandria is a **geometric sans-serif**,
not a serif. The class name is a leftover from an earlier design (or a
template) that used an actual serif for "premium" headings, and the name
stuck after the typeface changed. It's a two-line CSS rule, but it's a real
signal: the "premium serif heading" cue you'd expect from a luxury-travel
identity was never actually built here — what's shipping is a modern
geometric sans standing in for it.

**Heading system:** `.sect-title` is `font-size: clamp(38px, 5vw, 76px)`,
weight 600, `line-height: 1` — used almost everywhere at the same scale. The
hero wordmark (`.wordmark`) is far larger — `clamp(40px, 11.5vw, 9.5rem)`,
weight 800 — and is the one place type gets genuinely oversized and dominant.
Elsewhere, headings are consistently sized and never particularly large by
2020s travel-site standards.

**Body:** Inter at 1–1.12rem, `line-height` 1.4–1.65, `color: var(--muted)` —
standard, readable, unremarkable. This is exactly the Inter-as-body-font
choice used by an enormous fraction of Tailwind-adjacent sites; it carries no
brand personality on its own.

**Buttons/labels:** uppercase, `letter-spacing: 0.14–0.2em`, Alexandria at
11–13px — a consistent, legible micro-system, applied identically across
`.header-cta`, `.cta-primary`, `.btn-accent`, `.hero-ctas`.

**Personality verdict:** Alexandria + Inter is a coherent, modern, competent
pairing — but it is also close to a *default* choice: a geometric Google
Sans-adjacent display face plus Inter is one of the most commonly reached-for
pairs in current web design generally (not desert-specific, not
Mediterranean, not Arabic-influenced despite Alexandria technically
supporting Arabic — that's used nowhere here as a design cue, only as a
typeface). It reads clean and current. It does not read *specifically* like
Dunes Insolites; it would look equally at home on a fintech landing page.

---

## 4. Shapes and component language

| Element | Shape rule | Consistency |
|---|---|---|
| Buttons | Primary/accent: `border-radius: 9–10px`. The one true "hero CTA," `.btn-primary` (used on generic `CTA.tsx` sections): `border-radius: 999px` (full pill) | **Inconsistent** — two different button radii coexist sitewide with no visible logic for which gets which (compare `.cta-primary` at `9px` vs. `.btn-primary` at `999px`, both primary actions) |
| Cards (activity/stay/review) | `border-radius: 22px` (the `--radius-card` token) | Fully consistent — same value everywhere, which is itself the "template sameness" issue from §2 |
| Photos in cards | `object-fit: cover`, always inset to the card's own radius | Consistent |
| Badges/pills | `border-radius: 999px` (`--radius-pill`), used for the "soon" language pill and nothing else prominent | Underused — no badge system on activity cards, no "featured"/"popular" tags anywhere |
| Shadows | Two families: neutral (`rgba(42,16,8,...)` on cards/page chrome) and **accent-tinted glow** (`rgba(200,100,47,...)` on every accent button) | The glow-shadow-on-brand-button pattern is the most "SaaS template" shadow choice in the system (§2) |
| Navigation | Floating glass pill, rounded 20px, blur+saturate backdrop | One coherent, custom-built component — the strongest UI element on the site |
| Forms | Not inspected in this pass (out of scope for the requested sections beyond booking widgets) — flag for a follow-up pass before redesign |
| Booking widget (`BookDirect`) | Two rounded, bordered comparison boxes — see §2's "SaaS pricing table" note | Template-coded |

**Is there one coherent design language?** Partially. There is a real, disciplined **token layer** (radii, colors, one easing curve `--ease-out-expo` reused everywhere) — that's good infrastructure. But the *application* of those tokens splits into two visibly different design eras on one page: the hero/header (bespoke, cinematic, considered) and the card-grid sections (generic, componentized, interchangeable with a template). The FAQ (`.faq`, plus-sign accordion, hairline dividers) and Steps (numbered log rows) sit in a third, quieter, editorial register that doesn't fully match either.

---

## 5. Homepage visual hierarchy, section by section

Order per `app/[locale]/(site)/page.tsx`: **Hero → Stays → Activities → Steps → Experience → ReviewsShowcase → BookDirect → GalleryStrip → CTA.**

1. **Hero** — First thing seen: a giant "SABRIA" wordmark sandwiched into a scroll-driven photographic gate/dune scene, with stats and a floating experience card. **Dominates visually** through scale and motion. **Distinctive** — this is the site's best asset. Images dominate completely; text is minimal (wordmark, one tagline). Sells the desert experience immediately and specifically (an actual named place, real photography, real numbers).
2. **Stays** — Eyebrow + headline + 3-across photo cards (2 stays, actually — grid marked `cols-2`). **Weak/generic**: identical card mechanic to Activities two sections later; the two are visually indistinguishable in structure. Photos dominate.
3. **Activities** — Same skeleton as Stays, three cards. **Generic** for the same reason — visually this section and Stays could be reordered with no loss of identity.
4. **Steps** — Monospace kicker, numbered editorial list. **Distinctive** — the one section that breaks the grid-of-cards habit and reads as authored. Text dominates (deliberately, per its own code comment).
5. **Experience** — Full-bleed dark photo band with a stat row (guests guided / rating / years). **Weak**: three-equal-column stat block is the most generic device in the page; feels like a filler section between Steps and Reviews rather than a section with its own job. Image dominates but is static (no motion, unlike the hero).
6. **ReviewsShowcase** — Grouped-by-platform carousels with real ratings. **Strong on trust, weak on distinctiveness** — the carousel/card shape is standard testimonial UI; what's genuinely good is showing per-platform real ratings rather than a fabricated aggregate.
7. **BookDirect** — Headline + two-column "book here vs. book there" comparison + CTA. **Generic** (§2) but does real commercial work — arguably the most *important* conversion section on the page, undermined by looking like a SaaS pricing table.
8. **GalleryStrip** — Contact-sheet style asymmetric photo grid with numbered captions. **Distinctive** — second-best section after the hero, explicitly built to avoid the competitor's boxed hover-zoom gallery.
9. **CTA** — Full-bleed photo, centered headline, one pill button. **Weak/generic** — the single most template-typical "final CTA band" on the page: dark photo, centered white text, pill button, nothing else.

**Strongest 3:** Hero, GalleryStrip, Steps — all three post-date or embody the "Field Log editorial" direction and are genuinely hard to mistake for a template.

**Weakest 3:** Stays/Activities (tied — near-duplicate sections), Experience (generic stat band), closing CTA (generic photo-band CTA).

---

## 6. Desert identity — is this specifically Tunisian?

Checked against the list requested:

| Cue | Present? | Where |
|---|---|---|
| Dunes Insolites / Sabria as a name | ✅ | Hero wordmark, brand name everywhere |
| Sabria as a real place | ✅ but **only as text** | `site.ts` carries real coordinates (33.2286, 9.0056 — actually Kébili governorate) and address; nothing visual (map, route, regional motif) surfaces this |
| Tunisian Sahara specifically vs. "the Sahara" generally | ⚠️ weak | Copy says "Sahara," "Sabria," "Douz" (metadata keywords) but the *visual* system (palette, type, shapes) carries no marker that says "Tunisia" rather than "Morocco" or "Algeria" |
| Authentic desert / sand dunes | ✅ | Real photography in the hero and gallery — assuming (not verified in this pass) these are actual on-location photos and not stock |
| Sunset | ✅ | Hero grade/lighting, CTA/Experience background photos |
| Stars / night sky | ❓ not seen | No component in this pass surfaced a night-sky/stargazing visual, despite it being a common desert-camp draw |
| Campfire | ⚠️ mentioned, not shown | Copy references "a fire circle" (`Stays.tsx:20`) but no photo/icon of a campfire appeared in the sections reviewed |
| Local hospitality / nomadic experience | ❌ | Nothing in the visual system (palette, iconography, pattern motifs) references Berber/nomadic textile patterns, tea-service imagery, or any local-hospitality visual cue |
| Camel trekking | ✅ | Named directly in Activities copy and metadata |
| Comfort in the desert (glamping/luxury contrast) | ⚠️ implied by copy, not by imagery reviewed in this pass | "Desert Tent / Desert Room / Dune Suite" naming (`AccommodationCard.tsx` context) implies a comfort tier, but nothing in the *visual* system (materials, texture, pattern) shows it |
| Southern Tunisia specifically | ❌ | No visual reference at all — this is carried entirely by text metadata (governorate name, coordinates, keywords) |

**What currently makes the site specifically Tunisian, if anything:** almost
nothing visual. It is the **name** ("Sabria," "Dunes Insolites") and the
**copy/metadata** (coordinates, "Kebili," "Douz," phone country code) doing
100% of the geographic specificity. Strip the wordmark and the copy, and the
remaining palette + typography + card language could belong to a desert camp
in Morocco, Jordan, Egypt, or Dubai's desert-safari operators with zero visual
edits — this is the single most important finding in this audit, and it's
exactly what you flagged as a concern going in.

---

## 7. Competitor-similarity risk

Ranking what's least defensible as visually "Dunes Insolites-specific," most
risky first:

1. **The `.card` hover-zoom mechanic** (§2/§4) — burnt-orange terracotta
   accent + cream/sand background + rounded-22px photo card with a bottom
   gradient caption is close to the industry-default formula for "desert/
   safari/adventure travel card." Any competitor's design agency reaching for
   "warm, sandy, adventurous" without a specific brief lands very close to
   this.
2. **The accent color itself, used alone** — `#c8642f` is a textbook
   terracotta. On its own, with no secondary motif, it is not defensible as
   *this brand's* color the way, say, a very specific ember-red or a
   Tunisian-tile teal paired with it would be.
3. **The glass-header + glow-shadow-button combination** — this is a UI
   pattern from the broader SaaS/startup design wave (2021–2024), not from
   travel design at all. It is the least "desert" thing in the system and the
   most "any modern web product" thing.
4. **The generic "final CTA" band** — full-bleed dusk photo, centered white
   serif-ish (actually sans) headline, one pill button — this exact recipe
   closes an enormous number of travel/hospitality landing pages regardless
   of destination.
5. **BookDirect's two-column compare block** — as noted, a SaaS pricing-page
   convention, and the one component here most likely to look *out of place*
   next to genuine desert-tourism competitors rather than merely similar to
   them.

**What is currently insufficiently distinctive, summarized:** the palette
(terracotta/sand/cream), the card grid mechanic, and the glass-UI chrome are
all "safe, generic desert-travel-template" choices. The things that *are*
distinctive — the cinematic scroll hero, the Field Log editorial voice in
Steps/GalleryStrip, the real per-platform review data — are concentrated in
about a third of the page.

---

## 8. Image treatment

- **Aspect ratios:** hero layers are full-bleed (`fill`, `100vw`); cards use
  `aspect-ratio: 3/4` (Stays/Activities, `.card`, line 1479) and `4/3`
  (`.accommodation-image`, line 2301); gallery uses a CSS grid with
  `grid-auto-rows: 240px` and a `.tall` modifier spanning two rows
  (`GalleryStrip`/`globals.css:1663-1701`) — varied and deliberate, not
  everything forced into one ratio.
- **Overlays/gradients:** every photo that carries text over it gets a
  bottom-to-top or full dark scrim (see §1's gradient table) — functional,
  not a stylistic "duotone" or brand-colored overlay. No brand-tinted photo
  filters (e.g., no orange-tinted duotone over every photo) — a missed
  opportunity for a distinctive photographic signature, but also not a
  cliché currently in play.
- **Cropping:** `object-fit: cover` throughout — standard, safe, no
  awkward stretching found.
- **Border radius on photos:** always matches the containing card's radius
  (22px), never independently rounded corners on a photo floating free of a
  card — consistent.
- **Hero photography specifically:** genuinely well-treated — two-layer
  parallax (background plate + foreground cutout with real alpha, not a
  gradient-faked mask), film-grain overlay (`globals.css:899-906`,
  `mix-blend-mode: overlay`, explicitly commented as "the cheapest move that
  stops a flat jpeg feeling flat") — this is the single most considered piece
  of image treatment on the site.
- **Card photography:** the hover-zoom-plus-scrim treatment on Stays/
  Activities/Reviews is competent but generic (§2) — it makes photos look
  like "template card photos," not because the photos themselves are bad,
  but because the *frame* around them is the default frame every card-grid
  template uses.

**Verdict:** the hero photography is treated in a way that makes it feel real
and specific. The card-grid photography is treated in a way that would make
even excellent, authentic photos read as generic stock, purely because of the
surrounding chrome.

---

## 9. UX / conversion

- **Primary path is clear:** Header CTA ("Book Direct") is present on every
  page, sticky. The homepage funnel (Stays → Activities → Steps → proof →
  BookDirect → gallery → final CTA) is a sensible, singular path — not
  fighting itself with multiple competing CTAs.
- **Too many CTAs?** Not really — `cta-primary`/`cta-ghost` pair in the hero,
  one `header-cta`, one `BookDirect` CTA, one closing `CTA.tsx` button. That's
  restrained, not cluttered.
- **What's underserved:** pricing/availability is not visible until deep in
  the funnel (Stays cards show `stay.kicker`/description, not price — price
  only surfaces on `AccommodationCard`, one level deeper). A visitor wanting
  "how much" has no homepage-level answer.
- **Location:** no map, no visual "how to get here" cue on the homepage —
  purely textual elsewhere (coordinates in the footer). For a destination
  this remote, that's a real conversion gap, not just a visual one.
- **WhatsApp button:** present as a persistent float — a good, low-friction
  contact path, correctly kept visually quiet relative to the primary CTA.

---

## 10. Mobile design

From the media-query rules found (`globals.css`, `@media (max-width: 900px)`,
`640px`, and a dedicated `@media (max-height: 700px)` block for short
phones):

- **Hero composition changes on mobile**, not just scales down — comment at
  `globals.css:4654` ("A phone crops the same photo much tighter... its own
  composition, not a shrunk desktop one") — this is the right instinct and
  rare to see done deliberately.
- **Drawer menu, not a generic hamburger overlay** — full-screen opaque
  drawer (`#16100c`), staggered link entrance animation, primary CTA +
  WhatsApp secondary action pinned near the top of the reachable area,
  explicitly re-tuned for short viewports (`@media (max-height: 700px)`,
  lines 771–795) so the CTA doesn't sit below the fold on an iPhone SE. This
  is genuinely above-average mobile navigation engineering.
- **Language switcher relocated**, not hidden, on mobile (`.header-lang-mobile`,
  shown only under 900px, grouped with the burger) — a real, considered
  mobile-specific decision, not a leftover desktop component squeezed down.
- **Risk areas not fully verified in this code-only pass** (flagging for a
  rendered check before redesign): whether the `.cards` 3-up grid
  (Stays/Activities) collapses gracefully to 1-up on phones, whether
  `.compare` (BookDirect's two-column block) survives at 360–400px width
  without becoming cramped, and whether the gallery's `grid-auto-rows: 240px`
  fixed row height reads correctly at narrow widths. These need a rendered
  screenshot pass, not guesswork — recommended as the first step of any
  redesign work order.

**Provisional verdict:** the mobile *navigation* is a genuine strength.
Whether the mobile *card grids* avoid the generic-template feeling that
affects them on desktop needs a live check before concluding either way.

---

## 11. Design system inventory

| Component/File | Purpose | Current visual style | Redesign importance |
|---|---|---|---|
| `app/globals.css` (`@theme`, lines 6–32) | Color/radius/font/easing tokens | Sand/terracotta palette, uniform 22px radius | **Critical** — every hex/radius change starts here |
| `app/fonts.ts` | Typeface loading | Alexandria + Inter | **Critical** — a typography change is a one-file swap plus the `.serif` rename cleanup |
| `components/Hero.tsx` + its CSS (`.scroll`/`.stage`/`.wordmark`/…, lines 797–1363) | Landing cinematic hero | Bespoke, strongest asset | **Keep** — high engineering cost to rebuild, low payoff versus fixing the generic sections |
| `components/Header.tsx` + `.site-header*` (lines 71–605) | Global nav | Glass/blur, floating pill | **Medium** — functionally excellent; the glass treatment itself is the one generic note worth reconsidering |
| `components/StayCard.tsx`, `ActivityCard.tsx` + `.card` (lines 1469–1527) | Stay/activity grid tiles | Hover-zoom photo + scrim + caption | **High** — the single most template-coded, most repeated component; fixing this changes the site's feel more than any other one edit |
| `components/Stays.tsx`, `Activities.tsx` | Section wrappers around the cards above | Eyebrow/headline/grid skeleton, near-duplicated between the two | **High** — differentiate the two sections structurally, not just by copy |
| `components/Steps.tsx` + `.log-index*` (lines 1530–1589) | "How it works" | Editorial numbered list — already distinctive | **Keep** |
| `components/Experience.tsx` + `.exp` (lines 1590–1650) | Stat/proof band | Generic 3-column stat row over a photo | **High** — currently the weakest section on the page |
| `components/ReviewsShowcase.tsx`, `ReviewCarousel.tsx` + `.reviews-showcase*` (lines 3888–3960+) | Per-platform testimonial carousels | Standard carousel chrome, real per-platform data | **Medium** — the data model is a genuine asset; the chrome around it is generic |
| `components/BookDirect.tsx` + `.compare*`/`.direct` (lines 3996–4076) | Direct-booking pitch | SaaS-style comparison table | **High** — commercially important section wearing the most out-of-genre visual language on the site |
| `components/GalleryStrip.tsx` + `.log-gallery*` (lines 1652–1702) | Homepage gallery teaser | Contact-sheet, asymmetric grid — already distinctive | **Keep** |
| `components/CTA.tsx` + `.cta` (lines 1704–1770) | Generic reusable closing CTA (used site-wide, not just homepage) | Full-bleed photo, centered pill button | **High** — reused across many pages, so fixing this one file has wide reach |
| `components/Footer.tsx` + `.site-footer*` (lines 1933–2034) | Global footer | Already restructured in the prior differentiation pass | **Low** — keep as-is |
| `components/AccommodationCard.tsx` + `.accommodation-card*` (lines 2300–2305) | Room/tent tier cards on stay detail pages | Same 22px-radius/shadow language as everything else | **Medium** — lower traffic than the homepage cards but same fix pattern applies |
| `.faq` (lines 3773–3812) | FAQ accordion | Quiet, hairline-divided, `+`/`−` marker — restrained and fine | **Low** |
| `lib/site.ts` | Brand config (name, tagline, coords, nav) | Text-only; carries 100% of the geographic specificity today (§6) | **Critical for §6** — a "visual Tunisia" fix has to be designed to sit alongside, not replace, this copy |

---

## 12. Scores (out of 10)

| Dimension | Score | Why |
|---|---|---|
| Originality | **4** | Hero/Steps/Gallery are original; cards/CTA/compare-block are formula |
| Premium feeling | **6** | Photography and hero motion carry real premium weight; card-grid chrome undercuts it |
| Authenticity | **5** | Real stats, real per-platform reviews, real coordinates — undermined by generic surrounding chrome |
| Tunisian identity | **2** | Carried entirely by text/metadata, not by anything visual (§6) |
| Desert identity | **7** | Palette and photography clearly say "desert"; just not *which* desert |
| Visual consistency | **6** | Strong token discipline (one radius, one easing, one palette) but two visibly different design eras on one page |
| Typography | **5** | Clean, current, competent pairing; carries no unique personality; `.serif` naming a small tell |
| Color palette | **4** | On-theme but the single most generic layer of the identity (§1, §7) |
| Photography presentation | **6** | Hero excellent; card-grid treatment generic regardless of photo quality |
| Conversion design | **7** | Clear single funnel, restrained CTA count; missing homepage pricing/location |
| Mobile design | **7** | Genuinely considered navigation; card-grid behavior on narrow widths unverified |
| Brand memorability | **4** | The wordmark moment is memorable; almost everything after it is replaceable |
| **"AI-generated/template" feeling** | **6/10** | Concentrated specifically in the card grids, comparison block, glass-UI chrome, and generic closing CTA — not evenly spread across the whole site |

---

## 13. Final diagnosis

### Keep
- The scroll-driven cinematic hero (`Hero.tsx`) — real engineering, real
  distinctiveness, expensive to rebuild for little gain.
- `Steps.tsx`'s editorial numbered-log treatment.
- `GalleryStrip.tsx`'s contact-sheet gallery.
- `Footer.tsx`'s two-column-plus-bar structure (already de-templated).
- The token discipline itself (one radius scale, one easing curve, colors
  centralized in `globals.css`'s `@theme`) — the *infrastructure* for a
  redesign is good even where the *values* in it aren't distinctive yet.
- The per-platform real review data model in `ReviewsShowcase` — don't lose
  this while restyling its chrome.

### Change
- `StayCard`/`ActivityCard`'s hover-zoom-plus-scrim mechanic — the most
  repeated, most generic component on the site.
- `Experience.tsx`'s three-column stat band.
- `BookDirect.tsx`'s SaaS-pricing-table comparison block.
- `CTA.tsx`'s generic full-bleed-photo-plus-pill-button closing pattern.
- The single-accent-color system — needs either a second hue or a
  Tunisia-specific motif layered on top, not necessarily a full repaint.
- The `.serif` class name (cosmetic, but symptomatic — rename or actually
  introduce a serif if the "premium" cue is wanted).

### Remove
- The glass/blur-header treatment as the *only* chrome idea in the system —
  or at least stop letting it be the site's most "designed" UI moment,
  since it's the least desert-specific thing on the page.
- The glow-tinted button shadow formula, reused identically on every accent
  button — a strong SaaS-template tell.
- The assumption that "eyebrow + headline + 3-col grid" is a safe default —
  it's used enough times (Stays, Activities, and near-misses elsewhere) that
  it currently reads as the site's actual template, not an occasional device.

### Brand opportunity
Nothing here currently visually claims **Sabria specifically**, or **Kébili/
southern Tunisia specifically**, or the **Sahara's particular light and
color at this latitude** the way a competitor operating out of Merzouga or
Wahiba Sands would have to reach for their own version of. That gap is the
opportunity: a palette, pattern motif, or photographic signature drawn from
something a Moroccan or Jordanian desert-camp competitor genuinely could not
reuse without it reading as copied — regional textile motifs, the specific
palette of Chott el Djerid's salt flats nearby, Douz's date-palm oases, or a
typographic/iconographic nod to Tunisian Arabic script culture used as a
*design element*, not just a language option in a switcher.

### Recommended directions
*(Descriptions only — nothing here is implemented.)*

**Direction A — Raw Sahara Editorial**
- Mood: documentary, unpolished-on-purpose, "field log" voice pushed
  sitewide (not just Steps/Gallery).
- Palette: desaturate the terracotta slightly, introduce a dusty
  sage/olive or a deep indigo-black night-sky tone as the second hue, so
  orange stops carrying the whole page alone.
- Typography: keep Alexandria for scale-critical moments (the wordmark) but
  introduce a monospace as a true second voice sitewide (Steps already
  hints at this), retiring `.serif`'s misleading name.
- Image style: grain/contact-sheet treatment (already prototyped in
  `GalleryStrip`) extended to every card, replacing the hover-zoom-scrim
  mechanic.
- Shapes: fewer rounded rectangles, more hairline dividers and numbered
  indices (extending `Steps.tsx`'s language).
- UI personality: quiet, confident, slightly austere.
- Advantages: cheapest to execute (mostly extends work already proven in
  this codebase); most different from generic travel templates.
- Risks: can tip into feeling austere/under-designed to a guest expecting
  a lush "resort" feeling; needs strong photography to carry it.

**Direction B — Contemporary Tunisian Desert**
- Mood: warm but specific — leans into real regional color/pattern rather
  than generic terracotta.
- Palette: keep the current warm base but introduce a genuinely
  Tunisia-referential secondary color (a specific tilework blue/green, or
  the pink-violet of dune light at this latitude) as a true second hue.
- Typography: current Alexandria/Inter pairing is fine here; the work is
  in color and motif, not type.
- Image style: current hero treatment kept; card grid gets a subtle
  region-specific pattern (a hairline motif drawn from local textile/tile
  geometry) as a repeating detail, not a full skin.
- Shapes: keep the current radius system but introduce one distinctive
  shape (an arch motif, echoing the hero's actual gate) as a recurring
  brand device instead of a generic rounded rectangle everywhere.
- UI personality: warm, welcoming, specific.
- Advantages: most directly answers the "make it visibly Tunisian" gap
  (§6) without discarding what already works.
- Risks: requires real motif research to avoid the opposite failure —
  looking "ethnic-generic" rather than specifically Kébili/Sabria; needs
  care to not read as costume.

**Direction C — Quiet Desert Luxury**
- Mood: restrained, spacious, upmarket — closer to a boutique-hotel
  brand than an adventure-tour operator.
- Palette: drop the accent's saturation further, lean into near-monochrome
  sand/ink with the terracotta used only as a rare, precise highlight
  (one button per page, not every interactive element).
- Typography: introduce an actual serif for headings (making the current
  `.serif` class honest), paired with a quieter, smaller-scale Inter for
  body copy.
- Image style: fewer, larger photographs; remove the gradient scrims
  where possible in favor of negative space and caption below the image
  (already the instinct in `GalleryStrip`).
- Shapes: sharper corners or a much smaller radius than the current 22px
  default; remove glow shadows entirely.
- UI personality: confident through restraint, not through density of UI
  chrome (drop the glass-blur header for a simpler, flatter one).
- Advantages: the strongest "premium" read of the three; most different
  from the current glass/glow/gradient card-template language.
- Risks: the furthest from what's currently built (highest implementation
  cost); risks feeling generic-luxury in its own right if not paired with
  Direction B's regional specificity.

---

## Files that would need modification for any of the directions above

**Foundation (touch first, everything else follows):**
- `frontend/app/globals.css` — `@theme` token block (lines 6–32) and every
  section that currently hardcodes the shared radius/shadow/gradient
  formulas (`.card`, `.compare`, `.cta`, button classes)
- `frontend/app/fonts.ts` — if typography changes in any direction
- `frontend/lib/site.ts` — brand config; not visual itself, but the anchor
  any "visual Tunisia" work (Direction B) has to key off

**High-impact components (the generic-reading ones):**
- `frontend/components/StayCard.tsx`, `frontend/components/ActivityCard.tsx`
- `frontend/components/Stays.tsx`, `frontend/components/Activities.tsx`
- `frontend/components/Experience.tsx`
- `frontend/components/BookDirect.tsx`
- `frontend/components/CTA.tsx` (reused across many non-homepage pages —
  check call sites before changing its API)
- `frontend/components/AccommodationCard.tsx`
- `frontend/components/ReviewsShowcase.tsx`, `frontend/components/ReviewCarousel.tsx`

**Keep largely as-is, touch only for token/color updates:**
- `frontend/components/Hero.tsx`, `frontend/components/Header.tsx`
- `frontend/components/Steps.tsx`
- `frontend/components/GalleryStrip.tsx`
- `frontend/components/Footer.tsx`

**Not yet inspected in this pass — recommend a follow-up read before
implementation:** tour/product detail pages beyond the homepage
(`app/[locale]/(site)/camp/[slug]/`, `.../activities/[slug]/`), the booking
flow (`BookingFlow.tsx`, `StayReservationForm.tsx`), and a live rendered
check (desktop/tablet/phone screenshots) to confirm the card-grid and
`BookDirect` compare block actually hold up at narrow widths, since this
audit was code-only and did not run the app.
