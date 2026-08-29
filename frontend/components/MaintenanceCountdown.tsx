"use client";

import { useEffect, useState } from "react";

type Unit = { value: number; label: string };

function splitRemaining(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Ticks once a second against a fixed endsAt timestamp — not a decrementing
 * counter of its own, so it stays correct even if the tab was backgrounded
 * and setInterval got throttled or paused by the browser.
 */
export default function MaintenanceCountdown({
  endsAt,
  labels,
  soonLabel,
}: {
  endsAt: string;
  labels: { days: string; hours: string; minutes: string; seconds: string };
  soonLabel: string;
}) {
  const target = Date.parse(endsAt);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Deferred into a microtask, not called synchronously in the effect
    // body — same react-hooks/set-state-in-effect fix used for
    // NotificationBell.tsx's identical effect earlier this session.
    Promise.resolve().then(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Server-rendered pass has no `now` yet (avoids a hydration mismatch from
  // a clock read at render time) — render nothing until the client mounts.
  if (now === null) return null;

  const remainingMs = target - now;
  if (remainingMs <= 0) {
    return <p className="maint-soon">{soonLabel}</p>;
  }

  const { days, hours, minutes, seconds } = splitRemaining(remainingMs);
  // Hours/minutes/seconds always show; days only once there's at least one
  // to show — a maintenance window measured in minutes shouldn't lead with
  // "00 days".
  const units: Unit[] = [
    ...(days > 0 ? [{ value: days, label: labels.days }] : []),
    { value: hours, label: labels.hours },
    { value: minutes, label: labels.minutes },
    { value: seconds, label: labels.seconds },
  ];

  return (
    <div className="maint-countdown" role="timer" aria-live="polite">
      {units.map((u) => (
        <div key={u.label} className="maint-countdown-unit">
          <span className="maint-countdown-value">{String(u.value).padStart(2, "0")}</span>
          <span className="maint-countdown-label">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
