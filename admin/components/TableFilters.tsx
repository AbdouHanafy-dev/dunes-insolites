"use client";

import {
  activeFilterCount, dateFromKey, dateToKey,
  type FilterDef, type FilterState,
} from "@/lib/tableFilters";

const control =
  "rounded-lg border border-navy-700/15 bg-white px-3 py-2 text-[13px] text-navy-800 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25";

/**
 * The bar above a table: a search box, one drop-down per select filter, a from/to pair per date
 * filter and a reset button. The table owns the state and applies it with `applyFilters`.
 */
export default function TableFilters<T>({
  defs,
  state,
  onState,
  query,
  onQuery,
  placeholder = "Rechercher…",
  shown,
  total,
}: {
  defs: readonly FilterDef<T>[];
  state: FilterState;
  onState: (next: FilterState) => void;
  query: string;
  onQuery: (next: string) => void;
  placeholder?: string;
  shown: number;
  total: number;
}) {
  const set = (key: string, value: string) => onState({ ...state, [key]: value });
  const active = activeFilterCount(state) + (query.trim() ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 border-b border-navy-700/8 px-3.5 py-3.5 sm:px-6 sm:py-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:max-w-xs">
          <i className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-navy-700/40" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={placeholder}
            className={`${control} w-full pl-9`}
          />
        </div>

        {defs.map((def) =>
          def.kind === "select" ? (
            <label key={def.id} className="flex w-full flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-navy-700/50 sm:w-auto">
              {def.label}
              <select value={state[def.id] ?? ""} onChange={(e) => set(def.id, e.target.value)} className={`${control} w-full font-normal normal-case sm:w-auto`}>
                <option value="">Tous</option>
                {def.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <div key={def.id} className="flex w-full flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-navy-700/50 sm:w-auto">
              {def.label}
              <div className="flex w-full items-center gap-1.5 sm:w-auto">
                <input
                  type="date"
                  aria-label={`${def.label}, du`}
                  value={state[dateFromKey(def.id)] ?? ""}
                  onChange={(e) => set(dateFromKey(def.id), e.target.value)}
                  className={`${control} min-w-0 flex-1 font-normal sm:flex-none`}
                />
                <span className="text-[12px] font-normal normal-case text-navy-700/40">au</span>
                <input
                  type="date"
                  aria-label={`${def.label}, au`}
                  value={state[dateToKey(def.id)] ?? ""}
                  onChange={(e) => set(dateToKey(def.id), e.target.value)}
                  className={`${control} min-w-0 flex-1 font-normal sm:flex-none`}
                />
              </div>
            </div>
          ),
        )}

        {active > 0 && (
          <button
            type="button"
            onClick={() => {
              onState({});
              onQuery("");
            }}
            className="btn btn-secondary btn-sm mb-0.5"
          >
            Réinitialiser ({active})
          </button>
        )}
      </div>
      <p className="text-xs text-navy-700/50">
        {shown === total ? `${total} résultat${total > 1 ? "s" : ""}` : `${shown} sur ${total} résultat${total > 1 ? "s" : ""}`}
      </p>
    </div>
  );
}
