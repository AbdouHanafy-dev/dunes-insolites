"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { Activity } from "@/lib/types";

const ROTATE_MS = 5500;
const FADE_MS = 380;

/**
 * The hero's "here's something you can actually do" preview. Cycles through
 * the real activity list — reusing the same data the Experiences mega menu
 * reads from — rather than repeating the SABRIA wordmark a second time.
 */
export default function HeroExperienceCard({ activities }: { activities: Activity[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reduced || activities.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % activities.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [reduced, activities.length]);

  const activity = activities[index];
  if (!activity) return null;

  return (
    <Link
      href={`/activities/${activity.slug}`}
      className="hero-card"
      aria-label={`Explore ${activity.title} — ${activity.tagline}`}
    >
      {/* Nested so the rotation crossfade (this element) and the scroll-driven
          fade-out (the `.hero-card` anchor, via --hud-opacity) don't fight
          over the same `opacity` property. */}
      <span className="card-fade" style={{ opacity: visible ? 1 : 0 }}>
        <span className="shot">
          <Image
            src={activity.cardImage}
            alt=""
            fill
            sizes="200px"
            style={{ objectFit: "cover" }}
          />
        </span>
        <span className="meta">
          <span className="kicker">{activity.kicker}</span>
          <span className="t">{activity.title}</span>
          <span className="sub">{activity.tagline}</span>
        </span>
        <span className="go">Explore →</span>
      </span>
      {activities.length > 1 && (
        <span className="dots" aria-hidden="true">
          {activities.map((a, i) => (
            <span key={a.slug} className={i === index ? "dot on" : "dot"} />
          ))}
        </span>
      )}
    </Link>
  );
}
