"use client";

import { useState } from "react";
import { applyFilters, matchesSearch, type FilterDef, type FilterState } from "@/lib/tableFilters";

/**
 * Search + drop-down + date filters for a table, in one call. Spread `bar` onto `<TableFilters>`
 * and render `filtered`.
 */
export function useTableFilters<T>(
  rows: readonly T[],
  defs: readonly FilterDef<T>[],
  searchFields: (row: T) => readonly (string | number | null | undefined)[],
) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<FilterState>({});
  const filtered = applyFilters(rows, defs, state).filter((row) => matchesSearch(searchFields(row), query));
  return {
    filtered,
    bar: { defs, state, onState: setState, query, onQuery: setQuery, shown: filtered.length, total: rows.length },
  };
}
