"use client";

import { readApiError } from "@/lib/apiError";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { ColumnDef } from "./fields";

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
}) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((i) => String(i[titleKey] ?? "").toLowerCase().includes(q));
  }, [items, query, titleKey]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-800">{title}</h1>
          <p className="mt-1 text-sm text-navy-700/55">{items.length} élément(s)</p>
        </div>
        <Link href={`${basePath}/new`} className="btn btn-primary">
          + Créer
        </Link>
      </div>

      <input
        type="text"
        placeholder="Rechercher…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none transition placeholder:text-navy-700/30 focus:border-gold/60 focus:ring-3 focus:ring-gold/15"
      />

      <div className="card overflow-hidden rounded-2xl">
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun élément pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  {columns.map((c) => (
                    <th key={c.key} className="px-6 py-3 font-medium">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
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
