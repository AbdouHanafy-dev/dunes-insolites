import Link from "next/link";
import type { ReactNode } from "react";

/** A headline figure: label, value, an optional change against the previous period and a small note. */
export default function StatCard({
  label,
  value,
  growth,
  accent = "gold",
  icon,
  note,
  href,
}: {
  label: string;
  value: string;
  growth?: number | null;
  accent?: "gold" | "emerald" | "navy" | "rose";
  /** A Bootstrap icon class, e.g. "bi-cash-coin". */
  icon?: string;
  note?: ReactNode;
  /** When set the whole card is a link (to what the figure is about). */
  href?: string;
}) {
  const tone = {
    gold: { bar: "bg-gold", icon: "bg-gold/15 text-gold-dark" },
    emerald: { bar: "bg-emerald", icon: "bg-emerald/12 text-emerald" },
    navy: { bar: "bg-navy-500", icon: "bg-navy-700/10 text-navy-700" },
    rose: { bar: "bg-rose", icon: "bg-rose/12 text-rose" },
  }[accent];

  const body = (
    <>
      <div className={`-mx-4 -mt-4 mb-3 h-1 sm:-mx-5 sm:-mt-5 sm:mb-4 ${tone.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium uppercase tracking-wide text-navy-700/55 sm:text-[13px] sm:normal-case sm:tracking-normal">{label}</p>
        {icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] ${tone.icon}`}>
            <i className={`bi ${icon}`} aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[22px] font-bold leading-tight tabular-nums text-navy-800 sm:mt-2 sm:text-2xl">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-navy-700/55">
        {growth != null && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              growth >= 0 ? "bg-emerald/10 text-emerald" : "bg-rose/10 text-rose"
            }`}
            title="Par rapport à la période précédente"
          >
            {growth >= 0 ? "↗" : "↘"} {Math.abs(growth).toFixed(1)} %
          </span>
        )}
        {note}
      </div>
    </>
  );

  const cls = "card block overflow-hidden rounded-2xl p-4 sm:p-5";
  return href ? (
    <Link href={href} className={`${cls} transition hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
