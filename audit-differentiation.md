# Audit — Dunes Insolites vs douzdesertadventure.com

Compiled 31 Aug 2026 by reading the actual source files (`frontend/components/*`,
`frontend/messages/en.json`, `frontend/app/[locale]/layout.tsx`) and fetching
the real competitor homepage. Every item below is a confirmed match against a
real file or a real fetched page — nothing guessed. **Stopping here per Step
1's own instruction** ("do this before changing anything") — no design or
copy changes made yet.

---

## 1a — Layout patterns that match

| Competitor pattern | Where it exists here | Real match |
|---|---|---|
| Small uppercase eyebrow + 2-line headline, repeated at every section head | `Stays.tsx`, `Activities.tsx`, `Steps.tsx`, `GalleryStrip.tsx`, `PageHead.tsx` (used on every interior page) | **Yes — the single most repeated pattern on the site.** 5+ distinct sections use the identical `sect-eyebrow` + 2-line `sect-title` skeleton. |
| 3-column image cards, text overlaid bottom-left on the photo | `ActivityCard.tsx` (`.card .cap`, gradient overlay, `kicker`/title/description absolutely positioned bottom-left) | **Yes, structurally identical** — even down to the small uppercase "kicker" label above the title, matching the competitor's card treatment. |
| Full-width dark band for "expertise/stats" | `Experience.tsx` — full-bleed photo, dark section, 3-stat row (`guestsGuided` / `avgRating` / `yearsRunning`) | **Yes** — same structural role as the competitor's "Stats Banner" (249+ Trips / 15 Years / 4.9 Rating / 18+ Countries): a row of unexplained numbers over a dark photo. |
| 3x3/2x3 mosaic gallery + "See full gallery" link | `GalleryStrip.tsx` on the homepage (5-tile strip + `"See the full gallery →"`), `GalleryGrid.tsx` on `/gallery` (3-column masonry) | **Yes**, both the homepage teaser and the full gallery page use this exact mechanic. |
| Full-bleed darkened photo CTA band, rhetorical-question headline, centered button | `CTA.tsx` — `/images/gate.jpg` background, `title: "Ready for the dunes?"`, single centered `btn-primary` | **Yes, near word-for-word.** The competitor's own headline is *"Ready for Your Sahara Expedition?"* — the user's own prompt names this exact pattern as the thing to avoid, and it's the current live copy. |
| Dark footer: logo+tagline+socials, then 3 link columns, then legal bar | `Footer.tsx` | **Yes, exact structural and even label match** — the three columns are literally titled "Adventures" / "Company" / "Follow", the same three-column labeling shape the competitor uses (Explore / Popular Trips / Get in Touch). |
| 3-item grids everywhere | `Steps.tsx` (3 steps), `Experience.tsx` (3 stats) | **Yes**, both present on the homepage alone. |

**Not found / not a match:**
- No visible star-rating rows or badge pills carrying no information.
- No emoji used as section decoration anywhere in the components read.
- Testimonials section (`ReviewsShowcase.tsx`) — different in one real way: it pulls genuinely real reviews (fixed this session, previously fabricated) rather than static copy, though the *card* layout itself wasn't independently re-verified against the competitor's testimonial cards in this pass.

## 1b — Boilerplate copy check

Searched `frontend/messages/en.json` (the real, live English copy) for every
phrase the brief listed as generic-tour-operator boilerplate:

| Phrase searched | Found? |
|---|---|
| "Choose Your Adventure" | No |
| "Desert Experiences & Expeditions" | No |
| "Our Expertise" | No |
| "Our Expeditions" | No |
| "View All Packages" | No |
| "Contact for pricing" | No |
| "View Details" | No |
| "fully personalised Sahara experience" | No |
| "end-to-end expedition support" | No |
| "unforgettable" | No |
| "immerse yourself" | No |
| "moments that last forever" | No |
| "gateway to authentic ... adventures" | No |

**One real match, confirmed live**: `messages/en.json`'s `ctaDefault.title` is
literally **`"Ready for the dunes?"`** — the exact rhetorical-question CTA
pattern flagged, one word different from the competitor's own
*"Ready for Your Sahara Expedition?"*.

**Honest assessment**: the copy itself is mostly *not* the generic
boilerplate list — that's real and worth knowing before assuming everything
needs a rewrite. The risk here is almost entirely **structural** (the same
section skeleton, repeated) and **one specific CTA headline**, not sitewide
copy-paste phrasing.

## 1c — Titles, meta, H1, alt text

- **Homepage title**: `"Dunes Insolites — Sabria Desert Adventures"` (default) /
  `"%s — Dunes Insolites"` (template for interior pages). Already
  place-specific (names Sabria), not generic — a real point in this site's
  favor versus the competitor's `"Douz Desert Adventure — The Sahara Gate"`.
- Each interior page (`meta.about`, `meta.activities`, `meta.gallery`, etc.)
  generates its own `title`/`description` via next-intl — confirmed at least
  one real example (`meta.about.description`: *"Dunes Insolites is a
  family-run desert outfit in Sabria, southern Tunisia. Meet the guides who
  take you across the sand."*) — genuinely specific, not templated filler.
- **Not fully audited in this pass**: whether every one of the ~20+ page
  metadata entries is truly unique, or whether some share near-identical
  phrasing — that needs a full pass through every `meta.*` key in
  `messages/en.json`, not done here to keep this step honest about its own
  scope.
- Alt text: not systematically audited yet — `ActivityCard`/`StayCard` alt
  text was spot-checked (uses real `tagline`/`description` strings, not a
  generic "photo of X"), but a full sweep of every `<Image alt=...>` across
  the codebase wasn't done in this pass.

---

## Real, live competitor reference (fetched 31 Aug 2026)

`douzdesertadventure.com` homepage, confirmed structure top to bottom:
Header nav → Hero (full-bleed image, centered headline, 2 CTAs) → Stats
banner (4 numbers) → "Our Expeditions" / "Choose Your Adventure" 3-col card
grid → "OUR EXPERTISE" / "Desert Experiences & Expeditions" dark band with a
2x4 icon grid → Testimonials (3 cards) → "Gallery" / "Captured Moments" 6-tile
grid + "View Full Gallery" → Final CTA ("Ready for Your Sahara Expedition?")
→ Footer (logo+tagline+socials, 3 link columns, legal bar).

Title: *"Douz Desert Adventure — The Sahara Gate | Douz Desert Adventure"*.
H1: *"The Desert in its purest Form."*

---

## Verdict for Step 2

The convergence is real and structural, not imagined: **6 of the 7 named
layout patterns are confirmed present**, and the homepage repeats the
eyebrow+headline skeleton across 5 consecutive sections with no variation —
exactly the "uniform rhythm" the brief calls the single biggest AI-generated
tell. The copy itself is largely already differentiated; the CTA headline is
the one direct phrase match.

**Stopping here, as instructed.** Ready for you to review this list before I
touch the art-direction concepts (Step 2) or any code.
