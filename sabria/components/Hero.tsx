"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import HeroExperienceCard from "@/components/HeroExperienceCard";
import { site } from "@/lib/site";
import type { Activity, Stats } from "@/lib/types";

/** Shared so the real button and its two inert spacer copies stay pixel-identical. */
function ExploreLabel() {
  return (
    <>
      Explore experiences
      <span className="cta-arrow" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12h15.5M13 5.5 20 12l-7 6.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </>
  );
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** smoothstep — the exact easing every cue point in the handoff is written against. */
const ss = (e0: number, e1: number, v: number) => {
  const x = clamp01((v - e0) / (e1 - e0));
  return x * x * (3 - 2 * x);
};

export default function Hero({
  stats,
  activities,
}: {
  stats: Stats;
  activities: Activity[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Scroll progress across the 2000px runway below the sticky stage.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  // Inertia — stands in for the prototype's `lerp(smooth, target, 0.14)`.
  const p = useSpring(
    scrollYProgress,
    reduced ? { duration: 0 } : { stiffness: 90, damping: 22, mass: 0.6 },
  );

  // Pointer parallax, smoothed like the prototype's `lerp(…, 0.10)`.
  const pxRaw = useMotionValue(0);
  const pyRaw = useMotionValue(0);
  const mx = useSpring(pxRaw, { stiffness: 60, damping: 20 });
  const my = useSpring(pyRaw, { stiffness: 60, damping: 20 });

  const paint = () => {
    const el = stageRef.current;
    if (!el) return;
    const v = p.get();
    const x = reduced ? 0 : mx.get();
    const y = reduced ? 0 : my.get();
    const s = el.style;

    // The foreground cutout flies at the viewer and past them. Capped well
    // below the old 7.2x: the source is 1586px wide, and past roughly 4x it
    // is visibly upscaled — a wall of soft brick filling the screen.
    s.setProperty("--fg-scale", (1 + Math.pow(ss(0, 0.58, v), 1.3) * 3.1).toFixed(4));
    s.setProperty("--fg-opacity", (1 - ss(0.3, 0.5, v)).toFixed(4));
    s.setProperty("--fg-x", `${(x * 16).toFixed(2)}px`);
    s.setProperty("--fg-y", `${(y * 11).toFixed(2)}px`);

    // …while the plate behind it barely moves. Two layers travelling at
    // different rates is what sells the depth; the old single photograph
    // could only zoom as one flat plane.
    s.setProperty("--plate-scale", (1 + ss(0, 0.66, v) * 0.34).toFixed(4));
    s.setProperty("--plate-opacity", (1 - ss(0.36, 0.56, v)).toFixed(4));
    s.setProperty("--plate-x", `${(x * 5).toFixed(2)}px`);
    s.setProperty("--plate-y", `${(y * 4).toFixed(2)}px`);

    // The wordmark sits between them, so it needs its own middle rate.
    s.setProperty("--word-scale", (1 + ss(0, 0.46, v) * 0.7).toFixed(4));

    // Brought forward so something sharp is always on screen while the
    // foreground is at its softest.
    const sceneIn = ss(0.26, 0.54, v);
    const settle = ss(0.6, 1, v);
    s.setProperty("--scene-opacity", sceneIn.toFixed(4));
    s.setProperty("--scene-scale", (1.25 - sceneIn * 0.25 + settle * 0.05).toFixed(4));
    s.setProperty("--scene-x", `${(x * -20).toFixed(2)}px`);
    s.setProperty("--scene-y", `${(y * -12).toFixed(2)}px`);

    // The prototype ships the bloom muted; the formula is
    // ss(.3,.5,v) * (1 - ss(.52,.72,v)) * .9 if you want it back.
    s.setProperty("--flare", "0");

    const introExit = ss(0.05, 0.32, v);
    s.setProperty("--intro-opacity", (1 - introExit).toFixed(4));
    s.setProperty("--intro-y", `${(introExit * -120).toFixed(2)}px`);
    s.setProperty("--cue-opacity", (1 - ss(0.02, 0.16, v)).toFixed(4));

    // The giant wordmark drifts against the photograph a touch more slowly
    // than the arch, which reads as depth rather than a sticker on glass.
    s.setProperty("--word-x", `${(x * -7).toFixed(2)}px`);
    s.setProperty("--word-y", `${(y * -5).toFixed(2)}px`);

    // Stats and the destination card clear out as soon as the descent starts.
    s.setProperty("--hud-opacity", (1 - ss(0.01, 0.18, v)).toFixed(4));
    s.setProperty("--grade-opacity", (1 - ss(0.5, 0.72, v) * 0.5).toFixed(4));
  };

  useMotionValueEvent(p, "change", paint);
  useMotionValueEvent(mx, "change", paint);
  useMotionValueEvent(my, "change", paint);
  // Paint once on mount so a restored scroll position renders correctly.
  useEffect(paint, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduced) return;
    pxRaw.set((e.clientX / window.innerWidth - 0.5) * 2);
    pyRaw.set((e.clientY / window.innerHeight - 0.5) * 2);
  };

  const eyebrow = `${site.name} · ${site.brandLine}`;
  // "8 yrs" → "8+" reads better paired with its own two-line label below.
  const years = stats.yearsRunning.match(/\d+/)?.[0] ?? stats.yearsRunning;

  return (
    <section className="scroll" id="scroll" ref={sectionRef} onPointerMove={onPointerMove}>
      <div className="stage" ref={stageRef}>
        {/* 1 — the reveal scene, hidden until we pass through the arch */}
        <div className="layer scene">
          {/* Plain <img>: these layers are transformed every frame, so we want
              zero layout involvement from next/image's wrapper. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="cover"
            src="/images/under-hero.jpg"
            alt="Rows of canvas bungalows at the Sabria desert camp"
          />
        </div>

        {/* 2 — the plate: the same view with the gate and foreground removed,
            so there is real empty sky for the wordmark to occupy */}
        <div className="layer plate">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cover" src="/images/hero-plate.webp" alt="" />
        </div>

        {/* 3 — twilight above the photograph, blended down over its top edge */}
        <div className="layer sky-fade" />

        {/* 4 — the giant wordmark, sandwiched INTO the photograph.
            Only the word is visible here; the rest of the stack is an
            invisible spacer so this layer's layout matches the foreground
            one exactly and the word lands in the right slot. */}
        <div className="hero-stack type" aria-hidden="true">
          <p className="eyebrow">{eyebrow}</p>
          <span className="wordmark">{site.hero}</span>
          <p className="hero-sub">{site.tagline}</p>
          <div className="hero-ctas">
            <span className="cta-primary">
              <ExploreLabel />
            </span>
            <span className="cta-ghost">Discover Sabria</span>
          </div>
        </div>

        {/* 4 — the real foreground cutout: the gate and everything below the
            horizon, on genuine alpha. The wordmark passes behind the arch and
            behind the dunes instead of being faked with a gradient mask. */}
        <div className="layer foreground">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="cover"
            src="/images/hero-foreground.webp"
            alt="The lantern-lit Sabria gate at sunset"
          />
        </div>

        {/* 6 — the wordmark again, this time ABOVE the gate. Masked to its top
            half, while the copy underneath is masked to its bottom half, so
            SABRIA crosses in front of the arch and then dives behind it. The
            two masks are complements: no pixel is ever drawn twice. */}
        <div className="hero-stack front" aria-hidden="true">
          <p className="eyebrow">{eyebrow}</p>
          <span className="wordmark">{site.hero}</span>
          <p className="hero-sub">{site.tagline}</p>
          <div className="hero-ctas">
            <span className="cta-primary">
              <ExploreLabel />
            </span>
            <span className="cta-ghost">Discover Sabria</span>
          </div>
        </div>

        {/* 7–8 — grade, vignette and grain sit over everything photographic */}
        <div className="layer grade" />
        <div className="layer flare" />
        <div className="layer vignette" />
        <div className="layer grain" />

        {/* 8 — foreground copy. Mirrors the layer above, inverted: the word is
            the spacer here and everything else is real. */}
        <div className="hero-stack fore">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="wordmark" aria-hidden="true">
            {site.hero}
          </h1>
          <p className="hero-sub">{site.tagline}</p>
          <div className="hero-ctas">
            <Link href="/activities" className="cta-primary">
              <ExploreLabel />
            </Link>
            <Link href="/about" className="cta-ghost">
              Discover Sabria
            </Link>
          </div>
        </div>

        {/* 9 — the numbers, bottom left. These are the site's existing stats. */}
        <dl className="hero-stats">
          <div className="s">
            <dt className="v">{stats.guestsGuided}</dt>
            <dd className="k">Guests guided</dd>
          </div>
          <div className="rule" aria-hidden="true" />
          <div className="s">
            <dt className="v">{stats.avgRating}</dt>
            <dd className="k">Average rating</dd>
          </div>
          <div className="rule" aria-hidden="true" />
          <div className="s">
            <dt className="v">{years}+ Years</dt>
            <dd className="k">Of experience</dd>
          </div>
        </dl>

        {/* 10 — experience preview, upper-right. Kept well clear of the
            WhatsApp float, which owns the lower-right corner on its own. */}
        <HeroExperienceCard activities={activities} />

        <div className="boot" />

        <div className="cue">
          <span className="cue-label">Scroll</span>
          <span className="dot" />
        </div>
      </div>
    </section>
  );
}
