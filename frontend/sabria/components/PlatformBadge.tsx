import type { Review } from "@/lib/types";

/**
 * Brand-colored wordmarks, not logo marks — enough to recognize the source
 * at a glance without reproducing anyone's actual logo artwork.
 */
const PLATFORM: Record<Review["source"], { label: string; color: string }> = {
  google: { label: "Google", color: "#4285F4" },
  airbnb: { label: "Airbnb", color: "#FF385C" },
  booking: { label: "Booking.com", color: "#003580" },
  tripadvisor: { label: "Tripadvisor", color: "#34E0A1" },
  getyourguide: { label: "GetYourGuide", color: "#FF5533" },
  wetravel: { label: "WeTravel", color: "#0F8B8D" },
  direct: { label: "Verified booking", color: "var(--accent)" },
};

export default function PlatformBadge({ source }: { source: Review["source"] }) {
  const p = PLATFORM[source];
  return (
    <span className="platform-badge" style={{ color: p.color }}>
      {p.label}
    </span>
  );
}
