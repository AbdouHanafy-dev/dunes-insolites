"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import PageBuilder from "./PageBuilder";
import SeoEditor from "./SeoEditor";
import LivePreviewPane from "./LivePreviewPane";
import type { AdminPage, AdminTourType, PageBlock } from "@/lib/api";

const BASE_PATH = "/content/pages";
const API_PATH = "pages";

const emptyPage: Omit<AdminPage, "pageId" | "createdAt" | "updatedAt" | "publishedAt"> = {
  title: "",
  slug: "",
  locale: "FR",
  companyType: "DUNES_INSOLITES",
  status: "DRAFT",
  seoTitle: null,
  metaDescription: null,
  focusKeyword: null,
  canonicalUrl: null,
  noIndex: false,
  noFollow: false,
  ogTitle: null,
  ogDescription: null,
  ogImageUrl: null,
  blocks: [],
};

type Tab = "general" | "content" | "seo";

export default function PagesEditor({
  id,
  initialData,
  tourTypes,
}: {
  id?: string;
  initialData?: AdminPage;
  tourTypes: AdminTourType[];
}) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!id;
  const [tab, setTab] = useState<Tab>("general");
  const [form, setForm] = useState<Omit<AdminPage, "pageId" | "createdAt" | "updatedAt" | "publishedAt">>(
    initialData ?? emptyPage,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  function patch(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const url = isEdit ? `/api/proxy/${API_PATH}/${id}` : `/api/proxy/${API_PATH}`;
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.message ?? data.error ?? "Une erreur est survenue.";
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

  async function setStatus(action: "publish" | "unpublish") {
    if (!id) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/${API_PATH}/${id}/${action}`, { method: "PATCH" });
    setBusy(false);
    if (res.ok) {
      const updated = (await res.json()) as AdminPage;
      patch({ status: updated.status });
      toast.success(action === "publish" ? "Page publiée" : "Page dépubliée");
      router.refresh();
    } else {
      toast.error(action === "publish" ? "Publication impossible." : "Dépublication impossible.");
    }
  }

  async function onDelete() {
    if (!id) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/${API_PATH}/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Suppression impossible.");
      toast.error("Suppression impossible.");
      setDeleteOpen(false);
      return;
    }
    toast.success("Page supprimée");
    router.push(BASE_PATH);
    router.refresh();
  }

  const fallbackUrl = `/${form.locale === "FR" ? "" : form.locale.toLowerCase() + "/"}${form.slug}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href={BASE_PATH} className="text-sm font-medium text-navy-700/55 hover:text-navy-800">
          ← Pages
        </Link>
        <h1 className="mt-1 text-xl font-bold text-navy-800">
          {isEdit ? form.title || "Modifier" : "Nouvelle page"}
        </h1>
      </div>

      <form onSubmit={onSave} className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr_260px]">
        <div className="flex flex-col gap-4">
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-navy-700/10 bg-white p-1">
            {(
              [
                ["general", "Contenu"],
                ["content", "Blocs"],
                ["seo", "SEO"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab === key ? "bg-gold/14 text-navy-800" : "text-navy-700/55 hover:bg-navy-700/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="card rounded-2xl p-6">
            {tab === "general" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelClass}>Titre</label>
                  <input
                    required
                    className={inputClass}
                    value={form.title}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelClass}>Slug (URL)</label>
                  <input
                    required
                    className={inputClass}
                    value={form.slug}
                    onChange={(e) => patch({ slug: e.target.value })}
                  />
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
            )}

            {tab === "content" && (
              <PageBuilder
                blocks={form.blocks}
                onChange={(blocks: PageBlock[]) => patch({ blocks })}
                tourTypes={tourTypes}
              />
            )}

            {tab === "seo" && (
              <SeoEditor form={form} onChange={patch} fallbackTitle={form.title} fallbackUrl={fallbackUrl} />
            )}
          </div>
        </div>

        {/* Live preview — the vitrine, embedded, updated on every edit before
            anything is saved. See frontend/components/LivePreview.tsx and
            ARCHITECTURE.md §10.6 for which slugs actually support this. */}
        <div className="hidden min-h-[500px] xl:block">
          <LivePreviewPane slug={form.slug} title={form.title} blocks={form.blocks} />
        </div>

        {/* Sidebar — status/publish live here, same pattern as CollectionEditor */}
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
              href={BASE_PATH}
              className="w-full rounded-lg border border-navy-700/15 px-4 py-2.5 text-center text-sm font-medium text-navy-700 hover:bg-navy-700/5"
            >
              Annuler
            </Link>

            {isEdit && (
              <>
                <div className="border-t border-navy-700/8 pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700/35">Statut</p>
                  <p className="mt-1 text-sm text-navy-700">
                    {form.status === "PUBLISHED" ? "Publiée" : "Brouillon"}
                  </p>
                </div>
                {form.status === "PUBLISHED" ? (
                  <button
                    type="button"
                    onClick={() => setStatus("unpublish")}
                    disabled={busy}
                    className="w-full rounded-lg border border-navy-700/15 px-4 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-700/5"
                  >
                    Dépublier
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStatus("publish")}
                    disabled={busy}
                    className="w-full rounded-lg border border-emerald/30 px-4 py-2.5 text-sm font-medium text-emerald hover:bg-emerald/8"
                  >
                    Publier
                  </button>
                )}
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
