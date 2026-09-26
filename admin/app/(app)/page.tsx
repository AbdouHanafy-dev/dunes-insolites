import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAllReservationsPage } from "@/lib/api";
import StatCard from "@/components/StatCard";
import ReservationsTable from "@/components/reservations/ReservationsTable";
import { AreaChart, BarChart, Donut, RankedBars } from "@/components/charts/Charts";
import { RESERVATION_STATUS } from "@/components/reservations/reservationStatus";
import {
  addDays, bookedByDay, groupPoints, growth, kpis, paymentTotals, statusBreakdown, topPrestations, upcomingArrivals,
} from "@/lib/dashboardData";

export const metadata: Metadata = { title: "Tableau de bord" };

const PERIODS = [7, 30, 90] as const;

// Full class names on purpose: the stylesheet only contains classes it can find written out.
const STATUS_COLORS: Record<string, { ring: string; dot: string }> = {
  PENDING: { ring: "stroke-amber-400", dot: "bg-amber-400" },
  CONFIRMED: { ring: "stroke-emerald-500", dot: "bg-emerald-500" },
  CHECKED_IN: { ring: "stroke-sky-500", dot: "bg-sky-500" },
  COMPLETED: { ring: "stroke-slate-400", dot: "bg-slate-400" },
  CANCELLED: { ring: "stroke-rose-400", dot: "bg-rose-400" },
  REJECTED: { ring: "stroke-orange-400", dot: "bg-orange-400" },
  EXPIRED: { ring: "stroke-stone-400", dot: "bg-stone-400" },
};

const eur = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} €`;
const shortDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const weekday = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const session = await getSession();
  if (!session) return null; // layout already redirects

  const requested = Number((await searchParams).period);
  const period = (PERIODS as readonly number[]).includes(requested) ? requested : 30;

  // Every status, newest first: the figures below are worked out from these rows.
  const loaded = await getAllReservationsPage(session.accessToken, 0, 500);
  const reservations = loaded.content;
  const today = new Date().toLocaleDateString("en-CA");

  const k = kpis(reservations, today, period);
  const payments = paymentTotals(reservations);
  const daily = bookedByDay(reservations, today, period);
  const curve = groupPoints(daily, period > 30 ? 7 : 1);
  const arrivals = upcomingArrivals(reservations, today, 14);
  const statuses = statusBreakdown(reservations);
  const best = topPrestations(reservations, 5);
  const pending = reservations.filter((r) => r.status === "PENDING").slice(0, 5);
  const recent = reservations.slice(0, 10);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Tableau de bord</h1>
          <p className="mt-1 text-sm text-navy-700/55">
            Du {shortDay(addDays(today, -(period - 1)))} au {shortDay(today)}.
            {loaded.totalElements > reservations.length && ` Basé sur les ${reservations.length} dernières réservations.`}
          </p>
        </div>
        <nav className="inline-flex rounded-lg border border-navy-700/15 p-0.5" aria-label="Période">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/?period=${p}`}
              aria-current={p === period ? "page" : undefined}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition ${
                p === period ? "bg-navy-800 text-white" : "text-navy-700/60 hover:text-navy-800"
              }`}
            >
              {p} jours
            </Link>
          ))}
        </nav>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6" aria-label="Indicateurs">
        <StatCard label="Chiffre d’affaires" value={eur(k.revenue)} growth={growth(reservations, today, period, "revenue")} accent="gold" icon="bi-cash-coin" note="réservé sur la période" />
        <StatCard label="Réservations" value={String(k.bookings)} growth={growth(reservations, today, period, "bookings")} accent="navy" icon="bi-calendar-check" note="reçues sur la période" />
        <StatCard label="Panier moyen" value={eur(k.averageBasket)} accent="emerald" icon="bi-bag-check" note="par réservation" />
        <StatCard
          label="À confirmer"
          value={String(k.toConfirm)}
          accent={k.toConfirm > 0 ? "rose" : "emerald"}
          icon="bi-hourglass-split"
          href="/reservations"
          note={k.toConfirm > 0 ? "en attente de réponse" : "tout est traité"}
        />
        <StatCard label="Arrivées (7 jours)" value={String(k.arrivalsWeek)} accent="navy" icon="bi-box-arrow-in-right" note={`${k.travelersWeek} voyageur${k.travelersWeek > 1 ? "s" : ""}`} />
        <StatCard label="Encaissé" value={eur(payments.collected)} accent="emerald" icon="bi-wallet2" note={`reste ${eur(payments.remaining)}`} />
      </section>

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <Panel title="Chiffre d’affaires réservé" subtitle={period > 30 ? "par semaine" : "par jour"} className="lg:col-span-2">
          <AreaChart
            points={curve.map((p) => ({ label: shortDay(p.date), value: Math.round(p.revenue), tooltip: `${shortDay(p.date)} : ${eur(p.revenue)} · ${p.bookings} réservation${p.bookings > 1 ? "s" : ""}` }))}
          />
        </Panel>
        <Panel title="Statut des réservations" subtitle="toutes périodes">
          <Donut
            centerLabel="réservations"
            slices={statuses.map((s) => ({
              label: RESERVATION_STATUS[s.key]?.label ?? s.key,
              value: s.count,
              colorClass: STATUS_COLORS[s.key]?.ring ?? "stroke-gray-400",
              dotClass: STATUS_COLORS[s.key]?.dot ?? "bg-gray-400",
            }))}
          />
        </Panel>
      </section>

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Panel title="Arrivées à venir" subtitle="voyageurs par jour, 14 jours">
          <BarChart
            items={arrivals.map((a) => ({
              label: a.date === today ? "Auj." : weekday(a.date),
              value: a.travelers,
              highlight: a.date === today,
              tooltip: `${shortDay(a.date)} : ${a.travelers} voyageur${a.travelers > 1 ? "s" : ""}, ${a.bookings} réservation${a.bookings > 1 ? "s" : ""}`,
            }))}
            emptyLabel="Aucune arrivée prévue dans les 14 prochains jours."
          />
        </Panel>
        <Panel title="Meilleures ventes" subtitle="par chiffre d’affaires">
          <RankedBars
            items={best.map((b) => ({ label: b.name, value: b.revenue, caption: `${eur(b.revenue)} · ${b.count} rés.` }))}
            emptyLabel="Aucune vente pour l’instant."
          />
        </Panel>
      </section>

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <Panel title="Paiements" subtitle="réservations en cours">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold tabular-nums text-navy-800">{Math.round(payments.rate * 100)} %</span>
            <span className="text-[13px] text-navy-700/55">encaissé</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-navy-700/8" role="img" aria-label={`${Math.round(payments.rate * 100)} % encaissé`}>
            <div className="h-full rounded-full bg-emerald" style={{ width: `${payments.rate * 100}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-navy-700/45">Encaissé</dt>
              <dd className="font-semibold tabular-nums text-emerald">{eur(payments.collected)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-navy-700/45">Reste à encaisser</dt>
              <dd className="font-semibold tabular-nums text-navy-800">{eur(payments.remaining)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="À traiter" subtitle="réservations en attente" className="lg:col-span-2">
          {pending.length === 0 ? (
            <p className="py-6 text-center text-sm text-navy-700/40">Rien en attente : tout est confirmé.</p>
          ) : (
            <ul className="divide-y divide-navy-700/8">
              {pending.map((r) => (
                <li key={r.reservationId}>
                  <Link href={`/reservations/${r.reservationId}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 hover:bg-gold/[0.06]">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy-800">{r.userName}</span>
                      <span className="block truncate text-[12px] text-navy-700/55">
                        {[...r.tourTypes, ...r.tours][0]?.name ?? r.reservationType} · arrivée {r.checkInDate ?? r.serviceDate ?? "—"}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-navy-800">{eur(r.paymentSummary?.originalTotalAmount ?? r.totalAmount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <ReservationsTable
        title="Réservations récentes"
        reservations={recent}
        canDelete={session.role === "ADMIN"}
        limit={10}
      />
    </div>
  );
}

function Panel({ title, subtitle, className = "", children }: { title: string; subtitle?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`card rounded-2xl p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-[14px] font-bold text-navy-800">{title}</h2>
        {subtitle && <span className="text-[12px] text-navy-700/45">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}
