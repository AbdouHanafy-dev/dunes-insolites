"use client";

import { readApiError } from "@/lib/apiError";
import { useFormIssues } from "@/components/useFormIssues";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminGuideProfile, AdminSpokenLanguage } from "@/lib/api";
import TableFilters from "@/components/TableFilters";
import { useTableFilters } from "@/components/useTableFilters";

const GUIDE_FIELDS = [
  { key: "firstName", label: "Prénom", type: "text", required: true },
  { key: "lastName", label: "Nom", type: "text", required: true },
  { key: "email", label: "Email", type: "text" },
  { key: "phoneNumber", label: "Téléphone", type: "text" },
  { key: "languageIds", label: "Langues parlées", type: "text" },
];

export default function GuideDirectory({ initialGuides, languages }: { initialGuides: AdminGuideProfile[]; languages: AdminSpokenLanguage[] }) {
  const toast = useToast();
  const fi = useFormIssues(GUIDE_FIELDS);
  const [guides, setGuides] = useState(initialGuides);
  const { filtered, bar } = useTableFilters(guides, [
      { id: "active", label: "Statut", kind: "select", options: [{ value: "active", label: "Actif" }, { value: "inactive", label: "Inactif" }], get: (g) => (g.active ? "active" : "inactive") },
    ], (g) => [g.firstName, g.lastName, g.email, g.phoneNumber, ...g.languages.map((l) => l.name)]);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminGuideProfile | null>(null);
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
    fi.clear();
    const problems = [];
    if (!form.firstName.trim()) problems.push(fi.issue("firstName", "champ obligatoire — il est vide."));
    if (!form.lastName.trim()) problems.push(fi.issue("lastName", "champ obligatoire — il est vide."));
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      problems.push(fi.issue("email", `adresse invalide (saisi : ${form.email.trim()}).`));
    }
    if (problems.length > 0) {
      toast.error(fi.local(problems));
      return;
    }
    setBusy(true);
    const response = await fetch("/api/proxy/guide-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, email: form.email || null, phoneNumber: form.phoneNumber || null }),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error(await fi.fromResponse(response, "Création du guide refusée"));
      return;
    }
    const created = (await response.json()) as AdminGuideProfile;
    setGuides((current) => [created, ...current]);
    fi.clear();
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
      toast.error(await readApiError(response, "Impossible de modifier le guide"));
      return;
    }
    const updated = (await response.json()) as AdminGuideProfile;
    setGuides((current) => current.map((item) => item.guideProfileId === updated.guideProfileId ? updated : item));
    toast.success(active ? "Guide réactivé" : "Guide désactivé");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const response = await fetch(`/api/proxy/guide-profiles/${deleteTarget.guideProfileId}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      toast.error(await readApiError(response, "Suppression du guide refusée"));
      return;
    }
    setGuides((current) => current.filter((item) => item.guideProfileId !== deleteTarget.guideProfileId));
    setDeleteTarget(null);
    toast.success("Guide supprimé");
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={createGuide} noValidate className="card rounded-2xl p-5">
        <h2 className="text-sm font-bold text-navy-800">Ajouter un guide</h2>
        <p className="mt-1 text-xs text-navy-700/50">Ce profil permanent pourra être affecté à plusieurs réservations selon ses langues et sa disponibilité.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input id="firstName" label="Prénom" required cls={fi.inputClass("firstName")} errs={fi.errs("firstName")} value={form.firstName} onChange={(value) => field("firstName", value)} />
          <Input id="lastName" label="Nom" required cls={fi.inputClass("lastName")} errs={fi.errs("lastName")} value={form.lastName} onChange={(value) => field("lastName", value)} />
          <Input id="email" label="Email" type="email" cls={fi.inputClass("email")} errs={fi.errs("email")} value={form.email} onChange={(value) => field("email", value)} />
          <Input id="phoneNumber" label="Téléphone" cls={fi.inputClass("phoneNumber")} errs={fi.errs("phoneNumber")} value={form.phoneNumber} onChange={(value) => field("phoneNumber", value)} />
        </div>
        {fi.errs("languageIds")}
        <div className="mt-4">{fi.panel()}</div>
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
        <TableFilters {...bar} placeholder="Nom, e-mail, téléphone, langue…" />
        {guides.length === 0 ? <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun guide dans l’annuaire.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-navy-700/8 bg-navy-700/[0.025] text-left text-[11px] uppercase tracking-wide text-navy-700/55">
              <th className="px-6 py-3 font-semibold">Guide</th><th className="px-6 py-3 font-semibold">Contact</th><th className="px-6 py-3 font-semibold">Langues</th><th className="px-6 py-3 font-semibold">Statut</th><th className="px-6 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-gray-100">{filtered.map((guide) => (
              <tr key={guide.guideProfileId} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{guide.firstName} {guide.lastName}</td>
                <td className="px-6 py-3 text-gray-600"><div>{guide.email ?? "—"}</div><div>{guide.phoneNumber ?? "—"}</div></td>
                <td className="px-6 py-3 text-gray-600">{guide.languages.length ? guide.languages.map((language) => language.name).join(", ") : "—"}</td>
                <td className="px-6 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${guide.active ? "bg-emerald/10 text-emerald" : "bg-gray-100 text-gray-500"}`}>{guide.active ? "Actif" : "Inactif"}</span></td>
                <td className="px-6 py-3 text-right"><div className="flex justify-end gap-3"><button type="button" disabled={busy} className="text-xs font-semibold text-navy-700 hover:underline disabled:opacity-40" onClick={() => setActive(guide, !guide.active)}>{guide.active ? "Désactiver" : "Réactiver"}</button><button type="button" disabled={busy} className="text-xs font-semibold text-rose hover:underline disabled:opacity-40" onClick={() => setDeleteTarget(guide)}>Supprimer</button></div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      {deleteTarget && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-navy-700/80">
            Supprimer <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong> ? Cette action est irréversible.
            Les réservations où ce guide était affecté gardent son nom.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-secondary">Annuler</button>
            <button type="button" onClick={confirmDelete} disabled={busy} className="btn btn-danger">{busy ? "Suppression…" : "Supprimer"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Input({ label, onChange, cls, errs, ...props }: { label: string; onChange: (value: string) => void; cls?: string; errs?: React.ReactNode } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return <label className="flex flex-col gap-1"><span className={labelClass}>{label}</span><input {...props} className={cls ?? inputClass} onChange={(event) => onChange(event.target.value)} />{errs}</label>;
}
