"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AdminExtra } from "@/lib/api";

type Day = { activitySlug: string; date: string; status: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN"; unitsAvailable: number | null; maxUnits: number | null };
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function currentMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function shiftMonth(month: string, delta: number) { const [y, m] = month.split("-").map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

export default function ActivityAvailabilityCalendar({ activities }: { activities: AdminExtra[] }) {
  const [activityId, setActivityId] = useState(activities[0]?.extraId ?? "");
  const [month, setMonth] = useState(currentMonth);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(false);
  const activity = activities.find((item) => item.extraId === activityId);

  useEffect(() => {
    if (!activity?.slug) return;
    let ignore = false;
    Promise.resolve().then(() => {
      setLoading(true);
      return fetch(`/api/proxy/public/activities/${activity.slug}/availability-range?month=${month}`);
    }).then((res) => res.ok ? res.json() : Promise.reject(new Error("availability")))
      .then((body: { days: Day[] }) => { if (!ignore) setDays(body.days); })
      .catch(() => { if (!ignore) setDays([]); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [activity?.slug, month]);

  const cells = useMemo(() => {
    const [year, number] = month.split("-").map(Number);
    const offset = (new Date(year, number - 1, 1).getDay() + 6) % 7;
    const count = new Date(year, number, 0).getDate();
    const byDate = new Map(days.map((day) => [day.date, day]));
    const result: Array<Day | null> = Array.from({ length: offset }, () => null);
    for (let n = 1; n <= count; n += 1) {
      const date = `${month}-${String(n).padStart(2, "0")}`;
      result.push(byDate.get(date) ?? { activitySlug: activity?.slug ?? "", date, status: "UNKNOWN", unitsAvailable: null, maxUnits: null });
    }
    while (result.length % 7) result.push(null);
    return result;
  }, [activity?.slug, days, month]);

  return (
    <div className="flex flex-col gap-5">
      <header><h1 className="text-xl font-bold text-navy-800">Disponibilité des excursions</h1><p className="mt-1 text-sm text-navy-700/55">Places restantes par jour. Vert disponible, orange faible, rouge complet.</p></header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select value={activityId} onChange={(e) => setActivityId(e.target.value)} className="rounded-[9px] border border-navy-700/15 bg-surface-alt px-3.5 py-2.5 text-sm">
            {activities.map((item) => <option key={item.extraId} value={item.extraId}>{item.name}</option>)}
          </select>
          {activity && <Link href={`/catalogue/extras/${activity.extraId}`} className="btn btn-secondary">Capacité & tarifs</Link>}
        </div>
        <div className="flex items-center gap-2"><button onClick={() => setMonth((v) => shiftMonth(v, -1))} className="h-9 w-9 rounded-lg border">←</button><strong className="min-w-36 text-center capitalize">{new Date(`${month}-01`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</strong><button onClick={() => setMonth((v) => shiftMonth(v, 1))} className="h-9 w-9 rounded-lg border">→</button></div>
      </div>
      <div className="card overflow-hidden rounded-2xl">
        <div className="grid grid-cols-7 border-b border-navy-700/10">{WEEKDAYS.map((day) => <div key={day} className="py-2 text-center text-[11px] font-semibold uppercase text-navy-700/45">{day}</div>)}</div>
        <div className="grid grid-cols-7 gap-px bg-navy-700/10">
          {cells.map((day, i) => !day ? <div key={i} className="min-h-24 bg-gray-50" /> : (() => {
            const max = day.maxUnits;
            const ratio = max && day.unitsAvailable != null ? day.unitsAvailable / max : null;
            const tone = day.status === "UNAVAILABLE" ? "border-rose bg-rose/[0.06]" : ratio != null && ratio <= .25 ? "border-amber-500 bg-amber-50" : day.status === "AVAILABLE" ? "border-emerald bg-emerald/[0.045]" : "border-gray-300 bg-gray-50";
            return <div key={day.date} className={`min-h-24 border-l-4 p-3 ${tone}`}><span className="font-semibold">{Number(day.date.slice(-2))}</span><p className="mt-3 text-sm font-bold">{day.unitsAvailable ?? "?"}/{max ?? "?"}</p><p className="text-[11px] text-navy-700/50">places libres</p></div>;
          })())}
        </div>
      </div>
      {loading && <p className="text-sm text-navy-700/50">Actualisation…</p>}
    </div>
  );
}
