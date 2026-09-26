/**
 * The filters every back-office table shares: a text search, drop-downs and date ranges. Kept pure
 * so the same rules apply to the reservations, the invoices, the catalogue lists and so on.
 */
export type FilterOption = { value: string; label: string };

export type SelectFilter<T> = {
  id: string;
  label: string;
  kind: "select";
  options: FilterOption[];
  /** The value of the row this filter compares with an option's value. */
  get: (row: T) => string | null | undefined;
};

export type DateFilter<T> = {
  id: string;
  label: string;
  kind: "date";
  /** An ISO date or date-time; only its first ten characters (the day) are compared. */
  get: (row: T) => string | null | undefined;
};

export type FilterDef<T> = SelectFilter<T> | DateFilter<T>;

/** select: id -> chosen value; date: `${id}:from` / `${id}:to` -> a day. Empty or missing = not filtering. */
export type FilterState = Record<string, string>;

export const dateFromKey = (id: string) => `${id}:from`;
export const dateToKey = (id: string) => `${id}:to`;

const day = (value: string | null | undefined): string => (value ?? "").slice(0, 10);

export function applyFilters<T>(rows: readonly T[], defs: readonly FilterDef<T>[], state: FilterState): T[] {
  return rows.filter((row) =>
    defs.every((def) => {
      if (def.kind === "select") {
        const wanted = state[def.id];
        return !wanted || def.get(row) === wanted;
      }
      const from = state[dateFromKey(def.id)];
      const to = state[dateToKey(def.id)];
      if (!from && !to) return true;
      const value = day(def.get(row));
      if (!value) return false;
      return (!from || value >= from) && (!to || value <= to);
    }),
  );
}

/** How many filters are set, for the reset button. */
export function activeFilterCount(state: FilterState): number {
  return Object.values(state).filter((v) => v !== "").length;
}

/** The text search: every word typed must appear in at least one of the row's fields. */
export function matchesSearch(fields: readonly (string | number | null | undefined)[], query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields.map((f) => (f == null ? "" : String(f))).join(" ").toLowerCase();
  return words.every((w) => haystack.includes(w));
}

/** The distinct values found in the rows as drop-down options, sorted by label. */
export function optionsFrom<T>(
  rows: readonly T[],
  get: (row: T) => string | null | undefined,
  labelOf: (value: string) => string = (v) => v,
): FilterOption[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const v = get(row);
    if (v) seen.add(v);
  }
  return [...seen].map((value) => ({ value, label: labelOf(value) })).sort((a, b) => a.label.localeCompare(b.label, "fr"));
}
