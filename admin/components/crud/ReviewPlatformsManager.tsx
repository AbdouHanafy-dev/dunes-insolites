"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClass } from "@/components/payload/fields";
import type { AdminReviewPlatform } from "@/lib/api";
import { PlatformChip } from "./ExternalReviewsCrud";

const DEFAULT_COLOR = "#6b7280";

/**
 * The review platforms and the colour each one is shown in on the site.
 * Staff can recolour or rename a platform and add a new one here; a new
 * platform can also be created on the spot while entering a review. A
 * platform that still has reviews can't be deleted.
 */
export default function ReviewPlatformsManager({ platforms }: { platforms: AdminReviewPlatform[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { name: string; color: string }>>({});
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);

  const draftOf = (p: AdminReviewPlatform) => drafts[p.platformId] ?? { name: p.name, color: p.color };
  const setDraft = (p: AdminReviewPlatform, patch: Partial<{ name: string; color: string }>) =>
    setDrafts((d) => ({ ...d, [p.platformId]: { ...draftOf(p), ...patch } }));

  async function call(id: string, url: string, method: string, body: unknown, ok: string) {
    setBusyId(id);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message ?? data.error ?? "Une erreur est survenue.");
      return false;
    }
    toast.success(ok);
    router.refresh();
    return true;
  }

  async function onSave(p: AdminReviewPlatform) {
    const d = draftOf(p);
    if (await call(p.platformId, `/api/proxy/review-platforms/${p.platformId}`, "PUT", d, "Plateforme enregistrée")) {
      setDrafts((all) => {
        const rest = { ...all };
        delete rest[p.platformId];
        return rest;
      });
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (await call("new", "/api/proxy/review-platforms", "POST", { name: newName, color: newColor }, "Plateforme ajoutée")) {
      setNewName("");
      setNewColor(DEFAULT_COLOR);
    }
  }

  return (
    <div className="card flex flex-col gap-4 rounded-2xl p-6">
      <div>
        <h2 className="text-[15px] font-bold text-navy-800">Plateformes d’avis</h2>
        <p className="mt-1 text-[13px] text-navy-700/60">
          Chaque plateforme a sa couleur, utilisée sur le site pour ses avis. Ajoutez-en une nouvelle ici, ou directement en saisissant un avis.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-navy-700/8">
        {platforms.map((p) => {
          const d = draftOf(p);
          const dirty = d.name !== p.name || d.color !== p.color;
          return (
            <li key={p.platformId} className="flex flex-wrap items-center gap-3 py-3">
              <input
                type="color"
                aria-label={`Couleur de ${p.name}`}
                className="h-9 w-14 cursor-pointer rounded-[9px] border border-navy-700/15 bg-white p-1"
                value={d.color}
                onChange={(e) => setDraft(p, { color: e.target.value })}
              />
              <input
                type="text"
                aria-label={`Nom de ${p.name}`}
                maxLength={80}
                className={`${inputClass} max-w-[220px]`}
                value={d.name}
                onChange={(e) => setDraft(p, { name: e.target.value })}
              />
              <PlatformChip name={d.name || p.name} color={d.color} />
              <span className="text-[12px] text-navy-700/45">
                {p.reviewCount} avis{p.builtIn ? " · plateforme d’origine" : ""}
              </span>
              <span className="ml-auto flex gap-2">
                <button
                  type="button"
                  disabled={!dirty || busyId === p.platformId}
                  onClick={() => onSave(p)}
                  className="btn btn-primary"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  disabled={p.reviewCount > 0 || busyId === p.platformId}
                  title={p.reviewCount > 0 ? "Utilisée par des avis — impossible de la supprimer" : undefined}
                  onClick={() => call(p.platformId, `/api/proxy/review-platforms/${p.platformId}`, "DELETE", null, "Plateforme supprimée")}
                  className="btn btn-danger-outline"
                >
                  Supprimer
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <form onSubmit={onAdd} className="flex flex-wrap items-end gap-3 border-t border-navy-700/8 pt-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="platform-new-name" className="text-[13px] font-medium text-navy-700/70">Nouvelle plateforme</label>
          <input
            id="platform-new-name"
            type="text"
            required
            maxLength={80}
            placeholder="ex. Viator"
            className={`${inputClass} w-[220px]`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <input
          type="color"
          aria-label="Couleur de la nouvelle plateforme"
          className="h-10 w-14 cursor-pointer rounded-[9px] border border-navy-700/15 bg-white p-1"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
        />
        <PlatformChip name={newName || "Aperçu"} color={newColor} />
        <button type="submit" disabled={busyId === "new"} className="btn btn-primary ml-auto">
          Ajouter
        </button>
      </form>
    </div>
  );
}
