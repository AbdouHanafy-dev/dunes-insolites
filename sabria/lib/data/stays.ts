import type { Stay } from "@/lib/types";

/**
 * Seed content. Swap this module for a CMS/DB query later — every consumer
 * goes through the helpers at the bottom of this file.
 *
 * Two nuitées — that's the whole overnight product. Everything Dunes
 * Insolites runs happens on-site in Sabria: the fixed camp, or a simpler
 * bivouac further into the dunes. Not room categories (chambre/tente/suite
 * was a wrong guess at an earlier pass) — two different nights.
 *
 * Images are reused from the existing library as placeholders — neither
 * stay has its own dedicated photography yet.
 */
export const stays: Stay[] = [
  {
    slug: "nuitee-campement",
    title: "A Night at Dunes Insolites",
    kicker: "01 — CAMPEMENT",
    tagline: "Desert traditions, dinner under the stars, and a peaceful night among the dunes.",
    description:
      "A full night at the Sabria camp — dinner under the stars, a real bed in a canvas tent, and the dunes right outside the door.",
    longDescription: [
      "Set in the quiet of the Tunisian Sahara, Dunes Insolites is a place to slow down. Arrive while the dunes are glowing, settle into your tent, and leave the noise of everyday life behind.",
      "After dinner the fire stays lit long past dark. Most guests just sit with it — there's no schedule for the evening beyond that.",
      "Your tent is prepared for comfort with quality bedding and soft light. Wake with the desert, enjoy breakfast, and take your time before heading back.",
    ],
    image: "/images/under-hero.jpg",
    gallery: ["/images/under-hero.jpg", "/images/gate.jpg"],
    priceFrom: 95,
    groupSize: "2–20 guests",
    included: [
      "Private canvas tent for the night",
      "Dinner and breakfast",
      "Campfire and mint tea",
      "Return transfer from Douz or Kebili",
    ],
    notIncluded: ["Activities (camel, quad, sandboarding — add below)", "Gratuities", "Travel insurance"],
    practicalInfo: [
      "Nights in the desert run cold even in summer — bring a warm layer",
      "No fitness requirement; suitable for all ages",
      "Showers and toilets are shared, a short walk from the tents",
    ],
    arrivalTime: "15:00",
    departureTime: "09:00",
    itinerary: [
      {
        time: "15:00",
        title: "Welcome to the camp",
        description: "Meet the team, settle into your traditional tent, and take in the quiet of the dunes.",
      },
      {
        time: "Late afternoon",
        title: "Make the desert your playground",
        description: "Choose an optional camel ride, 4x4 or quad outing, or sandboarding session before sunset.",
      },
      {
        time: "Sunset",
        title: "Tea, colour, and sand bread",
        description: "Watch the sky turn copper over the Sahara with mint tea and a demonstration of bread baked beneath the sand.",
      },
      {
        time: "Evening",
        title: "Dinner and music under the stars",
        description: "Share harira, Tunisian salad, brik, fire-cooked meat, and local sweets before gathering around the campfire.",
      },
      {
        time: "Morning",
        title: "Wake with the dunes",
        description: "Sleep deeply in your tent, then begin the day with a relaxed breakfast and the first light over the sand.",
      },
    ],
    accommodations: [
      {
        slug: "desert-tent",
        title: "Desert Tent",
        tagline: "A private canvas tent close to the fire circle.",
        description: "The classic Dunes Insolites night: a private tent, proper bedding, and the dunes just beyond your door.",
        image: "/images/under-hero.jpg",
        priceFrom: 95,
        sleeps: "Up to 2 guests",
        features: ["Private canvas tent", "Quality bedding", "Shared camp showers and toilets", "Dinner and breakfast included"],
      },
      {
        slug: "desert-room",
        title: "Desert Room",
        tagline: "A more enclosed, comfortable base at the camp.",
        description: "For guests who want the desert atmosphere with a little more privacy and a quieter night at the fixed camp.",
        image: "/images/gate.jpg",
        priceFrom: 125,
        sleeps: "Up to 3 guests",
        features: ["Enclosed room", "Private sleeping space", "Quality bedding", "Dinner and breakfast included"],
      },
      {
        slug: "dune-suite",
        title: "Dune Suite",
        tagline: "Our most spacious and private way to stay.",
        description: "A generous desert stay for couples or families, with extra room to unwind after an evening beneath the stars.",
        image: "/images/hero-combined.jpg",
        priceFrom: 165,
        sleeps: "Up to 4 guests",
        features: ["Spacious private suite", "Premium bedding", "Extra sitting space", "Dinner and breakfast included"],
      },
    ],
  },
  {
    slug: "nuitee-bivouac",
    title: "Bivouac Under the Stars",
    kicker: "02 — BIVOUAC",
    tagline: "A camel trek into the Sahara, a campfire dinner, and a night beneath a sky full of stars.",
    description:
      "No walls, no electricity — a rustic camp set up fresh each evening on a high dune, mattresses under the stars or a simple tent if the wind picks up.",
    longDescription: [
      "A camel or 4x4 takes you out past the fixed camp, further into the dune belt, to wherever that evening's site is. You watch the crew set up while the sun drops — mattresses laid out on the sand, a fire started, dinner going.",
      "There's no menu here beyond what's cooking over the coals, and no light beyond the fire and whatever the moon is doing that night. It's the plainest version of a desert night we offer, and the one regulars ask for by name.",
      "You sleep under the open sky, or in a simple tent if the wind is up, and wake with the dune to yourself before the transfer back the next morning.",
    ],
    image: "/images/hero-combined.jpg",
    gallery: ["/images/hero-combined.jpg", "/images/under-hero.jpg"],
    priceFrom: 85,
    groupSize: "2–12 guests",
    included: [
      "Experienced guide and camel trek into the dunes",
      "Dinner and breakfast prepared at the bivouac",
      "A night in a tent or beneath the open sky",
      "Mattress and blankets for the night",
      "Return to Dunes Insolites the next morning",
    ],
    notIncluded: [
      "Activities (camel, quad, sandboarding — add below)",
      "Gratuities",
      "Private tent (available on request)",
    ],
    practicalInfo: [
      "The simplest of our stays — expect sand, wind, and no walls",
      "Bring layers; bivouac nights run colder than the fixed camp",
      "Not recommended if you need a private toilet through the night",
    ],
    arrivalTime: "17:00",
    departureTime: "09:00",
    itinerary: [
      {
        time: "17:00",
        title: "Meet your camel and set out",
        description: "Leave Dunes Insolites with your guide and travel gently through the great dunes of Sabria.",
      },
      {
        time: "Sunset",
        title: "Choose your camp and watch the sunset",
        description: "Settle on a dune or near an oasis, then watch the Sahara turn gold, rose, and deep blue.",
      },
      {
        time: "Night & morning",
        title: "Campfire, stars, and a desert dawn",
        description: "Share dinner cooked over the fire, sleep in a tent or beneath the stars, then return after breakfast at 09:00.",
      },
    ],
  },
];

export function getStays(): Stay[] {
  return stays;
}

export function getStay(slug: string): Stay | undefined {
  return stays.find((s) => s.slug === slug);
}

export function getRelatedStays(slug: string): Stay[] {
  return stays.filter((s) => s.slug !== slug);
}
