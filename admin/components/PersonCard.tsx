"use client";

import FlipCard, { FlipHint } from "@/components/FlipCard";

export const pillActive = "rounded-full bg-emerald/10 px-2.5 py-0.5 text-[12px] font-semibold text-emerald";
export const pillInactive = "rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-semibold text-gray-500";

/**
 * A person (guide, chauffeur, client) as a two-sided card: name, status and the main contact with
 * the actions on the front; everything else on the back.
 */
export default function PersonCard({
  name,
  subtitle,
  badge,
  headline,
  actions,
  facts,
  extra,
}: {
  name: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  /** The main lines of the front: phone, e-mail, vehicle... */
  headline?: React.ReactNode;
  /** Buttons and links; clicks on them do not turn the card. */
  actions?: React.ReactNode;
  /** Label / value pairs of the back. */
  facts: { label: string; value: React.ReactNode }[];
  extra?: React.ReactNode;
}) {
  const front = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-bold text-navy-800">{name}</h3>
          {subtitle && <p className="truncate text-[12px] text-navy-700/55">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {headline && <div className="flex flex-col gap-0.5 text-[13px] text-navy-800">{headline}</div>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-navy-700/8 pt-3">
        <FlipHint />
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      </div>
    </div>
  );
  const back = (
    <div className="flex h-full flex-col gap-3 text-[13px]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-[14px] font-bold text-navy-800">{name}</h3>
        <FlipHint back />
      </div>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-[11px] uppercase tracking-wide text-navy-700/45">{f.label}</dt>
            <dd className="font-medium text-navy-800">{f.value}</dd>
          </div>
        ))}
      </dl>
      {extra}
    </div>
  );
  return <FlipCard label={name} front={front} back={back} />;
}

export const CARD_GRID = "grid grid-cols-1 gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3";
