"use client";

import { readApiError } from "@/lib/apiError";
import { useFormIssues } from "@/components/useFormIssues";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import Breadcrumb from "@/components/payload/Breadcrumb";
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
  category: null,
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

const PAGE_FIELDS = [
  { key: "title", label: "Titre", type: "text", required: true },
  { key: "slug", label: "Slug (URL)", type: "text", required: true },
  { key: "locale", label: "Langue", type: "text" },
  { key: "companyType", label: "Marque", type: "text" },
  { key: "category", label: "Catégorie", type: "text" },
  { key: "blocks", label: "Blocs", type: "text" },
  { key: "seoTitle", label: "Titre SEO", type: "text" },
  { key: "metaDescription", label: "Meta description", type: "text" },
  { key: "focusKeyword", label: "Mot-clé principal", type: "text" },
  { key: "canonicalUrl", label: "URL canonique", type: "text" },
  { key: "ogTitle", label: "Titre Open Graph", type: "text" },
  { key: "ogDescription", label: "Description Open Graph", type: "text" },
  { key: "ogImageUrl", label: "Image Open Graph", type: "text" },
];

/** Which tab a field lives on, so a problem can take the operator straight to it. */
function tabOf(key: string): Tab | null {
  if (["title", "slug", "locale", "companyType", "category"].includes(key)) return "general";
  if (key === "blocks") return "content";
  if (key) return "seo";
  return null;
}
const TAB_LABEL: Record<Tab, string> = { general: "Contenu", content: "Blocs", seo: "SEO" };

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
  const fi = useFormIssues(PAGE_FIELDS);
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
    setError("");
    fi.clear();
    const problems = [];
    if (!form.title.trim()) problems.push(fi.issue("title", "champ obligatoire — il est vide."));
    if (!form.slug.trim()) problems.push(fi.issue("slug", "champ obligatoire — il est vide."));
    else if (/\s/.test(form.slug)) problems.push(fi.issue("slug", `ne doit pas contenir d'espaces (saisi : ${form.slug}).`));
    if (form.canonicalUrl && form.canonicalUrl.trim() && !/^https?:\/\//i.test(form.canonicalUrl.trim())) {
      problems.push(fi.issue("canonicalUrl", `doit commencer par http:// ou https:// (saisi : ${form.canonicalUrl.trim()}).`));
    }
    if (problems.length > 0) {
      const target = tabOf(problems[0].key);
      if (target) setTab(target);
      toast.error(fi.local(problems));
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
      const message = await fi.fromResponse(res, "Enregistrement de la page refusé");
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
      toast.error(await readApiError(res, action === "publish" ? "Publication refusée par le serveur" : "Dépublication refusée par le serveur"));
    }
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
    toast.success("Page supprimée");
    router.push(BASE_PATH);
    router.refresh();
  }

  const fallbackUrl = `/${form.locale === "FR" ? "" : form.locale.toLowerCase() + "/"}${form.slug}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumb
          items={[
            { label: "Pages", href: BASE_PATH },
            { label: isEdit ? form.title || "Modifier" : "Nouvelle page" },
          ]}
        />
        <h1 className="mt-1 text-xl font-bold text-navy-800">
          {isEdit ? form.title || "Modifier" : "Nouvelle page"}
        </h1>
      </div>

      <form onSubmit={onSave} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr_260px]">
        <div className="flex flex-col gap-4">
          {fi.issues.length > 0 && (
            <div role="alert" className="rounded-xl border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
              <p className="font-semibold">{fi.issues.length} problème(s) à corriger :</p>
              <ul className="mt-2 flex flex-col gap-1">
                {fi.issues.map((i, n) => {
                  const target = tabOf(i.key);
                  return (
                    <li key={`${i.path}-${n}`}>
                      {target ? (
                        <button type="button" onClick={() => setTab(target)} className="text-left underline-offset-2 hover:underline">
                          <em className="not-italic opacity-70">[{TAB_LABEL[target]}]</em> <strong>{i.label}</strong> : {i.message}
                        </button>
                      ) : (
                        <span>
                          <strong>{i.label}</strong> : {i.message}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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
                    id="title"
                    required
                    className={fi.inputClass("title")}
                    value={form.title}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                  {fi.errs("title")}
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelClass}>Slug (URL)</label>
                  <input
                    id="slug"
                    required
                    className={fi.inputClass("slug")}
                    value={form.slug}
                    onChange={(e) => patch({ slug: e.target.value })}
                  />
                  {fi.errs("slug")}
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
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelClass}>Catégorie</label>
                  <select
                    className={inputClass}
                    value={form.category ?? ""}
                    onChange={(e) => patch({ category: e.target.value === "" ? null : (e.target.value as typeof form.category) })}
                  >
                    <option value="">Page ordinaire (aucune catégorie)</option>
                    <option value="GUIDE">Guide — apparaît sur /guides</option>
                  </select>
                  <p className="text-[12px] text-navy-700/45">
                    « Guide » ajoute cette page à la liste publique /guides du site, dans sa langue —
                    aucune modification de code n&apos;est nécessaire pour publier un nouvel article.
                  </p>
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
            <button type="submit" disabled={busy} className="btn btn-primary btn-block">
              {busy ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </button>
            <Link href={BASE_PATH} className="btn btn-secondary btn-block">
              Annuler
            </Link>

            {isEdit && (
              <>
                <div className="border-t border-navy-700/8 pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700/35">Statut</p>
                  <span
                    className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                      form.status === "PUBLISHED"
                        ? "bg-emerald/12 text-emerald"
                        : "bg-navy-700/8 text-navy-700/60"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        form.status === "PUBLISHED" ? "bg-emerald" : "bg-navy-700/40"
                      }`}
                    />
                    {form.status === "PUBLISHED" ? "Publiée" : "Brouillon"}
                  </span>
                </div>
                {form.status === "PUBLISHED" ? (
                  <button
                    type="button"
                    onClick={() => setStatus("unpublish")}
                    disabled={busy}
                    className="btn btn-secondary btn-block"
                  >
                    Dépublier
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStatus("publish")}
                    disabled={busy}
                    className="btn btn-success-outline btn-block"
                  >
                    Publier
                  </button>
                )}
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
