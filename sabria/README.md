# Dunes Insolites — Sabria Desert Adventures

Next.js 16 (App Router) + TypeScript + Tailwind v4 frontend, built from the
`design_handoff_desert_gate` brief.

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## Routes

| Route | What it is |
|---|---|
| `/` | Landing — cinematic scroll hero, activities, how-it-works, experience, gallery, CTA |
| `/activities` | All three experiences + a side-by-side comparison |
| `/activities/[slug]` | Detail: hero, copy, what's included, meeting point, gallery, sticky booking panel, related |
| `/book` | 4-step booking flow (adventure → date/slot → details → review) |
| `/bookings/[id]` | Confirmation ticket |
| `/gallery` | Filterable mosaic with keyboard-navigable lightbox |
| `/about` | Story, how we work, guides (`#guides`) |
| `/safety` | Protocols, what to bring, FAQ |
| `/contact` | Form + details + OpenStreetMap embed |
| `/legal/privacy`, `/legal/terms` | Legal |
| `*` | Desert-themed 404 |

Plus `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, and JSON-LD on the
landing and detail pages.

## Connecting the Spring Boot backend

Everything reads through one file, [`lib/api.ts`](lib/api.ts). Point the site
at your backend with a single variable:

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.dunes-insolites.tn
```

Unset it and the site runs on local seed data with no backend — fully
clickable. The endpoints and JSON shapes expected are in
[API_CONTRACT.md](API_CONTRACT.md). If the backend goes down, cached content
keeps serving instead of erroring.

## API routes

Temporary scaffolding — these disappear once Spring Boot is wired in.

`GET /api/activities` · `GET /api/stats` · `GET /api/gallery` ·
`GET /api/reviews` · `GET /api/availability?activity=&date=` ·
`POST /api/bookings` · `GET /api/bookings/:id` · `POST /api/contact` ·
`POST /api/subscribe`

Booking validation (future date, party 1–12, slot capacity) lives in
[`lib/bookings.ts`](lib/bookings.ts) and runs on both the client and the server.

## Where the design lives

The prototype's CSS is ported near-verbatim into
[`app/globals.css`](app/globals.css) so the landing page matches the handoff
exactly; Tailwind tokens (`@theme`) are there for new work. The hero's scroll
choreography is in [`components/Hero.tsx`](components/Hero.tsx) — Framer Motion
`useScroll`/`useSpring` drives the same smoothstep formulas and cue points the
brief specifies, written to CSS custom properties on the stage.

## Before launch — content that must be replaced

- **`lib/data/reviews.ts`** — the six reviews are **invented placeholders**.
  Publishing fake reviews is illegal in the EU and destroys the trust the
  section exists to build. Export the real ones from TripAdvisor / Google /
  GetYourGuide, or email past guests.
- **`DIRECT_DISCOUNT` in `components/BookDirect.tsx`** — currently claims 15%.
  Set it to the saving actually being passed on, and make sure
  `lib/data/activities.ts` prices reflect it.
- **`site.whatsapp` and `site.phone` in `lib/site.ts`** — placeholder numbers.
- **`site.url`** — set to the real domain so OG tags and the sitemap are right.
- **Guide names and photos in `app/about/page.tsx`** — invented, and the photos
  are stock activity shots rather than the actual people.

## Still to wire up

- **Persistence** — bookings live in an in-memory `Map` (`lib/bookings.ts`).
  Swap for Prisma/Postgres; the exported functions are the whole surface.
- **Email** — confirmation send is a `TODO` in `app/api/bookings/route.ts`.
- **Payments** — the flow deliberately takes no card details; it reserves seats
  and states that payment happens at the gate or by secure link.
- **CMS** — activity copy, gallery, and stats are seeds under `lib/data/`.
- **i18n** — copy is inline English. The brief calls for EN/FR/AR with RTL
  (next-intl); nothing is externalized yet.
