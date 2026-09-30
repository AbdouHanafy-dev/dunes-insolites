/**
 * Column sorting shared by every back-office list. Pure, so the same ordering rules apply to
 * the reservations, the catalogue, the invoices and so on.
 */
export type SortValue = string | number | boolean | null | undefined;
export type SortDir = "asc" | "desc";
export type SortState = { key: string; dir: SortDir };

const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

const isEmpty = (v: SortValue) => v == null || v === "";

/** Empty values are handled by `sortRows`; this compares two present ones. */
function compareValues(a: Exclude<SortValue, null | undefined>, b: Exclude<SortValue, null | undefined>): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return collator.compare(String(a), String(b));
}

/** A new array ordered by `get`. Rows with no value always go last, whichever the direction. */
export function sortRows<T>(rows: readonly T[], get: (row: T) => SortValue, dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: get(row) }))
    .sort((x, y) => {
      const xe = isEmpty(x.value);
      const ye = isEmpty(y.value);
      if (xe || ye) return xe === ye ? x.index - y.index : xe ? 1 : -1;
      return compareValues(x.value as never, y.value as never) * sign || x.index - y.index;
    })
    .map((entry) => entry.row);
}

/** Clicking a header: a new column starts ascending, the same column flips direction. */
export function nextSort(current: SortState | null, key: string): SortState {
  if (current?.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: "asc" };
}
