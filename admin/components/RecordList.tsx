"use client";

import { Fragment, useMemo, useState } from "react";
import { CARD_GRID } from "@/components/PersonCard";
import SortHeader from "@/components/SortHeader";
import ViewToggle, { type ListView } from "@/components/ViewToggle";
import { nextSort, sortRows, type SortState, type SortValue } from "@/lib/tableSort";

export type ListColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  /** What the column sorts by. Leave out to make the header a plain, unsortable label. */
  sort?: (row: T) => SortValue;
  right?: boolean;
};

/**
 * The body of a back-office list: a cards / list switch, sortable column headers and the rows.
 * Search and filters stay with the caller (`TableFilters`), which hands over the rows already filtered.
 */
export default function RecordList<T>({
  rows,
  rowKey,
  columns,
  renderCard,
  renderActions,
  onRowClick,
  defaultView = "cards",
  defaultSort = null,
  pageSize = 12,
}: {
  rows: readonly T[];
  rowKey: (row: T) => string;
  columns: ListColumn<T>[];
  /** One card of the cards view. */
  renderCard: (row: T) => React.ReactNode;
  /** The last cell of a table row; leave out for no actions column. Clicks in it do not trigger `onRowClick`. */
  renderActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  defaultView?: ListView;
  defaultSort?: SortState | null;
  /** Rows shown at once. Set to 0 only for a deliberately unpaginated compact list. */
  pageSize?: number;
}) {
  const [view, setView] = useState<ListView>(defaultView);
  const [sort, setSort] = useState<SortState | null>(defaultSort);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const column = sort ? columns.find((c) => c.key === sort.key) : undefined;
    return sort && column?.sort ? sortRows(rows, column.sort, sort.dir) : rows;
  }, [rows, columns, sort]);
  const effectiveSize = pageSize > 0 ? pageSize : Math.max(1, sorted.length);
  const pageCount = Math.max(1, Math.ceil(sorted.length / effectiveSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(currentPage * effectiveSize, (currentPage + 1) * effectiveSize);

  const pagerButton =
    "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium text-navy-700/70 transition hover:bg-navy-700/8 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 pt-3.5 sm:px-6">
        <ViewToggle view={view} onView={(next) => { setView(next); setPage(0); }} />
        {view === "cards" && columns.some((c) => c.sort) && (
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-navy-700/50">
            Trier par
            <select
              value={sort ? `${sort.key}:${sort.dir}` : ""}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(":");
                setSort(key ? { key, dir: dir === "desc" ? "desc" : "asc" } : null);
                setPage(0);
              }}
              className="rounded-lg border border-navy-700/15 bg-white px-3 py-2 text-[13px] font-normal normal-case text-navy-800 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
            >
              <option value="">Ordre d’origine</option>
              {columns
                .filter((c) => c.sort)
                .flatMap((c) => [
                  <option key={`${c.key}:asc`} value={`${c.key}:asc`}>{c.label} ↑</option>,
                  <option key={`${c.key}:desc`} value={`${c.key}:desc`}>{c.label} ↓</option>,
                ])}
            </select>
          </label>
        )}
      </div>

      {view === "cards" ? (
        <div className={CARD_GRID}>
          {pageRows.map((row) => (
            <Fragment key={rowKey(row)}>{renderCard(row)}</Fragment>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700/8 bg-navy-700/[0.025] text-left text-[11px] uppercase tracking-wide text-navy-700/55">
                {columns.map((c, i) => (
                  <SortHeader
                    key={c.key}
                    label={c.label}
                    sortKey={c.key}
                    sort={sort}
                    onSort={c.sort ? (key) => { setSort((s) => nextSort(s, key)); setPage(0); } : undefined}
                    className={`py-3 ${i === 0 ? "px-6" : "px-3"}`}
                    right={c.right}
                  />
                ))}
                {renderActions && <th className="px-6 py-3 text-right font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={`hover:bg-gray-50 ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c, i) => (
                    <td key={c.key} className={`py-3 text-gray-700 ${i === 0 ? "px-6" : "px-3"} ${c.right ? "text-right" : ""}`}>
                      {c.render ? c.render(row) : "—"}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {renderActions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sorted.length > effectiveSize && (
        <div className="flex items-center justify-between gap-3 border-t border-navy-700/8 px-6 py-3 text-xs text-navy-700/55">
          <span>
            {currentPage * effectiveSize + 1}–{Math.min((currentPage + 1) * effectiveSize, sorted.length)} sur {sorted.length}
          </span>
          <div className="flex items-center gap-1" aria-label="Pagination">
            <button
              type="button"
              className={pagerButton}
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Page précédente"
            >
              <i className="bi bi-chevron-left" aria-hidden />
            </button>
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                className={`${pagerButton} ${index === currentPage ? "!bg-navy-800 !text-white" : ""}`}
                aria-current={index === currentPage ? "page" : undefined}
                onClick={() => setPage(index)}
              >
                {index + 1}
              </button>
            ))}
            <button
              type="button"
              className={pagerButton}
              disabled={currentPage === pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Page suivante"
            >
              <i className="bi bi-chevron-right" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
