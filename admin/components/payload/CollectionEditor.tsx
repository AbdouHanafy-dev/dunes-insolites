"use client";

import { formatApiFailure, parseApiFailure, readApiError } from "@/lib/apiError";
import { issuesFromServer, summarizeFormIssues, validateRequired, type FormIssue } from "@/lib/formIssues";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import Breadcrumb from "./Breadcrumb";
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
  titleKey = "name",
  extraSection,
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
  /** Which field in the document holds its display title — defaults to
   *  "name" (Clients/Hébergements/Tours/Extras all have one); pass e.g.
   *  "label" for a collection that doesn't. */
  titleKey?: string;
  /** An extra card rendered below the plain fields, with direct read/write
   *  access to the same form state (e.g. TranslationsField) - saved in the
   *  same submit as everything else, not a separate follow-up request. */
  extraSection?: (form: Record<string, unknown>, patch: (fields: Record<string, unknown>) => void) => React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!id;
  const [form, setForm] = useState<Record<string, unknown>>(initialData);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [serverIssues, setServerIssues] = useState<FormIssue[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Required-field problems stay live once the operator has tried to save, so
  // each message disappears the moment its field is fixed.
  const issues = [...(attempted ? validateRequired(fields, form) : []), ...serverIssues];
  const issuesFor = (key: string) => issues.filter((i) => i.key === key);

  function focusField(key: string) {
    const el = key ? document.getElementById(key) : null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus();
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setServerIssues([]);
    setAttempted(true);
    const local = validateRequired(fields, form);
    if (local.length > 0) {
      focusField(local[0].key);
      toast.error(`Enregistrement impossible — ${summarizeFormIssues(local)}`);
      return;
    }
    setBusy(true);

    const body = toRequestBody ? toRequestBody(form) : form;
    const url = isEdit ? `/api/proxy/${apiPath}/${id}` : `/api/proxy/${createPath ?? apiPath}`;

    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const failure = await parseApiFailure(res);
      const summary = formatApiFailure(failure, "Enregistrement refusé par le serveur");
      const list = issuesFromServer(fields, failure.fields, summary);
      setServerIssues(list);
      setError(summary);
      toast.error(`Enregistrement refusé — ${summarizeFormIssues(list)} (HTTP ${failure.status})`);
      focusField(list.find((i) => i.key)?.key ?? "");
      setBusy(false);
      return;
    }

    setBusy(false);
    toast.success(isEdit ? "Modifié avec succès" : "Créé avec succès");
    router.push(basePath);
    router.refresh();
  }

  async function onDelete() {
    if (!id) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/${apiPath}/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Suppression impossible");
      setError(message);
      toast.error(message);
      setDeleteOpen(false);
      return;
    }
    toast.success("Supprimé avec succès");
    router.push(basePath);
    router.refresh();
  }

  // An extra section may render nothing for the current form state (e.g. a
  // conditional block) - then no empty card is shown.
  const extra = extraSection?.(form, (patch) => setForm((s) => ({ ...s, ...patch })));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumb
          items={[
            { label: collectionLabel, href: basePath },
            { label: isEdit ? String(form[titleKey] ?? "Modifier") : "Nouveau" },
          ]}
        />
        <h1 className="mt-1 text-xl font-bold text-navy-800">
          {isEdit ? String(form[titleKey] ?? "Modifier") : `Nouveau — ${collectionLabel}`}
        </h1>
      </div>

      <form onSubmit={onSave} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main fields */}
        <div className="card flex flex-col gap-4 rounded-2xl p-6 lg:col-start-1 lg:row-start-1">
          {issues.length > 0 && (
            <div role="alert" className="rounded-xl border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
              <p className="font-semibold">{issues.length} problème(s) à corriger :</p>
              <ul className="mt-2 flex flex-col gap-1">
                {issues.map((i, n) => (
                  <li key={`${i.path}-${n}`}>
                    {i.key ? (
                      <button type="button" onClick={() => focusField(i.key)} className="text-left underline-offset-2 hover:underline">
                        <strong>{i.label}</strong> : {i.message}
                      </button>
                    ) : (
                      <span>
                        <strong>{i.label}</strong> : {i.message}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label htmlFor={f.key} className={labelClass}>
                {f.label}
                {"hint" in f && f.hint && <span className="ml-1 text-navy-700/35">({f.hint})</span>}
              </label>
              <FieldInput
                field={f}
                value={form[f.key]}
                invalid={issuesFor(f.key).length > 0}
                onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
              />
              {issuesFor(f.key).map((i, n) => (
                <p key={n} className="text-[12px] font-medium text-rose">
                  {i.message}
                </p>
              ))}
            </div>
          ))}
        </div>

        {extra && (
          <div className="card rounded-2xl p-6 lg:col-span-2 lg:col-start-1 lg:row-start-2">{extra}</div>
        )}

        {/* Sidebar panel — Payload's signature: save/status/delete live here, not inline with fields */}
        <aside className="h-fit lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1">
          <div className="card flex flex-col gap-4 rounded-2xl p-5">
            <button type="submit" disabled={busy} className="btn btn-primary btn-block">
              {busy ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </button>
            <Link href={basePath} className="btn btn-secondary btn-block">
              Annuler
            </Link>

            {isEdit && (
              <>
                <div className="border-t border-navy-700/8 pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700/35">Statut</p>
                  <span
                    className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                      form.isActive === false
                        ? "bg-navy-700/8 text-navy-700/60"
                        : "bg-emerald/12 text-emerald"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        form.isActive === false ? "bg-navy-700/40" : "bg-emerald"
                      }`}
                    />
                    {form.isActive === false ? "Inactif" : "Actif"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="btn btn-danger-outline btn-block"
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
            <button onClick={() => setDeleteOpen(false)} className="btn btn-secondary">
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
