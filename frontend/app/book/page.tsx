import type { Metadata } from "next";
import { Suspense } from "react";
import BookingFlow from "@/components/BookingFlow";
import { getActivities } from "@/lib/api";

export const metadata: Metadata = {
  title: "Book a trip",
  description:
    "Reserve a camel trek, quad safari, or sandboarding session in the Sabria dunes. Morning and golden-hour departures, free cancellation up to 24 hours before.",
  alternates: { canonical: "/book" },
  robots: { index: false },
};

export default async function BookPage() {
  const activities = await getActivities();

  return (
    <section className="book-page">
      <div className="wrap">
        <p className="sect-eyebrow">Reserve your seat</p>
        <h1 className="sect-title" style={{ fontSize: "clamp(34px,4.4vw,64px)", marginBottom: 44 }}>
          Book a trip.
        </h1>
        <Suspense fallback={<div className="book-card">Loading the booking desk…</div>}>
          <BookingFlow activities={activities} />
        </Suspense>
      </div>
    </section>
  );
}
