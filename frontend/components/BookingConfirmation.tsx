"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBooking as fetchBooking } from "@/lib/api";
import { getActivity } from "@/lib/data/activities";
import { site } from "@/lib/site";
import { SLOT_LABELS, type Booking } from "@/lib/types";

type State = { status: "loading" } | { status: "found"; booking: Booking } | { status: "missing" };

export default function BookingConfirmation({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const booking = await fetchBooking(id);
      if (booking) {
        if (!cancelled) setState({ status: "found", booking });
        return;
      }
      // Fallback: the copy the booking flow stashed on submit.
      try {
        const raw = sessionStorage.getItem(`booking:${id}`);
        if (raw && !cancelled) {
          setState({ status: "found", booking: JSON.parse(raw) as Booking });
          return;
        }
      } catch {
        /* storage unavailable */
      }
      if (!cancelled) setState({ status: "missing" });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") {
    return <div className="ticket">Looking up your booking…</div>;
  }

  if (state.status === "missing") {
    return (
      <div className="ticket">
        <p className="sect-eyebrow">Not found</p>
        <h1 className="sect-title" style={{ fontSize: "clamp(28px,3.4vw,44px)" }}>
          We can&apos;t find booking {id}.
        </h1>
        <p style={{ marginTop: 18, color: "var(--muted)", lineHeight: 1.6 }}>
          Check the reference in your confirmation email, or get in touch and we&apos;ll dig it out.
        </p>
        <div className="book-actions">
          <Link href="/contact" className="btn-accent">
            Contact us
          </Link>
          <Link href="/book" className="btn-quiet">
            Start a new booking
          </Link>
        </div>
      </div>
    );
  }

  const { booking } = state;
  const activity = getActivity(booking.activitySlug);
  const date = new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <p className="sect-eyebrow">You&apos;re booked</p>
      <h1
        className="sect-title"
        style={{ fontSize: "clamp(34px,4.4vw,64px)", marginBottom: 12 }}
      >
        See you at the gate.
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 560, marginBottom: 44, lineHeight: 1.6 }}>
        A confirmation is on its way to {booking.email}. Keep the reference below — it&apos;s all
        your guide needs on the day.
      </p>

      <div className="ticket">
        <span className="ref">{booking.id}</span>
        <div className="rows">
          <div>
            <div className="k">Adventure</div>
            <div className="v">{activity?.title ?? booking.activitySlug}</div>
          </div>
          <div>
            <div className="k">Status</div>
            <div className="v" style={{ textTransform: "capitalize" }}>
              {booking.status}
            </div>
          </div>
          <div>
            <div className="k">Date</div>
            <div className="v">{date}</div>
          </div>
          <div>
            <div className="k">Departure</div>
            <div className="v">{SLOT_LABELS[booking.timeSlot]}</div>
          </div>
          <div>
            <div className="k">Party</div>
            <div className="v">
              {booking.partySize} {booking.partySize === 1 ? "person" : "people"}
            </div>
          </div>
          <div>
            <div className="k">Total</div>
            <div className="v">€{booking.total}</div>
          </div>
          <div>
            <div className="k">Booked by</div>
            <div className="v">{booking.name}</div>
          </div>
          <div>
            <div className="k">Meeting point</div>
            <div className="v">{activity?.meetingPoint ?? site.address}</div>
          </div>
          {booking.notes && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="k">Pickup</div>
              <div className="v">{booking.notes}</div>
            </div>
          )}
        </div>

        <div className="alert ok">
          Nothing has been charged. We take payment at the gate or by secure link — free
          cancellation up to 24 hours before your slot.
        </div>

        <div className="book-actions">
          <Link href="/activities" className="btn-accent">
            Add another trip
          </Link>
          <Link href="/contact" className="btn-quiet">
            Change something
          </Link>
        </div>
      </div>
    </>
  );
}
