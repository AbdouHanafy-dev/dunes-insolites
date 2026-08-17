import type { Review } from "@/lib/types";

/**
 * PLACEHOLDER CONTENT — replace before launch.
 *
 * These are written as realistic examples so the layout can be designed and
 * reviewed, but they are invented. Publishing invented reviews as if they were
 * real is illegal in the EU and most other markets, and it is the fastest way
 * to lose the trust this page exists to build.
 *
 * Before going live, swap every entry here for a real review the guest
 * actually left. The two honest ways to fill this section:
 *
 *   1. Export existing reviews from TripAdvisor / GetYourGuide / Google and
 *      keep the `source` field so the provenance is visible.
 *   2. Email past guests and ask. Direct reviews get `source: "direct"`.
 */
export const reviews: Review[] = [
  {
    id: "r1",
    name: "Marta K.",
    country: "Poland",
    rating: 5,
    date: "2026-05-12",
    title: "The camp at sunset was the whole trip",
    body: "We booked the camel trek for the late slot and I am glad we did. Two hours out, tea at the camp, and the ride back with the sky still orange. Our guide walked the whole way and told us about every plant we passed.",
    activitySlug: "camel-trek",
    source: "tripadvisor",
  },
  {
    id: "r2",
    name: "Thomas B.",
    country: "Germany",
    rating: 5,
    date: "2026-04-28",
    title: "Proper dunes, not a car park",
    body: "I have done quad tours in three countries and this was the only one that actually went somewhere. Real dune field, a lead rider who let us open up, and the bikes were in good condition. Briefing was thorough.",
    activitySlug: "quad-safari",
    source: "getyourguide",
  },
  {
    id: "r3",
    name: "Sofia M.",
    country: "Italy",
    rating: 5,
    date: "2026-06-02",
    title: "Never boarded before, stood up in ten minutes",
    body: "Karim was patient and funny and had me riding down the face by the third try. They filmed it and sent the clips the next morning, which I did not expect.",
    activitySlug: "sandboarding",
    source: "direct",
  },
  {
    id: "r4",
    name: "James & Aoife",
    country: "Ireland",
    rating: 5,
    date: "2026-03-19",
    title: "Small group made all the difference",
    body: "There were six of us. On the bus tours we saw leaving Douz there were forty. Worth booking directly with them for that alone.",
    activitySlug: "camel-trek",
    source: "google",
  },
  {
    id: "r5",
    name: "Lars N.",
    country: "Denmark",
    rating: 4,
    date: "2026-05-30",
    title: "Excellent, bring more water than you think",
    body: "Great afternoon on the boards and the transfer up between runs saves your legs. Only note is that it is hot even in the late slot — they give you water but I would bring extra.",
    activitySlug: "sandboarding",
    source: "tripadvisor",
  },
  {
    id: "r6",
    name: "Amine T.",
    country: "Tunisia",
    rating: 5,
    date: "2026-06-14",
    title: "Took my family, all three generations",
    body: "My mother is 71 and rode a camel for the first time. The handlers were careful with her the whole way. My son did the quad after. Good people.",
    activitySlug: "quad-safari",
    source: "direct",
  },
];

export function averageRating(list: Review[] = reviews): string {
  if (!list.length) return "—";
  const sum = list.reduce((acc, r) => acc + r.rating, 0);
  return (sum / list.length).toFixed(1);
}
