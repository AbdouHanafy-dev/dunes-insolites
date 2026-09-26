/**
 * Small charts drawn with SVG and plain divs, so they cost no library, render on the server and
 * stretch to any width (phones included). Values show in the browser's native tooltip.
 */

export type ChartPoint = { label: string; value: number; tooltip?: string };

const W = 600;
const H = 200;

/** A smooth curve through the points, with the area under it filled. */
export function AreaChart({
  points,
  colorClass = "text-gold",
  emptyLabel = "Pas encore de données sur cette période.",
}: {
  points: ChartPoint[];
  colorClass?: string;
  emptyLabel?: string;
}) {
  const max = Math.max(...points.map((p) => p.value), 0);
  if (points.length < 2 || max === 0) {
    return <p className="flex h-[200px] items-center justify-center text-sm text-navy-700/40">{emptyLabel}</p>;
  }
  const step = W / (points.length - 1);
  const y = (v: number) => H - 8 - (v / max) * (H - 24);
  const coords = points.map((p, i) => [i * step, y(p.value)] as const);
  // Catmull-Rom to Bezier: a soft curve instead of a jagged line.
  let line = `M ${coords[0][0]} ${coords[0][1]}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    line += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const gradientId = `area-${colorClass.replace(/[^a-z0-9]/gi, "")}`;
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className={colorClass}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[200px] w-full overflow-visible" role="img">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="stroke-navy-700/10" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {coords.map(([x], i) => (
          <rect key={i} x={x - step / 2} y="0" width={step} height={H} fill="transparent">
            <title>{points[i].tooltip ?? `${points[i].label} : ${points[i].value}`}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-navy-700/45">
        {points.map((p, i) => (
          <span key={i} className={i % labelEvery === 0 ? "" : "invisible"}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Vertical bars, one per item; the biggest fills the height. */
export function BarChart({
  items,
  colorClass = "bg-navy-800",
  emptyLabel = "Rien à afficher.",
}: {
  items: (ChartPoint & { highlight?: boolean })[];
  colorClass?: string;
  emptyLabel?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 0);
  if (items.length === 0 || max === 0) {
    return <p className="flex h-[160px] items-center justify-center text-sm text-navy-700/40">{emptyLabel}</p>;
  }
  return (
    <div>
      <div className="flex h-[140px] items-end gap-1">
        {items.map((item, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end" title={item.tooltip ?? `${item.label} : ${item.value}`}>
            {item.value > 0 && <span className="mb-0.5 text-[10px] font-semibold text-navy-700/60">{item.value}</span>}
            <div
              className={`w-full rounded-t-md ${item.highlight ? "bg-gold" : colorClass}`}
              style={{ height: `${Math.max(item.value > 0 ? 4 : 1, (item.value / max) * 100)}%`, opacity: item.value > 0 ? 1 : 0.15 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-navy-700/45">
        {items.map((item, i) => (
          <span key={i} className="flex-1 truncate text-center">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** colorClass paints the ring (a stroke-* class), dotClass the legend swatch (a bg-* class). */
export type DonutSlice = { label: string; value: number; colorClass: string; dotClass: string };

/** A ring split in slices, with the legend beside it. */
export function Donut({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return <p className="flex h-[160px] items-center justify-center text-sm text-navy-700/40">Aucune réservation.</p>;
  }
  const r = 52;
  const c = 2 * Math.PI * r;
  const shown = slices.filter((s) => s.value > 0);
  // Where each slice starts: the sum of the ones before it.
  const starts = shown.map((_, i) => shown.slice(0, i).reduce((sum, s) => sum + (s.value / total) * c, 0));
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-[140px] w-[140px] shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img">
          <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" className="stroke-navy-700/8" />
          {shown.map((s, i) => {
            const len = (s.value / total) * c;
            return (
              <circle key={s.label} cx="70" cy="70" r={r} fill="none" strokeWidth="16" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-starts[i]} className={s.colorClass}>
                <title>{`${s.label} : ${s.value}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-navy-800">{total}</span>
          <span className="text-[11px] text-navy-700/50">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex min-w-[9rem] flex-1 flex-col gap-1.5 text-[13px]">
        {slices.filter((s) => s.value > 0).map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-navy-800">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dotClass}`} aria-hidden />
              {s.label}
            </span>
            <span className="font-semibold tabular-nums text-navy-700">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars ranked by value, each with a caption on the right. */
export function RankedBars({ items, emptyLabel = "Rien à afficher." }: { items: { label: string; value: number; caption: string }[]; emptyLabel?: string }) {
  const max = Math.max(...items.map((i) => i.value), 0);
  if (items.length === 0 || max === 0) return <p className="py-6 text-center text-sm text-navy-700/40">{emptyLabel}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium text-navy-800">{item.label}</span>
            <span className="shrink-0 tabular-nums text-navy-700/60">{item.caption}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-700/8">
            <div className="h-full rounded-full bg-gold" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
