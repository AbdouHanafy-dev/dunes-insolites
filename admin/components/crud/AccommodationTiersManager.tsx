"use client";

import { formatApiFailure, parseApiFailure, readApiError } from "@/lib/apiError";
import { issuesFromServer, summarizeFormIssues, type FieldLike, type FormIssue } from "@/lib/formIssues";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import PhotoGalleryField, { type TourPhoto } from "@/components/tour-wizard/PhotoGalleryField";
import type { AdminAccommodationType, AdminAccommodationTypeInput } from "@/lib/api";
import PricingRulesPanel from "@/components/payload/PricingRulesPanel";
import TranslationsField, {
  type CatalogTranslationForm,
  translationsToArray,
  translationsToRecord,
} from "@/components/payload/TranslationsField";
import { fillEmptyLocales, fillNotices, tierTranslationSource } from "@/components/payload/autoTranslate";
import InventoryRulesPanel from "@/components/availability/InventoryRulesPanel";

const TIER_FIELDS: FieldLike[] = [
  { key: "name", label: "Nom", type: "text", required: true },
  { key: "slug", label: "Slug (URL)", type: "text" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "capacity", label: "Capacité (personnes / unité)", type: "number" },
  { key: "maxUnits", label: "Unités disponibles", type: "number" },
  { key: "adultPriceTtc", label: "Prix adulte", type: "number" },
  { key: "childPriceTtc", label: "Prix enfant", type: "number" },
  { key: "infantPriceTtc", label: "Prix bébé", type: "number" },
  { key: "tvaRate", label: "TVA (%)", type: "number" },
  { key: "airConditioned", label: "Climatisation", type: "text" },
  { key: "privateBathroom", label: "Salle de bain privée", type: "text" },
  { key: "features", label: "Caractéristiques", type: "textarea" },
  { key: "imageUrl", label: "Photo de couverture", type: "photo" },
  { key: "gallery", label: "Photos", type: "photo" },
];

function tierIssues(t: AdminAccommodationTypeInput): FormIssue[] {
  const out: FormIssue[] = [];
  const add = (key: string, message: string) =>
    out.push({ key, path: key, label: TIER_FIELDS.find((f) => f.key === key)?.label ?? key, message });
  if (t.name.trim() === "") add("name", "champ obligatoire — il est vide.");
  if (!Number.isFinite(t.capacity) || t.capacity < 1) {
    add("capacity", `doit être au moins 1 (saisi : ${Number.isFinite(t.capacity) ? t.capacity : "vide"}).`);
  }
  if (t.maxUnits != null && (!Number.isFinite(t.maxUnits) || t.maxUnits < 1)) {
    add("maxUnits", `doit être au moins 1, ou laissez vide (saisi : ${Number.isFinite(t.maxUnits) ? t.maxUnits : "invalide"}).`);
  }
  for (const key of ["adultPriceTtc", "childPriceTtc", "infantPriceTtc"] as const) {
    const v = t[key];
    if (v != null && (!Number.isFinite(v) || v < 0)) {
      add(key, `doit être un nombre positif ou nul, ou laissez vide (saisi : ${Number.isFinite(v) ? v : "invalide"}).`);
    }
  }
  if (t.tvaRate != null && (!Number.isFinite(t.tvaRate) || t.tvaRate < 0 || t.tvaRate > 100)) {
    add("tvaRate", `doit être entre 0 et 100 (saisi : ${Number.isFinite(t.tvaRate) ? t.tvaRate : "invalide"}).`);
  }
  return out;
}

const emptyTier = (tourTypeId: string): AdminAccommodationTypeInput => ({
  tourTypeId,
  slug: "",
  name: "",
  description: "",
  imageUrl: "",
  gallery: [],
  capacity: 2,
  maxUnits: null,
  adultPriceTtc: null,
  childPriceTtc: null,
  infantPriceTtc: null,
  tvaRate: 13,
  currency: "EUR",
  displayOrder: 0,
  active: true,
  airConditioned: false,
  privateBathroom: false,
  features: [],
});

/**
 * Nested CRUD for a nuitée's accommodation tiers (Desert Tent / Desert Room
 * / Dune Suite) — the three products the vitrine's `/en/camp/[slug]` page
 * lists as separate bookable cards, priced per person per night (adult, child, infant). Rendered
 * inside HebergementEditor's extraSection, so it shares the same page as
 * the parent Hébergement but saves independently (each tier is its own
 * backend resource, /api/accommodation-types) rather than as part of the
 * parent form's submit.
 */
export default function AccommodationTiersManager({ tourTypeId }: { tourTypeId?: string }) {
  const toast = useToast();
  const [tiers, setTiers] = useState<AdminAccommodationType[]>([]);
  const [loading, setLoading] = useState(!!tourTypeId);
  const [editing, setEditing] = useState<AdminAccommodationTypeInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tierTranslations, setTierTranslations] = useState<Record<string, CatalogTranslationForm>>({});
  const [deleteTarget, setDeleteTarget] = useState<AdminAccommodationType | null>(null);
  const [pricingTarget, setPricingTarget] = useState<AdminAccommodationType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [serverIssues, setServerIssues] = useState<FormIssue[]>([]);

  useEffect(() => {
    if (!tourTypeId) return;
    let cancelled = false;
    fetch(`/api/proxy/accommodation-types?tourTypeId=${tourTypeId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: AdminAccommodationType[]) => {
        if (!cancelled) setTiers(data);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tourTypeId]);

  if (!tourTypeId) {
    return (
      <div>
        <h2 className="text-[15px] font-bold text-navy-800">Tiers d&apos;hébergement</h2>
        <p className="mt-1 text-sm text-navy-700/55">
          Enregistrez d&apos;abord cet hébergement pour pouvoir y ajouter des tiers (Tente Désert, Chambre
          Désert, Suite Dune…).
        </p>
      </div>
    );
  }

  function openCreate() {
    setEditingId(null);
    setTierTranslations({});
    setEditing(emptyTier(tourTypeId!));
    setError("");
    setAttempted(false);
    setServerIssues([]);
  }

  function openEdit(t: AdminAccommodationType) {
    setEditingId(t.id);
    setTierTranslations(translationsToRecord(t.translations));
    setEditing({
      tourTypeId: t.tourTypeId,
      slug: t.slug,
      name: t.name,
      description: t.description ?? "",
      imageUrl: t.imageUrl ?? "",
      gallery: t.gallery ?? [],
      capacity: t.capacity,
      maxUnits: t.maxUnits,
      adultPriceTtc: t.adultPriceTtc,
      childPriceTtc: t.childPriceTtc,
      infantPriceTtc: t.infantPriceTtc,
      tvaRate: t.tvaRate,
      currency: t.currency,
      displayOrder: t.displayOrder,
      active: t.active,
      airConditioned: t.airConditioned,
      privateBathroom: t.privateBathroom,
      features: t.features,
    });
    setError("");
    setAttempted(false);
    setServerIssues([]);
  }

  async function onSave() {
    if (!editing) return;
    setAttempted(true);
    setServerIssues([]);
    const local = tierIssues(editing);
    if (local.length > 0) {
      toast.error(`Enregistrement impossible — ${summarizeFormIssues(local)}`);
      return;
    }
    setBusy(true);
    setError("");
    // Languages left completely empty are machine-filled; typed text is never overwritten and a
    // translation failure never blocks the save.
    const fill = await fillEmptyLocales(tierTranslationSource(editing), tierTranslations);
    if (fill.filled.length > 0) setTierTranslations(fill.translations);
    for (const n of fillNotices(fill)) (n.error ? toast.error : toast.success)(n.text);
    const url = editingId ? `/api/proxy/accommodation-types/${editingId}` : "/api/proxy/accommodation-types";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, translations: translationsToArray(fill.translations) }),
    });
    setBusy(false);
    if (!res.ok) {
      const failure = await parseApiFailure(res);
      const summary = formatApiFailure(failure, "Enregistrement du tier refusé par le serveur");
      const list = issuesFromServer(TIER_FIELDS, failure.fields, summary);
      setServerIssues(list);
      setError(summary);
      toast.error(`Enregistrement du tier refusé — ${summarizeFormIssues(list)} (HTTP ${failure.status})`);
      return;
    }
    const saved: AdminAccommodationType = await res.json();
    setTiers((current) => {
      if (editingId) return current.map((t) => (t.id === editingId ? saved : t));
      return [...current, saved];
    });
    toast.success(editingId ? "Tier modifié avec succès" : "Tier créé avec succès");
    setEditing(null);
    setEditingId(null);
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/accommodation-types/${deleteTarget.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error(await readApiError(res, "Suppression impossible"));
      return;
    }
    setTiers((current) => current.filter((t) => t.id !== deleteTarget.id));
    toast.success("Tier supprimé avec succès");
    setDeleteTarget(null);
  }

  function patch(fields: Partial<AdminAccommodationTypeInput>) {
    setEditing((current) => (current ? { ...current, ...fields } : current));
  }

  const issues = [...(attempted && editing ? tierIssues(editing) : []), ...serverIssues];
  const issuesFor = (key: string) => issues.filter((i) => i.key === key);
  const ic = (key: string) =>
    issuesFor(key).length > 0 ? inputClass.replace("border-navy-700/15", "border-rose") : inputClass;
  const fieldErrs = (key: string) =>
    issuesFor(key).map((i, n) => (
      <p key={n} className="text-[12px] font-medium text-rose">
        {i.message}
      </p>
    ));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-navy-800">Tiers d&apos;hébergement</h2>
          <p className="mt-1 text-sm text-navy-700/55">
            Les produits bookables de cette nuitée — Tente Désert, Chambre Désert, Suite Dune… Prix par
            unité, par nuit.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
          + Ajouter un tier
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-navy-700/55">Chargement…</p>
      ) : tiers.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-navy-700/15 px-4 py-6 text-center text-sm text-navy-700/45">
          Aucun tier — cette nuitée se réserve directement (comme le bivouac).
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-navy-700/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2.5 font-medium">Nom</th>
                <th className="px-4 py-2.5 font-medium">Prix / pers. / nuit</th>
                <th className="px-4 py-2.5 font-medium">Capacité</th>
                <th className="px-4 py-2.5 font-medium">Unités max.</th>
                <th className="px-4 py-2.5 font-medium">Statut</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tiers.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2.5 text-gray-700">{t.name}</td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {t.adultPriceTtc != null
                      ? `Adulte ${t.adultPriceTtc} € · Enfant ${t.childPriceTtc ?? t.adultPriceTtc} € · Bébé ${t.infantPriceTtc ?? 0} €`
                      : "Non configuré"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{t.capacity}</td>
                  <td className="px-4 py-2.5 text-gray-700">{t.maxUnits ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${
                        t.bookable ? "bg-emerald/10 text-emerald" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {t.bookable ? "Réservable" : t.active ? "Prix manquant" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button type="button" onClick={() => setPricingTarget(t)} className="btn btn-secondary btn-sm mr-2">
                      Stock & tarifs
                    </button>
                    <button type="button" onClick={() => openEdit(t)} className="btn btn-secondary btn-sm">
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(t)}
                      className="btn btn-danger-outline btn-sm ml-2"
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

      {editing && (
        <Modal
          title={editingId ? "Modifier le tier" : "Nouveau tier"}
          onClose={() => {
            setEditing(null);
            setEditingId(null);
          }}
          wide
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Nom</label>
              {fieldErrs("name")}
              <input
                className={ic("name")}
                value={editing.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Slug (URL)</label>
              {fieldErrs("slug")}
              <input
                className={ic("slug")}
                value={editing.slug}
                onChange={(e) => patch({ slug: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass}>Description</label>
              {fieldErrs("description")}
              <textarea
                className={`${inputClass} min-h-24`}
                value={editing.description ?? ""}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass}>Photos</label>
              {fieldErrs("gallery")}
              <PhotoGalleryField
                coverPhotoUrl={editing.imageUrl ?? null}
                onCoverChange={(url) => patch({ imageUrl: url ?? "" })}
                photos={(editing.gallery ?? []).map((url): TourPhoto => ({ url, caption: null }))}
                onPhotosChange={(photos) => patch({ gallery: photos.map((p) => p.url) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Capacité (personnes / unité)</label>
              {fieldErrs("capacity")}
              <input
                type="number"
                className={ic("capacity")}
                value={editing.capacity}
                onChange={(e) => patch({ capacity: e.target.valueAsNumber || 0 })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Unités disponibles (optionnel)</label>
              {fieldErrs("maxUnits")}
              <input
                type="number"
                className={ic("maxUnits")}
                value={editing.maxUnits ?? ""}
                onChange={(e) => patch({ maxUnits: e.target.value === "" ? null : e.target.valueAsNumber })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Prix adulte, 18 ans et + / personne / nuit (TTC)</label>
              {fieldErrs("adultPriceTtc")}
              <input
                type="number"
                step="0.001"
                min={0}
                className={ic("adultPriceTtc")}
                value={editing.adultPriceTtc ?? ""}
                onChange={(e) =>
                  patch({ adultPriceTtc: e.target.value === "" ? null : e.target.valueAsNumber })
                }
              />
              <p className="text-[12px] text-gray-500">Vide = non configuré : le type reste invisible sur le site.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Prix enfant, 3 à 18 ans / personne / nuit (TTC)</label>
              {fieldErrs("childPriceTtc")}
              <input
                type="number"
                step="0.001"
                min={0}
                className={ic("childPriceTtc")}
                value={editing.childPriceTtc ?? ""}
                onChange={(e) =>
                  patch({ childPriceTtc: e.target.value === "" ? null : e.target.valueAsNumber })
                }
              />
              <p className="text-[12px] text-gray-500">Vide = même prix qu’un adulte.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Prix bébé, 0 à 3 ans / personne / nuit (TTC)</label>
              {fieldErrs("infantPriceTtc")}
              <input
                type="number"
                step="0.001"
                min={0}
                className={ic("infantPriceTtc")}
                value={editing.infantPriceTtc ?? ""}
                onChange={(e) =>
                  patch({ infantPriceTtc: e.target.value === "" ? null : e.target.valueAsNumber })
                }
              />
              <p className="text-[12px] text-gray-500">0 ou vide = gratuit. Les bébés ne comptent pas dans la capacité.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>TVA (%)</label>
              {fieldErrs("tvaRate")}
              <input
                type="number"
                step="0.1"
                className={ic("tvaRate")}
                value={editing.tvaRate ?? ""}
                onChange={(e) =>
                  patch({ tvaRate: e.target.value === "" ? null : e.target.valueAsNumber })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass}>Caractéristiques (une par ligne)</label>
              {fieldErrs("features")}
              <textarea
                className={`${inputClass} min-h-20`}
                value={(editing.features ?? []).join("\n")}
                onChange={(e) => patch({ features: e.target.value.split("\n").filter((s) => s.trim()) })}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.active ?? true}
                onChange={(e) => patch({ active: e.target.checked })}
                className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
              />
              <span className={labelClass}>Actif</span>
            </label>
            <div />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.airConditioned ?? false}
                onChange={(e) => patch({ airConditioned: e.target.checked })}
                className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
              />
              <span className={labelClass}>Climatisation</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.privateBathroom ?? false}
                onChange={(e) => patch({ privateBathroom: e.target.checked })}
                className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
              />
              <span className={labelClass}>Salle de bain privée</span>
            </label>
            <p className="text-[12px] text-gray-500 sm:col-span-2">
              Ces deux faits sont affichés dynamiquement sur la page détail du site (icônes, texte sanitaires,
              tableau comparatif). Tout le reste (Wi-Fi, demi-pension, électricité…) est identique pour tous les
              hébergements et géré dans le code de la vitrine.
            </p>
          </div>

          <div className="mt-6 border-t border-navy-700/10 pt-5">
            <h3 className="mb-3 text-[14px] font-bold text-navy-800">Traductions</h3>
            <TranslationsField
              translations={tierTranslations}
              onChange={setTierTranslations}
              source={tierTranslationSource(editing)}
              fields={["name", "description", "highlights"]}
              labels={{ highlights: "Caractéristiques" }}
            />
          </div>

          {issues.length > 0 ? (
            <div role="alert" className="mt-4 rounded-xl border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
              <p className="font-semibold">{issues.length} problème(s) à corriger :</p>
              <ul className="mt-2 flex flex-col gap-1">
                {issues.map((i, n) => (
                  <li key={`${i.path}-${n}`}>
                    <strong>{i.label}</strong> : {i.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            error && (
              <div className="mt-4 rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
                {error}
              </div>
            )
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setEditingId(null);
              }}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            <button type="button" onClick={onSave} disabled={busy} className="btn btn-primary">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </Modal>
      )}

      {pricingTarget && (
        <Modal title={`Tarifs variables · ${pricingTarget.name}`} onClose={() => setPricingTarget(null)} wide>
          <InventoryRulesPanel
            resourceApiPath="accommodation-types"
            resourceId={pricingTarget.id}
            baseCapacity={pricingTarget.maxUnits}
          />
          <PricingRulesPanel
            resourceApiPath="accommodation-types"
            resourceId={pricingTarget.id}
            basePrice={pricingTarget.adultPriceTtc ?? undefined}
          />
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-navy-700/80">
            Supprimer <strong>{deleteTarget.name}</strong> ? Cette action est irréversible.
          </p>
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
