import type { Activity } from "@/lib/types";

/**
 * Seed content. Swap this module for a CMS/DB query later — every consumer
 * goes through the helpers at the bottom of this file.
 */
export const activities: Activity[] = [
  {
    slug: "camel-trek",
    title: "Camel Trek",
    kicker: "01 — RIDE",
    tagline: "A guided caravan to a Bedouin camp for tea and sunset.",
    description:
      "A guided caravan over the dunes to a Bedouin camp for tea and sunset.",
    longDescription: [
      "The oldest way to cross the sand, and still the best one. You meet your caravan at the Sabria gate, climb on, and let the dromedaries set the pace — slow, rolling, unhurried.",
      "Ninety minutes out through the dune belt brings you to a Bedouin camp where mint tea is already on the fire. You sit, you drink, you watch the light go copper over the sand sea, then ride back under the first stars.",
      "No experience needed. Our handlers walk beside every camel the whole way, and children from six years up ride with a parent.",
    ],
    heroImage: "/images/camel.jpg",
    cardImage: "/images/camel.jpg",
    gallery: ["/images/camel.jpg", "/images/hero-combined.jpg", "/images/gate.jpg"],
    priceFrom: 45,
    durationMins: 120,
    difficulty: "Easy",
    groupSize: "2–10 riders",
    included: [
      "Licensed local guide and camel handler",
      "Chèche (desert scarf) and saddle blanket",
      "Mint tea and dates at the Bedouin camp",
      "Hotel pickup within Douz and Kebili",
      "Photos from the ride, sent the next day",
    ],
    notIncluded: ["Gratuities", "Dinner at the camp (add-on)", "Travel insurance"],
    meetingPoint: "The Sabria gate, 10 minutes south of Douz",
    slots: ["morning", "golden-hour"],
  },
  {
    slug: "quad-safari",
    title: "Quad Safari",
    kicker: "02 — RACE",
    tagline: "Open-throttle laps across the sand sea with a lead rider.",
    description:
      "Open-throttle laps across the sand sea with a lead rider and full kit.",
    longDescription: [
      "Automatic 250cc quads, a briefing on the flat, then straight out into the dune field behind a lead rider who knows every ridge worth taking.",
      "The route runs long and open — crests, bowls, and a few climbs steep enough to make you laugh out loud. We stop twice: once at the high dune for the view, once at the edge of the sand sea for water and photos.",
      "Riders must be 16+ and hold a valid ID. No licence required; the briefing covers everything you need.",
    ],
    heroImage: "/images/quad.jpg",
    cardImage: "/images/quad.jpg",
    gallery: ["/images/quad.jpg", "/images/hero-combined.jpg", "/images/sandboard.jpg"],
    priceFrom: 60,
    durationMins: 90,
    difficulty: "Adventurous",
    groupSize: "1–8 riders",
    included: [
      "Automatic 250cc quad, fuelled",
      "Helmet, goggles, and gloves",
      "Safety briefing and practice lap",
      "Lead rider and sweep rider",
      "Water and fruit at the halfway stop",
    ],
    notIncluded: ["Gratuities", "Passenger seat (on request)", "Travel insurance"],
    meetingPoint: "The Sabria gate, 10 minutes south of Douz",
    slots: ["morning", "golden-hour"],
  },
  {
    slug: "sandboarding",
    title: "Sandboarding",
    kicker: "03 — GLIDE",
    tagline: "Carve the tallest dunes on a waxed board.",
    description:
      "Carve the tallest dunes on a waxed board — beginners to freeriders.",
    longDescription: [
      "We drive you to the tallest rideable dune in the Sabria belt, wax the boards, and teach you to stand up in about ten minutes. After that the afternoon is yours.",
      "Boards are set up for both sitting and standing runs, so it works whether you have snowboarded before or have never strapped into anything. Instructors ride with you and film the good runs.",
      "The dune faces west, which means the last hour of the session is straight into the sunset.",
    ],
    heroImage: "/images/sandboard.jpg",
    cardImage: "/images/sandboard.jpg",
    gallery: ["/images/sandboard.jpg", "/images/hero-combined.jpg", "/images/camel.jpg"],
    priceFrom: 35,
    durationMins: 75,
    difficulty: "Moderate",
    groupSize: "1–12 riders",
    included: [
      "Waxed board and bindings in your size",
      "Instructor-led first runs",
      "4x4 transfer to the dune and back up between runs",
      "Water and fruit",
      "Video clips of your runs",
    ],
    notIncluded: ["Gratuities", "Private instructor (add-on)", "Travel insurance"],
    meetingPoint: "The Sabria gate, 10 minutes south of Douz",
    slots: ["morning", "golden-hour"],
  },
];

export function getActivities(): Activity[] {
  return activities;
}

export function getActivity(slug: string): Activity | undefined {
  return activities.find((a) => a.slug === slug);
}

export function getRelated(slug: string): Activity[] {
  return activities.filter((a) => a.slug !== slug);
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
