"use client";

import { readApiError } from "@/lib/apiError";
import { useFormIssues } from "@/components/useFormIssues";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/Modal";
import PersonCard from "@/components/PersonCard";
import RecordList, { type ListColumn } from "@/components/RecordList";
import TableFilters from "@/components/TableFilters";
import { useTableFilters } from "@/components/useTableFilters";
import { optionsFrom } from "@/lib/tableFilters";
import { useToast } from "@/components/Toast";
import Breadcrumb from "@/components/payload/Breadcrumb";
import { inputClass, labelClass } from "@/components/payload/fields";
import BlockFieldsEditor from "@/components/pages/BlockFieldsEditor";
import { BLOCK_TYPES, blockTypeDef, blockPreviewLabel } from "@/components/pages/blockTypes";
import type { AdminContentBlock, AdminTourType } from "@/lib/api";

const BASE_PATH = "/content/blocks";
const API_PATH = "content-blocks";

// A reusable block referencing itself would be a real infinite loop once
// the public API resolves it — not offered as a choice here.
const REUSABLE_TYPES = BLOCK_TYPES.filter((bt) => bt.type !== "blockReference");

const typeLabel = (type: string) => blockTypeDef(type)?.label ?? type;

const blockColumns: ListColumn<AdminContentBlock>[] = [
  { key: "label", label: "Libellé", sort: (b) => b.label, render: (b) => <span className="font-medium text-gray-800">{b.label}</span> },
  { key: "type", label: "Type", sort: (b) => typeLabel(b.type), render: (b) => `${blockTypeDef(b.type)?.icon ?? ""} ${typeLabel(b.type)}` },
  { key: "preview", label: "Aperçu", render: (b) => <span className="block max-w-xs truncate text-gray-500">{blockPreviewLabel(b.type, b.dataJson)}</span> },
  { key: "locale", label: "Langue", sort: (b) => b.locale, render: (b) => b.locale },
];

export function ContentBlocksList({ initialItems }: { initialItems: AdminContentBlock[] }) {
  const router = useRouter();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<AdminContentBlock | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { filtered, bar } = useTableFilters(
    initialItems,
    [
      { id: "type", label: "Type", kind: "select", options: optionsFrom(initialItems, (b) => b.type, typeLabel), get: (b) => b.type },
      { id: "locale", label: "Langue", kind: "select", options: optionsFrom(initialItems, (b) => b.locale), get: (b) => b.locale },
    ],
    (b) => [b.label, typeLabel(b.type), b.locale, blockPreviewLabel(b.type, b.dataJson)],
  );

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/${API_PATH}/${deleteTarget.blockId}`, { method: "DELETE" });
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
          <h1 className="text-xl font-bold text-navy-800">Blocs de contenu</h1>
          <p className="mt-1 text-sm text-navy-700/55">
            {initialItems.length} bloc(s) — réutilisables sur plusieurs pages via le bloc
            &quot;Bloc réutilisable&quot; dans l&apos;éditeur de pages.
          </p>
        </div>
        <Link href={`${BASE_PATH}/new`} className="btn btn-primary">
          + Créer
        </Link>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <TableFilters {...bar} placeholder="Libellé, type, langue…" />
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun bloc pour le moment.</p>
        ) : (
          <RecordList
            rows={filtered}
            rowKey={(b) => b.blockId}
            columns={blockColumns}
            onRowClick={(b) => router.push(`${BASE_PATH}/${b.blockId}`)}
            renderActions={(b) => (
              <button onClick={() => setDeleteTarget(b)} className="btn btn-danger-outline btn-sm">
                Supprimer
              </button>
            )}
            renderCard={(b) => (
              <PersonCard
                name={b.label}
                subtitle={`${blockTypeDef(b.type)?.icon ?? ""} ${typeLabel(b.type)}`}
                badge={<span className="rounded-full bg-navy-700/8 px-2.5 py-0.5 text-[12px] font-semibold text-navy-800">{b.locale}</span>}
                headline={<span className="line-clamp-2 text-navy-700/70">{blockPreviewLabel(b.type, b.dataJson)}</span>}
                actions={
                  <>
                    <Link href={`${BASE_PATH}/${b.blockId}`} className="text-xs font-semibold text-navy-700 hover:underline">
                      Modifier
                    </Link>
                    <button type="button" className="text-xs font-semibold text-rose hover:underline" onClick={() => setDeleteTarget(b)}>
                      Supprimer
                    </button>
                  </>
                }
                facts={[
                  { label: "Type", value: typeLabel(b.type) },
                  { label: "Langue", value: b.locale },
                  { label: "Aperçu", value: blockPreviewLabel(b.type, b.dataJson) },
                ]}
              />
            )}
          />
        )}
      </div>

      {deleteTarget && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-navy-700/80">
            Supprimer <strong>{deleteTarget.label}</strong> ? Toute page qui le référence affichera un
            bloc vide à la place. Cette action est irréversible.
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

const BLOCK_FIELDS = [
  { key: "label", label: "Libellé", type: "text", required: true },
  { key: "type", label: "Type de bloc", type: "text" },
  { key: "locale", label: "Langue", type: "text" },
  { key: "companyType", label: "Marque", type: "text" },
  { key: "dataJson", label: "Contenu du bloc", type: "text" },
];

const emptyForm: Omit<AdminContentBlock, "blockId" | "createdAt" | "updatedAt"> = {
  label: "",
  type: "richText",
  dataJson: "{}",
  locale: "FR",
  companyType: "DUNES_INSOLITES",
};

export function ContentBlockEditor({
  id,
  initialData,
  tourTypes,
}: {
  id?: string;
  initialData?: AdminContentBlock;
  tourTypes: AdminTourType[];
}) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!id;
  const fi = useFormIssues(BLOCK_FIELDS);
  const [form, setForm] = useState<Omit<AdminContentBlock, "blockId" | "createdAt" | "updatedAt">>(
    initialData ?? emptyForm,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  function patch(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    fi.clear();
    if (!form.label.trim()) {
      toast.error(fi.local([fi.issue("label", "champ obligatoire — il est vide.")]));
      return;
    }
    setBusy(true);

    const url = isEdit ? `/api/proxy/${API_PATH}/${id}` : `/api/proxy/${API_PATH}`;
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const message = await fi.fromResponse(res, "Enregistrement du bloc refusé");
      setError(message);
      toast.error(message);
      setBusy(false);
      return;
    }

    setBusy(false);
    toast.success(isEdit ? "Modifié avec succès" : "Créé avec succès");
    router.push(BASE_PATH);
    router.refresh();
  }

  async function onDelete() {
    if (!id) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/${API_PATH}/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const message = await readApiError(res, "Suppression impossible");
      setError(message);
      toast.error(message);
      setDeleteOpen(false);
      return;
    }
    toast.success("Supprimé avec succès");
    router.push(BASE_PATH);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumb
          items={[
            { label: "Blocs de contenu", href: BASE_PATH },
            { label: isEdit ? form.label || "Modifier" : "Nouveau" },
          ]}
        />
        <h1 className="mt-1 text-xl font-bold text-navy-800">
          {isEdit ? form.label || "Modifier" : "Nouveau bloc"}
        </h1>
      </div>

      <form onSubmit={onSave} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="card flex flex-col gap-4 rounded-2xl p-6">
          {fi.panel()}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass}>Libellé (usage interne, jamais public)</label>
              <input
                id="label"
                required
                className={fi.inputClass("label")}
                value={form.label}
                onChange={(e) => patch({ label: e.target.value })}
              />
              {fi.errs("label")}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Type de bloc</label>
              <select
                className={inputClass}
                value={form.type}
                onChange={(e) => patch({ type: e.target.value, dataJson: "{}" })}
              >
                {REUSABLE_TYPES.map((bt) => (
                  <option key={bt.type} value={bt.type}>
                    {bt.icon} {bt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Langue</label>
              <select
                className={inputClass}
                value={form.locale}
                onChange={(e) => patch({ locale: e.target.value as typeof form.locale })}
              >
                {["FR", "EN", "DE", "IT", "DA", "AR"].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Marque</label>
              <select
                className={inputClass}
                value={form.companyType}
                onChange={(e) => patch({ companyType: e.target.value as typeof form.companyType })}
              >
                <option value="DUNES_INSOLITES">Dunes Insolites</option>
                <option value="ROUTE_INSOLITE">Route Insolite</option>
              </select>
            </div>
          </div>

          <div className="border-t border-navy-700/8 pt-4">
            <BlockFieldsEditor
              type={form.type}
              dataJson={form.dataJson}
              tourTypes={tourTypes}
              onChange={(data) => patch({ dataJson: JSON.stringify(data) })}
            />
          </div>
        </div>

        <aside className="h-fit lg:sticky lg:top-20">
          <div className="card flex flex-col gap-4 rounded-2xl p-5">
            <button type="submit" disabled={busy} className="btn btn-primary btn-block">
              {busy ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </button>
            <Link href={BASE_PATH} className="btn btn-secondary btn-block">
              Annuler
            </Link>
            {isEdit && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="btn btn-danger-outline btn-block"
              >
                Supprimer
              </button>
            )}
            {fi.issues.length === 0 && error && (
              <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
                {error}
              </div>
            )}
          </div>
        </aside>
      </form>

      {deleteOpen && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteOpen(false)}>
          <p className="text-sm text-navy-700/80">
            Toute page qui référence ce bloc affichera un bloc vide à la place. Cette action est
            irréversible.
          </p>
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
