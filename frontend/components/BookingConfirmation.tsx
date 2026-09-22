"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { getBooking as fetchBooking } from "@/lib/api";
import { getActivity } from "@/lib/data/activities";
import { site } from "@/lib/site";
import { SLOT_LABELS, type Booking } from "@/lib/types";

type State = { status: "loading" } | { status: "found"; booking: Booking } | { status: "missing" };

export default function BookingConfirmation({ id }: { id: string }) {
  const locale = useLocale();
  const t = useTranslations("bookingConfirmation");
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
    return <div className="ticket">{t("loading")}</div>;
  }

  if (state.status === "missing") {
    return (
      <div className="ticket">
        <p className="sect-eyebrow">{t("notFoundEyebrow")}</p>
        <h1 className="sect-title" style={{ fontSize: "clamp(28px,3.4vw,44px)" }}>
          {t("notFoundTitle", { id })}
        </h1>
        <p style={{ marginTop: 18, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("notFoundBody")}
        </p>
        <div className="book-actions">
          <Link href="/contact" className="btn-accent">
            {t("contactUs")}
          </Link>
          <Link href="/book" className="btn-quiet">
            {t("startNewBooking")}
          </Link>
        </div>
      </div>
    );
  }

  const { booking } = state;
  const activity = getActivity(booking.activitySlug, locale);
  const date = new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <p className="sect-eyebrow">{t("youreBooked")}</p>
      <h1
        className="sect-title"
        style={{ fontSize: "clamp(34px,4.4vw,64px)", marginBottom: 12 }}
      >
        {t("seeYouAtGate")}
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 560, marginBottom: 44, lineHeight: 1.6 }}>
        {t("confirmationSent", { email: booking.email })}
      </p>

      <div className="ticket">
        <span className="ref">{booking.id}</span>
        <div className="rows">
          <div>
            <div className="k">{t("adventure")}</div>
            <div className="v">{activity?.title ?? booking.activitySlug}</div>
          </div>
          <div>
            <div className="k">{t("status")}</div>
            <div className="v" style={{ textTransform: "capitalize" }}>
              {booking.status}
            </div>
          </div>
          <div>
            <div className="k">{t("date")}</div>
            <div className="v">{date}</div>
          </div>
          <div>
            <div className="k">{t("departure")}</div>
            <div className="v">{SLOT_LABELS[booking.timeSlot]}</div>
          </div>
          <div>
            <div className="k">{t("party")}</div>
            <div className="v">
              {(() => {
                const size = booking.numberOfAdults + booking.numberOfChildren;
                return `${size} ${size === 1 ? t("personSingular") : t("peoplePlural")}`;
              })()}
            </div>
          </div>
          <div>
            <div className="k">{t("total")}</div>
            <div className="v">€{booking.total}</div>
          </div>
          <div>
            <div className="k">{t("bookedBy")}</div>
            <div className="v">{booking.name}</div>
          </div>
          <div>
            <div className="k">{t("meetingPoint")}</div>
            <div className="v">{activity?.meetingPoint ?? site.address}</div>
          </div>
          {booking.notes && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="k">{t("pickup")}</div>
              <div className="v">{booking.notes}</div>
            </div>
          )}
        </div>

        <div className="alert ok">{t("nothingCharged")}</div>

        <div className="book-actions">
          <Link href="/activities" className="btn-accent">
            {t("addAnotherTrip")}
          </Link>
          <Link href="/contact" className="btn-quiet">
            {t("changeSomething")}
          </Link>
        </div>
      </div>
    </>
  );
}
