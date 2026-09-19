"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { MyDriverTrip } from "@/lib/api";

type DriverTripsCalendarProps = {
  trips: MyDriverTrip[];
};

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date) {
  return toLocalIsoDate(date).slice(0, 7);
}

function monthFromKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function shiftMonth(key: string, offset: number) {
  const date = monthFromKey(key);
  date.setMonth(date.getMonth() + offset);
  return monthKey(date);
}

function initialMonth(trips: MyDriverTrip[]) {
  const today = toLocalIsoDate(new Date());
  const currentMonth = today.slice(0, 7);
  const dates = trips
    .flatMap((trip) => (trip.serviceDate ? [trip.serviceDate] : []))
    .sort();

  if (dates.some((date) => date.startsWith(currentMonth))) return currentMonth;

  const nextTrip = dates.find((date) => date >= today);
  return nextTrip?.slice(0, 7) ?? dates.at(-1)?.slice(0, 7) ?? currentMonth;
}

export default function DriverTripsCalendar({ trips }: DriverTripsCalendarProps) {
  const t = useTranslations("account");
  const locale = useLocale();
  const [visibleMonth, setVisibleMonth] = useState(() => initialMonth(trips));
  const today = toLocalIsoDate(new Date());

  const datedTrips = useMemo(
    () => trips.filter((trip) => trip.serviceDate).sort((a, b) => a.serviceDate!.localeCompare(b.serviceDate!)),
    [trips],
  );
  const undatedTrips = useMemo(() => trips.filter((trip) => !trip.serviceDate), [trips]);
  const tripsByDate = useMemo(() => {
    const grouped = new Map<string, MyDriverTrip[]>();
    for (const trip of datedTrips) {
      const date = trip.serviceDate!;
      grouped.set(date, [...(grouped.get(date) ?? []), trip]);
    }
    return grouped;
  }, [datedTrips]);

  const monthDate = monthFromKey(visibleMonth);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const leadingBlankDays = (monthDate.getDay() + 6) % 7;
  const cellCount = Math.ceil((leadingBlankDays + daysInMonth) / 7) * 7;
  const calendarDays = Array.from({ length: cellCount }, (_, index) => {
    const day = index - leadingBlankDays + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, index + 1)),
  );
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(monthDate);
  const monthTripCount = datedTrips.filter((trip) => trip.serviceDate?.startsWith(visibleMonth)).length;

  const statusLabel = (status: string) => {
    const normalized = status.toLowerCase();
    return t.has(`status.${normalized}` as never) ? t(`status.${normalized}` as never) : normalized;
  };

  return (
    <>
      <section className="driver-calendar" aria-label={t("tripsCalendarLabel")}>
        <div className="driver-calendar-toolbar">
          <button
            type="button"
            className="driver-calendar-nav"
            onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
            aria-label={t("calendarPreviousMonth")}
            title={t("calendarPreviousMonth")}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <h3 aria-live="polite">{monthLabel}</h3>
          <button
            type="button"
            className="driver-calendar-nav"
            onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
            aria-label={t("calendarNextMonth")}
            title={t("calendarNextMonth")}
          >
            <span aria-hidden="true">›</span>
          </button>
          <button type="button" className="driver-calendar-today" onClick={() => setVisibleMonth(today.slice(0, 7))}>
            {t("calendarToday")}
          </button>
        </div>

        {monthTripCount === 0 && <p className="driver-calendar-empty">{t("tripsThisMonthEmpty")}</p>}

        <div className="driver-calendar-scroll">
          <div className="driver-calendar-grid">
            {weekdays.map((weekday, index) => (
              <div className="driver-calendar-weekday" key={`${weekday}-${index}`}>
                {weekday}
              </div>
            ))}

            {calendarDays.map((day, index) => {
              if (day === null) return <div className="driver-calendar-day is-outside" key={`blank-${index}`} aria-hidden="true" />;

              const date = `${visibleMonth}-${String(day).padStart(2, "0")}`;
              const dayTrips = tripsByDate.get(date) ?? [];
              const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(
                new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
              );

              return (
                <div className={`driver-calendar-day${date === today ? " is-today" : ""}`} key={date}>
                  <time className="driver-calendar-date" dateTime={date} aria-label={fullDate}>
                    {day}
                  </time>
                  <div className="driver-calendar-trips">
                    {dayTrips.map((trip) => {
                      const guests = (trip.numberOfAdults ?? 0) + (trip.numberOfChildren ?? 0);
                      const status = trip.status.toLowerCase();
                      return (
                        <article className="driver-calendar-trip" key={`${trip.reservationId}-${trip.chauffeurId}`}>
                          <strong>{trip.tourName}</strong>
                          {(trip.groupLeaderName || trip.groupName) && (
                            <span>{trip.groupLeaderName ?? trip.groupName}</span>
                          )}
                          {guests > 0 && <span>{t("driverTripGuests", { count: guests })}</span>}
                          <span className="driver-calendar-trip-status" data-status={status}>
                            {statusLabel(trip.status)}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {undatedTrips.length > 0 && (
        <section className="driver-undated-trips">
          <h3>{t("tripsUnscheduled")}</h3>
          <div className="account-list">
            {undatedTrips.map((trip) => {
              const guests = (trip.numberOfAdults ?? 0) + (trip.numberOfChildren ?? 0);
              const status = trip.status.toLowerCase();
              return (
                <article className="account-booking-card" key={`${trip.reservationId}-${trip.chauffeurId}`}>
                  <div className="account-booking-top">
                    <div>
                      <div className="account-booking-title">{trip.tourName}</div>
                      {(trip.groupLeaderName || trip.groupName) && (
                        <div className="account-booking-sub">{trip.groupLeaderName ?? trip.groupName}</div>
                      )}
                    </div>
                    <span className="status-pill" data-status={status}>
                      {statusLabel(trip.status)}
                    </span>
                  </div>
                  {guests > 0 && (
                    <div className="account-booking-grid">
                      <div>
                        <div className="k">{t("guestsLabel")}</div>
                        <div className="v">{guests}</div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
