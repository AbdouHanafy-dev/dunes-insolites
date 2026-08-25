# Next.js starter — Sabria

A concrete, copy-paste starting point. Recreate the prototype (`landing.html`) as a Next.js app.
This is guidance, not a lockstep spec — adapt to your conventions.

## 1. Create the app
```bash
npx create-next-app@latest sabria --ts --tailwind --app --eslint
cd sabria
npm i framer-motion
```
Drop the bundled `assets/*.jpg` into `public/images/`.

## 2. Fonts — next/font (Alexandria + Inter)
`app/fonts.ts`
```ts
import { Alexandria, Inter } from "next/font/google";
export const alexandria = Alexandria({ subsets: ["latin"], weight: ["400","500","600","700","800"], variable: "--font-display" });
export const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
```
`app/layout.tsx`
```tsx
import { alexandria, inter } from "./fonts";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${alexandria.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

## 3. Tailwind tokens
`tailwind.config.ts` → `theme.extend`
```ts
colors: {
  paper: "#fdf1e1", sand: "#f3e7d3", ink: "#2a1510",
  maroon: "#2a1008", accent: "#c8642f", ember: "#f0a558",
},
fontFamily: {
  display: ["var(--font-display)", "sans-serif"],
  body: ["var(--font-body)", "system-ui", "sans-serif"],
},
borderRadius: { pill: "999px" },
maxWidth: { wrap: "1200px" },
```
Base: `body { @apply font-body text-ink bg-maroon; }`. Headings use `font-display`.

## 4. Folder / route layout
```
app/
  layout.tsx  fonts.ts  globals.css  page.tsx        // landing
  activities/[slug]/page.tsx
  book/page.tsx
  bookings/[id]/page.tsx
  about/page.tsx  contact/page.tsx  gallery/page.tsx
  api/
    availability/route.ts   bookings/route.ts
    stats/route.ts          gallery/route.ts   subscribe/route.ts
components/
  Header.tsx Hero.tsx Activities.tsx Steps.tsx
  Experience.tsx Gallery.tsx CTA.tsx Footer.tsx Reveal.tsx
lib/ db.ts  activities.ts   data/activities.ts
```
`app/page.tsx` just composes the sections:
```tsx
export default function Home() {
  return (<><Header/><Hero/><Activities/><Steps/><Experience/><Gallery/><CTA/><Footer/></>);
}
```

## 5. Hero scroll engine — Framer Motion port
The prototype drives CSS vars from a smoothed scroll value. In Framer Motion, use `useScroll`
over the tall section + `useTransform`. `smoothstep(a,b)` maps cleanly to a `useTransform` with
`{ ease }`. Keep the exact cue points from the README table.

`components/Hero.tsx`
```tsx
"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, cubicBezier } from "framer-motion";

const ss = cubicBezier(0.42, 0, 0.58, 1); // smoothstep-ish

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  // progress 0..1 across the 3000px runway (section is 100vh + 3000px)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 20 }); // inertia ≈ lerp 0.14

  // map p (0..1 over whole section). The animation lives in the first ~0.96 of the runway.
  const gateScale   = useTransform(p, [0, 0.62], [1, 8.2], { ease: ss });
  const gateOpacity = useTransform(p, [0.42, 0.6], [1, 0]);
  const sceneOpacity= useTransform(p, [0.4, 0.66], [0, 1], { ease: ss });
  const sceneScale  = useTransform(p, [0.4, 0.66, 1], [1.25, 1.0, 1.05], { ease: ss });
  const flare       = useTransform(p, [0.3, 0.5, 0.72], [0, 0.9, 0]);
  const introOpacity= useTransform(p, [0.05, 0.32], [1, 0]);
  const introY      = useTransform(p, [0.05, 0.32], [0, -120]);
  const cueOpacity  = useTransform(p, [0.02, 0.16], [1, 0]);
  const labels      = useTransform(p, [0.74, 0.96], [0, 1], { ease: ss });
  const lift        = useTransform(p, [0.74, 0.96], [18, 0]);

  return (
    <section ref={ref} className="relative" style={{ height: "calc(100vh + 3000px)" }}>
      <div className="sticky top-0 h-screen overflow-hidden isolate" style={{ perspective: 1400, background: "#14101a" }}>
        <motion.img src="/images/hero-combined.jpg" alt="" className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: sceneOpacity, scale: sceneScale }} />
        <motion.img src="/images/gate.jpg" alt="" className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: gateOpacity, scale: gateScale, transformOrigin: "50% 53%" }} />
        <motion.div className="absolute inset-0 pointer-events-none"
          style={{ opacity: flare, background: "radial-gradient(circle at 50% 50%, rgba(255,238,205,.95), rgba(255,205,140,.5) 26%, transparent 58%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 240px 60px rgba(20,10,8,.5)" }} />

        {/* labels — re-tune positions if the combined photo changes */}
        <motion.div className="absolute pointer-events-none" style={{ left: "22%", top: "40%", x: "-50%", y: lift, opacity: labels }}>{/* Ride / Camel */}</motion.div>
        {/* …quad 19%/82%, board 76%/72% … */}

        <motion.div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-paper"
          style={{ opacity: introOpacity, y: introY }}>
          <p className="tracking-[.42em] text-sm font-bold uppercase opacity-90 mb-3">Desert Adventures</p>
          <h1 className="font-display font-bold leading-[.82]" style={{ fontSize: "clamp(84px,19vw,18rem)" }}>SABRIA</h1>
          <p className="mt-5 max-w-[500px] text-lg">Step through the gate into an endless Sahara sunset.</p>
        </motion.div>

        <motion.div className="absolute left-1/2 -translate-x-1/2 bottom-9 text-paper" style={{ opacity: cueOpacity }}>{/* scroll cue */}</motion.div>
      </div>
    </section>
  );
}
```
Notes:
- `useSpring` replaces the manual `lerp(…, 0.14)` inertia. Tune stiffness/damping to taste.
- Pointer parallax (the `mx/my` bits): add a `pointermove` listener → two `useMotionValue`s →
  add small `x/y` transforms on gate (±14/10px) and scene (∓20/12px). Gate the whole thing on
  `useReducedMotion()` (snap, no parallax).
- The label percentages, the flare bell, and every cue point come straight from the README table.

## 6. Header (floating glass island)
`components/Header.tsx` — `fixed top-[18px] left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[1140px] rounded-pill`,
dark glass by default (`bg-[rgba(24,14,10,.32)] backdrop-blur-xl border border-[rgba(253,241,225,.16)]`),
and a `scrolled` state (toggle when `window.scrollY > innerHeight*0.92`, or an IntersectionObserver
sentinel) → `max-w-[1000px] bg-[rgba(253,241,225,.6)] text-ink`. CTA = solid `accent` pill.

## 7. Reveal-on-scroll
`components/Reveal.tsx` wraps children in `motion.div` with `whileInView={{ opacity:1, y:0 }}`,
`initial={{ opacity:0, y:26 }}`, `viewport={{ once:true, amount:0.16 }}`, transition .7s. Respect `useReducedMotion()`.

## 8. Backend (Route Handlers)
Data models + endpoints are in README §"Backend integration". Minimal shapes:
```ts
// lib/data/activities.ts  (seed → move to DB/CMS later)
export const activities = [
  { slug:"camel-trek",   title:"Camel Trek",   image:"/images/camel.jpg",     priceFrom:45, durationMins:120 },
  { slug:"quad-safari",  title:"Quad Safari",  image:"/images/quad.jpg",      priceFrom:60, durationMins:90  },
  { slug:"sandboarding", title:"Sandboarding", image:"/images/sandboard.jpg", priceFrom:35, durationMins:75  },
];
```
```ts
// app/api/bookings/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  // validate: activitySlug exists, date in future, partySize 1..12, slot available
  // persist (Prisma/DB), send confirmation email, return { id, status:"pending" }
  return Response.json({ id: "…", status: "pending" }, { status: 201 });
}
```
Use Prisma + Postgres, or a CMS (Sanity/Payload/Strapi) for activity/gallery/stats content so
copy is editable without deploys. Add i18n (next-intl) for EN/FR/AR (RTL for Arabic).

## 9. Before launch
- Confirm the design renders identically to `landing.html` (open it side-by-side).
- SEO metadata + OG images, sitemap, analytics, cookie consent, responsive mobile nav drawer.
- Alexandria via next/font (self-hosted automatically) — no external font request, no licensing.
