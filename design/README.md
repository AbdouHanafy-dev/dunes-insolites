# Handoff: Sabria — Desert Adventures Landing (+ full build brief)

## Overview
Marketing site for **Sabria**, a Sahara desert-adventure brand offering camel treks, quad
safaris, and sandboarding. This bundle contains the finished **landing page** as an HTML/CSS/JS
prototype, plus a brief for wiring it to a backend and building the remaining pages.

## About the Design Files
`landing.html` and the images are **design references** — a working prototype of the intended
look, motion, and structure. They are **not production code to ship as-is**. Recreate this in
the target stack using its own components, styling, and animation libraries. If there is no
codebase yet, choose a stack (recommended: **Next.js (App Router) + TypeScript + Tailwind**,
with **Framer Motion** or **GSAP ScrollTrigger** for the hero) and build there.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, imagery, section structure, and the hero
scroll choreography are all specified — recreate faithfully. Swap the vanilla rAF/scroll engine
for the framework's idiomatic scroll-progress approach.

---

## Page structure (top → bottom)

### 0. Floating header (fixed, `#header`)
- A **floating pill/island**: `position: fixed; top: 18px; left: 50%; translateX(-50%)`,
  `width: calc(100% - 40px); max-width: 1140px; border-radius: 999px`.
- **Over hero**: dark frosted glass — `background: rgba(24,14,10,.32)`,
  `backdrop-filter: blur(16px) saturate(1.25)`, `border: 1px solid rgba(253,241,225,.16)`,
  `box-shadow: 0 14px 40px rgba(15,8,4,.28)`, paper text.
- **Scrolled state** (`.scrolled`, toggled when `scrollY > innerHeight * 0.92`): narrows to
  `max-width: 1000px`, light glass `rgba(253,241,225,.6)`, ink text, border `rgba(42,16,8,.10)`.
- Contents: brand `Sabria` (Alexandria 22px) · nav (Activities / How it works / Experience / Gallery,
  13.5px 600, hover → accent) · CTA pill `Book a trip` (solid accent `#c8642f`, paper text,
  `box-shadow: 0 8px 22px rgba(200,100,47,.4)`, hover lifts 1px).
- Mobile (≤900px): nav + CTA hidden — **build a mobile menu/drawer** (not in the prototype).

### 1. Cinematic hero (`#scroll` → sticky `.stage`)
Scroll-driven 3D zoom **through the desert gate** into the combined activities scene, then
labels rise in. Full spec below under **Hero scroll engine**.

### 2. Activities (`#activities`, sand bg `#f3e7d3`, padding 128px 0)
- Eyebrow `Choose your ride` (accent) · title `Three ways to cross the sand.` (Alexandria, clamp 38–76px)
  · intro paragraph (muted).
- **3 cards** grid (`repeat(3,1fr)`, gap 26px), each `aspect-ratio: 3/4`, radius 22px,
  image `object-fit: cover` with hover `scale(1.07)` over .8s, bottom gradient scrim, caption
  (num kicker · Alexandria 30px name · desc). Cards: **Camel Trek** (`camel.jpg`), **Quad Safari**
  (`quad.jpg`), **Sandboarding** (`sandboard.jpg`). → link each to its detail page.

### 3. How it works (`#steps`, maroon bg `#2a1008`, paper text)
- 3 numbered steps (Alexandria numerals in `#f0a558`, top hairline border): **01 Pick your adventure**,
  **02 Book your window**, **03 Meet at the gate**.

### 4. Experience (`#experience`, full-bleed image band, min-height 84vh)
- `hero-combined.jpg` bg with left-dark gradient; headline (Alexandria, clamp 40–84px) + paragraph +
  **stats row** (12k+ guests, 4.9★, 8 yrs). Stats should come from the backend.

### 5. Gallery (`#gallery`, sand bg)
- Mosaic grid (`1.3fr 1fr 1fr`, rows 240px, one `.tall` spanning 2 rows) of all five images,
  hover zoom. → wire to a CMS/media collection.

### 6. CTA (`.cta`, gate.jpg bg + `rgba(20,8,4,.6)` overlay, centered)
- `Ready for the dunes?` + paragraph + primary button `Book a trip →` (paper bg, ink text).

### 7. Footer (maroon)
- Brand blurb + 3 link columns (Adventures / Company / Follow) + legal bar. Wire links to real routes.

### Reveal animation
All `.reveal` elements start `opacity:0; translateY(26px)` and animate to rest via an
IntersectionObserver adding `.in` (threshold 0.16). Under `prefers-reduced-motion`, reveals show
immediately. Reproduce with the framework's in-view hook.

---

## Hero scroll engine (exact)
Progress `p = clamp(scrolled / 3000)`, where
`scrolled = clamp(-#scroll.getBoundingClientRect().top, 0, offsetHeight - innerHeight)`.
Inertia: `smooth = lerp(smooth, target, 0.14)` (snap when within 0.1). Pointer parallax
`mx,my ∈ [-1,1]` smoothed at `lerp … 0.10`. Helpers: `clamp01`, `smoothstep(e0,e1,v)=ss`, `lerp`.
Stage: `perspective: 1400px`; gate `transform-origin: 50% 53%`.

| CSS var (on :root) | Formula | Effect |
|---|---|---|
| `--gate-scale` | `1 + pow(ss(0,.62,p),1.35)*7.2` | arch flies at viewer |
| `--gate-opacity` | `1 - ss(.42,.6,p)` | arch dissolves |
| `--gate-x/y` | `mx*14px / my*10px` | parallax |
| `--scene-opacity` | `ss(.4,.66,p)` | scene fades in |
| `--scene-scale` | `1.25 - ss(.4,.66,p)*.25 + ss(.66,1,p)*.05` | settle + ken-burns |
| `--scene-x/y` | `mx*-20px / my*-12px` | depth parallax |
| `--flare` | `ss(.3,.5,p)*(1-ss(.52,.72,p))*.9` | bloom at pass-through |
| `--intro-opacity` | `1 - ss(.05,.32,p)` | title fades |
| `--intro-y` | `ss(.05,.32,p)*-120px` | title lifts |
| `--cue-opacity` | `1 - ss(.02,.16,p)` | scroll cue fades |
| `--labels` | `ss(.74,.96,p)` | labels fade in |
| `--lift` | `18 - ss(.74,.96,p)*18 px` | labels rise |

Label positions (percent of stage, **re-tune if the combined photo changes**):
`.l-camel{left:22%;top:40%}` `.l-quad{left:19%;top:82%}` `.l-board{left:76%;top:72%}`.
Content: Ride/Camel, Race/Quad, Glide/Sandboarding.

---

## Backend integration (what to wire up)
The prototype is fully static. Connect these to a backend/CMS:

1. **Activities** — model `Activity { slug, title, tagline, description, heroImage, gallery[], priceFrom, durationMins, difficulty, included[] }`. The 3 cards and their detail pages read from this. Seed: camel-trek, quad-safari, sandboarding.
2. **Bookings** — every `Book a trip` / CTA opens a booking flow. Model `Booking { activitySlug, date, timeSlot(morning|golden-hour), partySize, name, email, phone, notes, status }`. Endpoints: `GET /api/availability?activity&date`, `POST /api/bookings`, confirmation email + `GET /api/bookings/:id`. Validate: future date, party size 1–12, slot must be available.
3. **Stats band** — `GET /api/stats` → `{ guestsGuided, avgRating, yearsRunning }` (fallback to the seed numbers).
4. **Gallery** — media collection `GET /api/gallery` (image, alt, activity tag).
5. **Newsletter / contact** — `POST /api/subscribe`, `POST /api/contact`.
6. **i18n** — the `EN ⌄` control implies multi-language (site is Tunisia-based: EN / FR / AR, incl. RTL for Arabic). Set up an i18n framework and externalize all copy.
7. **CMS** — put activity copy, gallery, stats, and page content behind a CMS (Sanity/Payload/Strapi) so marketing can edit without deploys.

## Other pages to build (same design system)
- **Activity detail** (`/activities/[slug]`) — hero image, description, what's-included, gallery, price, inline booking widget, related activities.
- **Booking flow** (`/book`) — activity picker → date/slot → party size → contact → payment → confirmation. Reuse header/footer + palette; Alexandria for headings.
- **Booking confirmation** (`/bookings/[id]`).
- **About / Guides**, **Safety**, **Contact** (form + map), **Gallery** full page, **Legal** (privacy/terms).
- **404** in the desert theme.
- Global: SEO metadata + OG images, sitemap, analytics, cookie consent, responsive mobile nav drawer.

---

## Design tokens
- **Colors**: `--paper:#fdf1e1` · `--sand:#f3e7d3` · `--ink:#2a1510` · `--maroon:#2a1008` ·
  `--accent:#c8642f` · `--muted:rgba(42,21,16,.66)` · step numeral `#f0a558`.
  Stage bg `#14101a`; deep shadow `rgba(20,10,8,.5–.7)`; flare
  `rgba(255,238,205,.95)→rgba(255,205,140,.5)→transparent`.
- **Type**: display = **Alexandria** (600–700) for brand/titles/numerals; body = Inter/system-ui.
  Scale — hero title `clamp(84px,19vw,18rem)`; section title `clamp(38px,5vw,76px)`; card/label name 30px;
  body 1.08–1.12rem; eyebrow 12–14px; kicker/cue 11px. Letter-spacing: eyebrow .42em, sect-eyebrow .32em, kicker .34em, cue .3em, brand .04em.
- **Radius**: header/CTA/pills 999px; cards 22px; gallery tiles 18px.
- **Spacing**: section vertical padding 120–140px; container `max-width:1200px; padding:0 40px` (22px mobile).
- **Motion**: smoothstep ramps; scroll inertia lerp 0.14, pointer 0.10; hover image zoom scale 1.06–1.07 / .8s `cubic-bezier(.22,1,.36,1)`; reveal .7s.
- **Breakpoints**: 900px (cards/steps → 1 col, nav+CTA hidden), 640px (tighter padding, smaller labels).

## Assets (in `assets/`, bundled)
- `gate.jpg` — lantern-lit desert gate at sunset (hero first screen + CTA bg). User-provided.
- `hero-combined.jpg` — single photo: camel+handler, two quad riders, sandboarder on one dune
  (revealed through the arch; experience + gallery). User-provided.
- `camel.jpg`, `quad.jpg`, `sandboard.jpg` — individual activity photos, sunset color-graded.
- **Font**: **Alexandria** (free, Google Fonts; supports Latin + Arabic — good for EN/FR/AR).
  Loaded via `@import` in the prototype; in Next.js load it with `next/font/google`. Display weights
  600–700, body via Inter. No licensing needed. All photos are user-supplied and owned by the client.

## Files
- `landing.html` — the complete landing page (self-contained HTML/CSS/JS): floating header, cinematic
  hero, activities, how-it-works, experience, gallery, CTA, footer.
- `assets/` — the five images listed above.
