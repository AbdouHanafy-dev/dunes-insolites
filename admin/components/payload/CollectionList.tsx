"use client";

import { readApiError } from "@/lib/apiError";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { ColumnDef } from "./fields";
import TableFilters from "@/components/TableFilters";
import { useTableFilters } from "@/components/useTableFilters";
import type { FilterDef } from "@/lib/tableFilters";

/**
 * Payload's collection list view: a plain page (not a modal), a search
 * box, "+ Create New" linking to a real route, and rows that navigate to
 * the document's own edit page on click — not an inline modal form.
 */
export default function CollectionList<T extends Record<string, unknown>>({
  title,
  basePath,
  apiPath,
  idKey,
  titleKey,
  items,
  columns,
  filters = [],
}: {
  title: string;
  /** Route prefix, e.g. "/catalogue/hebergements" — /new and /{id} are appended. */
  basePath: string;
  /** Backend base path for DELETE by id, e.g. "tour-types". */
  apiPath: string;
  idKey: string;
  titleKey: string;
  items: T[];
  columns: ColumnDef<T>[];
  /** Extra drop-down or date filters for this list; an active/inactive and a creation-date filter are added when the rows have those fields. */
  filters?: FilterDef<T>[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Every list gets the same essentials for free: active/inactive and the creation date, when the rows carry them.
  const activeKey = items.some((i) => typeof i.isActive === "boolean") ? "isActive" : items.some((i) => typeof i.active === "boolean") ? "active" : null;
  const hasCreatedAt = items.some((i) => typeof i.createdAt === "string");
  const defs: FilterDef<T>[] = [
    ...filters,
    ...(activeKey
      ? [{
          id: "__active", label: "Statut", kind: "select" as const,
          options: [{ value: "on", label: "Actif" }, { value: "off", label: "Inactif" }],
          get: (i: T) => (i[activeKey] === false ? "off" : "on"),
        }]
      : []),
    ...(hasCreatedAt ? [{ id: "__created", label: "Créé le", kind: "date" as const, get: (i: T) => (typeof i.createdAt === "string" ? i.createdAt : null) }] : []),
  ];
  const { filtered, bar } = useTableFilters(items, defs, (i) => [
    i[titleKey] as string | number | null | undefined,
    ...columns.map((c) => {
      const v = i[c.key];
      return typeof v === "string" || typeof v === "number" ? v : null;
    }),
  ]);

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/${apiPath}/${deleteTarget[idKey]}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Suppression impossible");
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Supprimé avec succès");
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-800">{title}</h1>
          <p className="mt-1 text-sm text-navy-700/55">{items.length} élément(s)</p>
        </div>
        <Link href={`${basePath}/new`} className="btn btn-primary">
          + Créer
        </Link>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <TableFilters {...bar} placeholder="Rechercher un nom, un texte, une valeur…" />
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun élément pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700/8 bg-navy-700/[0.025] text-left text-[11px] uppercase tracking-wide text-navy-700/55">
                  {columns.map((c) => (
                    <th key={c.key} className="px-6 py-3 font-semibold">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <tr
                    key={String(item[idKey])}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`${basePath}/${item[idKey]}`)}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className="px-6 py-3 text-gray-700">
                        {c.render ? c.render(item) : String(item[c.key] ?? "—")}
                      </td>
                    ))}
                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="btn btn-danger-outline btn-sm"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-navy-700/80">
            Supprimer <strong>{String(deleteTarget[titleKey] ?? deleteTarget[idKey])}</strong> ? Cette
            action est irréversible.
          </p>
          {error && (
            <div className="mt-3 rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
              {error}
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={onDelete} disabled={busy} className="btn btn-danger">
              {busy ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
