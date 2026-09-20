"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminGuideProfile, AdminSpokenLanguage } from "@/lib/api";

export default function GuideDirectory({ initialGuides, languages }: { initialGuides: AdminGuideProfile[]; languages: AdminSpokenLanguage[] }) {
  const toast = useToast();
  const [guides, setGuides] = useState(initialGuides);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "", languageIds: [] as string[] });
  const availableLanguages = languages.filter((language) => language.active);

  function field(key: "firstName" | "lastName" | "email" | "phoneNumber", value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleLanguage(id: string) {
    setForm((current) => ({ ...current, languageIds: current.languageIds.includes(id) ? current.languageIds.filter((languageId) => languageId !== id) : [...current.languageIds, id] }));
  }

  async function createGuide(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/proxy/guide-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, email: form.email || null, phoneNumber: form.phoneNumber || null }),
    });
    setBusy(false);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      toast.error(error.message ?? "Impossible de créer le guide.");
      return;
    }
    const created = (await response.json()) as AdminGuideProfile;
    setGuides((current) => [created, ...current]);
    setForm({ firstName: "", lastName: "", email: "", phoneNumber: "", languageIds: [] });
    toast.success("Guide ajouté à l’annuaire");
  }

  async function setActive(guide: AdminGuideProfile, active: boolean) {
    setBusy(true);
    const response = await fetch(`/api/proxy/guide-profiles/${guide.guideProfileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error("Impossible de modifier le guide.");
      return;
    }
    const updated = (await response.json()) as AdminGuideProfile;
    setGuides((current) => current.map((item) => item.guideProfileId === updated.guideProfileId ? updated : item));
    toast.success(active ? "Guide réactivé" : "Guide désactivé");
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={createGuide} className="card rounded-2xl p-5">
        <h2 className="text-sm font-bold text-navy-800">Ajouter un guide</h2>
        <p className="mt-1 text-xs text-navy-700/50">Ce profil permanent pourra être affecté à plusieurs réservations selon ses langues et sa disponibilité.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Prénom" required value={form.firstName} onChange={(value) => field("firstName", value)} />
          <Input label="Nom" required value={form.lastName} onChange={(value) => field("lastName", value)} />
          <Input label="Email" type="email" value={form.email} onChange={(value) => field("email", value)} />
          <Input label="Téléphone" value={form.phoneNumber} onChange={(value) => field("phoneNumber", value)} />
        </div>
        <fieldset className="mt-4">
          <legend className={labelClass}>Langues parlées</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {availableLanguages.map((language) => (
              <label key={language.languageId} className="flex items-center gap-2 text-sm text-navy-700/70">
                <input type="checkbox" checked={form.languageIds.includes(language.languageId)} onChange={() => toggleLanguage(language.languageId)} />
                {language.name}
              </label>
            ))}
            {availableLanguages.length === 0 && <span className="text-sm text-amber-700">Configurez d’abord les langues du catalogue.</span>}
          </div>
        </fieldset>
        <button className="btn btn-primary mt-4" type="submit" disabled={busy}>{busy ? "Création…" : "Créer le guide"}</button>
      </form>

      <div className="card overflow-hidden rounded-2xl">
        {guides.length === 0 ? <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun guide dans l’annuaire.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-6 py-3 font-medium">Guide</th><th className="px-6 py-3 font-medium">Contact</th><th className="px-6 py-3 font-medium">Langues</th><th className="px-6 py-3 font-medium">Statut</th><th className="px-6 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-gray-100">{guides.map((guide) => (
              <tr key={guide.guideProfileId} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{guide.firstName} {guide.lastName}</td>
                <td className="px-6 py-3 text-gray-600"><div>{guide.email ?? "—"}</div><div>{guide.phoneNumber ?? "—"}</div></td>
                <td className="px-6 py-3 text-gray-600">{guide.languages.length ? guide.languages.map((language) => language.name).join(", ") : "—"}</td>
                <td className="px-6 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${guide.active ? "bg-emerald/10 text-emerald" : "bg-gray-100 text-gray-500"}`}>{guide.active ? "Actif" : "Inactif"}</span></td>
                <td className="px-6 py-3 text-right"><button type="button" disabled={busy} className="text-xs font-semibold text-navy-700 hover:underline disabled:opacity-40" onClick={() => setActive(guide, !guide.active)}>{guide.active ? "Désactiver" : "Réactiver"}</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

function Input({ label, onChange, ...props }: { label: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return <label className="flex flex-col gap-1"><span className={labelClass}>{label}</span><input {...props} className={inputClass} onChange={(event) => onChange(event.target.value)} /></label>;
}
