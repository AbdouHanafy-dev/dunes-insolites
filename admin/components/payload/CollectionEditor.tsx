"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/Modal";
import { FieldInput, labelClass, type FieldDef } from "./fields";

/**
 * Payload's document edit view: a full page, not a modal — breadcrumb back
 * to the list, main fields on the left, a sticky sidebar panel on the right
 * with Save/Delete and status, matching the exact shape of Payload's own
 * collection edit screen.
 */
export default function CollectionEditor({
  collectionLabel,
  basePath,
  apiPath,
  createPath,
  id,
  initialData,
  fields,
  toRequestBody,
}: {
  collectionLabel: string;
  basePath: string;
  apiPath: string;
  createPath?: string;
  /** Present when editing an existing document; absent when creating. */
  id?: string;
  initialData: Record<string, unknown>;
  fields: FieldDef[];
  toRequestBody?: (form: Record<string, unknown>) => unknown;
}) {
  const router = useRouter();
  const isEdit = !!id;
  const [form, setForm] = useState<Record<string, unknown>>(initialData);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const body = toRequestBody ? toRequestBody(form) : form;
    const url = isEdit ? `/api/proxy/${apiPath}/${id}` : `/api/proxy/${createPath ?? apiPath}`;

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? data.error ?? "Une erreur est survenue.");
      setBusy(false);
      return;
    }

    setBusy(false);
    router.push(basePath);
    router.refresh();
  }

  async function onDelete() {
    if (!id) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/${apiPath}/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Suppression impossible — cet élément est peut-être référencé ailleurs.");
      setDeleteOpen(false);
      return;
    }
    router.push(basePath);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href={basePath} className="text-sm font-medium text-navy-700/55 hover:text-navy-800">
          ← {collectionLabel}
        </Link>
        <h1 className="mt-1 text-xl font-bold text-navy-800">
          {isEdit ? String(form.name ?? "Modifier") : `Nouveau — ${collectionLabel}`}
        </h1>
      </div>

      <form onSubmit={onSave} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main fields */}
        <div className="card flex flex-col gap-4 rounded-2xl p-6">
          {fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label htmlFor={f.key} className={labelClass}>
                {f.label}
                {"hint" in f && f.hint && <span className="ml-1 text-navy-700/35">({f.hint})</span>}
              </label>
              <FieldInput
                field={f}
                value={form[f.key]}
                onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
              />
            </div>
          ))}
        </div>

        {/* Sidebar panel — Payload's signature: save/status/delete live here, not inline with fields */}
        <aside className="h-fit lg:sticky lg:top-20">
          <div className="card flex flex-col gap-4 rounded-2xl p-5">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-gradient-to-br from-gold to-gold-light px-4 py-2.5 text-sm font-bold text-navy-950 shadow-[0_4px_14px_rgba(197,155,61,0.3)] transition hover:shadow-[0_6px_20px_rgba(197,155,61,0.4)] disabled:opacity-50"
            >
              {busy ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </button>
            <Link
              href={basePath}
              className="w-full rounded-lg border border-navy-700/15 px-4 py-2.5 text-center text-sm font-medium text-navy-700 hover:bg-navy-700/5"
            >
              Annuler
            </Link>

            {isEdit && (
              <>
                <div className="border-t border-navy-700/8 pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700/35">Statut</p>
                  <p className="mt-1 text-sm text-navy-700">
                    {form.isActive === false ? "Inactif" : "Actif"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="w-full rounded-lg border border-rose/25 px-4 py-2.5 text-sm font-medium text-rose hover:bg-rose/8"
                >
                  Supprimer
                </button>
              </>
            )}

            {error && (
              <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
                {error}
              </div>
            )}
          </div>
        </aside>
      </form>

      {deleteOpen && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteOpen(false)}>
          <p className="text-sm text-navy-700/80">Cette action est irréversible.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setDeleteOpen(false)}
              className="rounded-lg border border-navy-700/15 px-4 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-700/5"
            >
              Annuler
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="rounded-lg bg-rose px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
