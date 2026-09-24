"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import PhotoGalleryField, { type TourPhoto } from "@/components/tour-wizard/PhotoGalleryField";
import type { AdminAccommodationType, AdminAccommodationTypeInput } from "@/lib/api";

const emptyTier = (tourTypeId: string): AdminAccommodationTypeInput => ({
  tourTypeId,
  slug: "",
  name: "",
  description: "",
  imageUrl: "",
  gallery: [],
  capacity: 2,
  maxUnits: null,
  unitPriceTtc: null,
  tvaRate: 13,
  currency: "EUR",
  displayOrder: 0,
  active: true,
  features: [],
});

/**
 * Nested CRUD for a nuitée's accommodation tiers (Desert Tent / Desert Room
 * / Dune Suite) — the three products the vitrine's `/en/camp/[slug]` page
 * lists as separate bookable cards, priced per unit per night. Rendered
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
  const [deleteTarget, setDeleteTarget] = useState<AdminAccommodationType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    setEditing(emptyTier(tourTypeId!));
    setError("");
  }

  function openEdit(t: AdminAccommodationType) {
    setEditingId(t.id);
    setEditing({
      tourTypeId: t.tourTypeId,
      slug: t.slug,
      name: t.name,
      description: t.description ?? "",
      imageUrl: t.imageUrl ?? "",
      gallery: t.gallery ?? [],
      capacity: t.capacity,
      maxUnits: t.maxUnits,
      unitPriceTtc: t.unitPriceTtc,
      tvaRate: t.tvaRate,
      currency: t.currency,
      displayOrder: t.displayOrder,
      active: t.active,
      features: t.features,
    });
    setError("");
  }

  async function onSave() {
    if (!editing) return;
    setBusy(true);
    setError("");
    const url = editingId ? `/api/proxy/accommodation-types/${editingId}` : "/api/proxy/accommodation-types";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.message ?? data.error ?? "Une erreur est survenue.";
      setError(message);
      toast.error(message);
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
      toast.error("Suppression impossible — ce tier est peut-être référencé ailleurs.");
      return;
    }
    setTiers((current) => current.filter((t) => t.id !== deleteTarget.id));
    toast.success("Tier supprimé avec succès");
    setDeleteTarget(null);
  }

  function patch(fields: Partial<AdminAccommodationTypeInput>) {
    setEditing((current) => (current ? { ...current, ...fields } : current));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
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
                <th className="px-4 py-2.5 font-medium">Prix / nuit</th>
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
                    {t.unitPriceTtc != null ? `${t.unitPriceTtc} €` : "Non configuré"}
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
              <input
                className={inputClass}
                value={editing.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Slug (URL)</label>
              <input
                className={inputClass}
                value={editing.slug}
                onChange={(e) => patch({ slug: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} min-h-24`}
                value={editing.description ?? ""}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass}>Photos</label>
              <PhotoGalleryField
                coverPhotoUrl={editing.imageUrl ?? null}
                onCoverChange={(url) => patch({ imageUrl: url ?? "" })}
                photos={(editing.gallery ?? []).map((url): TourPhoto => ({ url, caption: null }))}
                onPhotosChange={(photos) => patch({ gallery: photos.map((p) => p.url) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Capacité (personnes / unité)</label>
              <input
                type="number"
                className={inputClass}
                value={editing.capacity}
                onChange={(e) => patch({ capacity: e.target.valueAsNumber || 0 })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Unités disponibles (optionnel)</label>
              <input
                type="number"
                className={inputClass}
                value={editing.maxUnits ?? ""}
                onChange={(e) => patch({ maxUnits: e.target.value === "" ? null : e.target.valueAsNumber })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Prix / unité / nuit (TTC)</label>
              <input
                type="number"
                step="0.001"
                className={inputClass}
                value={editing.unitPriceTtc ?? ""}
                onChange={(e) =>
                  patch({ unitPriceTtc: e.target.value === "" ? null : e.target.valueAsNumber })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>TVA (%)</label>
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={editing.tvaRate ?? ""}
                onChange={(e) =>
                  patch({ tvaRate: e.target.value === "" ? null : e.target.valueAsNumber })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass}>Caractéristiques (une par ligne)</label>
              <textarea
                className={`${inputClass} min-h-20`}
                value={(editing.features ?? []).join("\n")}
                onChange={(e) => patch({ features: e.target.value.split("\n").filter((s) => s.trim()) })}
              />
            </div>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={editing.active ?? true}
                onChange={(e) => patch({ active: e.target.checked })}
                className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
              />
              <span className={labelClass}>Actif</span>
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose">
              {error}
            </div>
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
