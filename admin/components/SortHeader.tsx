"use client";

import type { SortState } from "@/lib/tableSort";

/** A table header cell that sorts its column when clicked. Pass `onSort` undefined for a plain header. */
export default function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  className = "px-3 py-3",
  right,
}: {
  label: string;
  sortKey: string;
  sort: SortState | null;
  onSort?: (key: string) => void;
  className?: string;
  right?: boolean;
}) {
  const active = sort?.key === sortKey;
  return (
    <th
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={`${className} font-semibold ${right ? "text-right" : ""}`}
    >
      {onSort ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={`inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-navy-800 ${active ? "text-navy-800" : ""}`}
        >
          {label}
          <i
            className={`bi ${active ? (sort.dir === "asc" ? "bi-caret-up-fill" : "bi-caret-down-fill") : "bi-chevron-expand"} text-[10px] ${active ? "" : "opacity-40"}`}
            aria-hidden
          />
        </button>
      ) : (
        label
      )}
    </th>
  );
}
