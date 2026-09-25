"use client";

import { readApiError } from "@/lib/apiError";
import { useFormIssues } from "@/components/useFormIssues";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { labelClass } from "@/components/payload/fields";
import type { AdminSpokenLanguage } from "@/lib/api";

/**
 * The catalog behind Guide.languages and Reservation.preferredLanguages —
 * replaces the old hardcoded FR/EN/AR enum, since a real guide might speak
 * German, Italian, Spanish, etc. No delete on purpose: a language already
 * referenced by a guide or a past reservation would either orphan that
 * reference or need a cascade nobody asked for — "deactivate" (hide it from
 * new selections, keep it on what already used it) is the safe operation.
 */
const LANGUAGE_FIELDS = [{ key: "name", label: "Nouvelle langue", type: "text", required: true }];

export default function LanguagesManager({ initialLanguages }: { initialLanguages: AdminSpokenLanguage[] }) {
  const toast = useToast();
  const fi = useFormIssues(LANGUAGE_FIELDS);
  const [languages, setLanguages] = useState(initialLanguages);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function addLanguage(e: React.FormEvent) {
    e.preventDefault();
    fi.clear();
    const wanted = name.trim();
    if (!wanted) {
      toast.error(fi.local([fi.issue("name", "champ obligatoire — saisissez le nom de la langue.")]));
      return;
    }
    const existing = languages.find((l) => l.name.toLowerCase() === wanted.toLowerCase());
    if (existing) {
      toast.error(fi.local([fi.issue("name", `cette langue existe déjà (${existing.name}${existing.active ? "" : ", actuellement désactivée — réactivez-la"}).`)]));
      return;
    }
    setBusy(true);
    const res = await fetch("/api/proxy/languages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(await fi.fromResponse(res, "Ajout de la langue refusé"));
      return;
    }
    const created = await res.json();
    setLanguages((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    fi.clear();
    toast.success("Langue ajoutée");
  }

  async function toggleActive(language: AdminSpokenLanguage) {
    setBusy(true);
    const res = await fetch(`/api/proxy/languages/${language.languageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !language.active }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(await readApiError(res, "Modification impossible"));
      return;
    }
    const updated = await res.json();
    setLanguages((prev) => prev.map((l) => (l.languageId === updated.languageId ? updated : l)));
  }

  return (
    <div className="card rounded-2xl p-5">
      {languages.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune langue configurée.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-navy-700/10">
          {languages.map((l) => (
            <li key={l.languageId} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className={`font-medium ${l.active ? "text-gray-900" : "text-gray-400 line-through"}`}>
                {l.name}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => toggleActive(l)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition disabled:opacity-40 ${
                  l.active
                    ? "bg-emerald/10 text-emerald hover:bg-emerald/20"
                    : "bg-navy-700/8 text-navy-700/50 hover:bg-navy-700/15"
                }`}
              >
                {l.active ? "Active" : "Désactivée"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addLanguage} noValidate className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className={labelClass}>Nouvelle langue</label>
          <input
            id="name"
            placeholder="ex. Espagnol"
            className={fi.inputClass("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {fi.errs("name")}
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-40">
          Ajouter
        </button>
        <div className="basis-full">{fi.panel()}</div>
      </form>
    </div>
  );
}
