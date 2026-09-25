"use client";

import { useFormIssues } from "@/components/useFormIssues";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { labelClass } from "@/components/payload/fields";
import type { AdminCampingSettings } from "@/lib/api";

const SETTINGS_FIELDS = [{ key: "maxCapacity", label: "Capacité maximale (personnes / nuit)", type: "number", required: true }];

export default function SettingsForm({ initialData }: { initialData: AdminCampingSettings | null }) {
  const router = useRouter();
  const toast = useToast();
  const fi = useFormIssues(SETTINGS_FIELDS);
  const [maxCapacity, setMaxCapacity] = useState<string>(
    initialData?.maxCapacity != null ? String(initialData.maxCapacity) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    fi.clear();
    const capacity = Number(maxCapacity);
    if (maxCapacity.trim() === "") {
      toast.error(fi.local([fi.issue("maxCapacity", "champ obligatoire — il est vide.")]));
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      toast.error(fi.local([fi.issue("maxCapacity", `doit être un entier ≥ 1 (saisi : ${maxCapacity}).`)]));
      return;
    }
    setBusy(true);

    const res = await fetch("/api/proxy/camping-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxCapacity: Number(maxCapacity) }),
    });

    setBusy(false);
    if (!res.ok) {
      const message = await fi.fromResponse(res, "Enregistrement des paramètres refusé");
      setError(message);
      toast.error(message);
      return;
    }
    setSaved(true);
    toast.success("Paramètres enregistrés");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Paramètres</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Réglages opérationnels du campement de Sabria.
        </p>
      </div>

      <form onSubmit={onSave} noValidate className="card flex max-w-md flex-col gap-4 rounded-2xl p-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxCapacity" className={labelClass}>
            Capacité maximale (personnes / nuit)
          </label>
          <input
            id="maxCapacity"
            type="number"
            min={1}
            required
            className={fi.inputClass("maxCapacity")}
            value={maxCapacity}
            onChange={(e) => setMaxCapacity(e.target.value)}
          />
          {fi.errs("maxCapacity")}
          <p className="text-[13px] text-navy-700/50">
            Utilisée pour le calcul de disponibilité des nuitées et bivouacs.
          </p>
        </div>

        {initialData?.updatedAt && (
          <p className="text-[12px] text-navy-700/40">
            Dernière modification : {new Date(initialData.updatedAt).toLocaleString("fr-FR")}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary btn-block">
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>

        {saved && (
          <div className="rounded-[10px] border border-emerald/25 bg-emerald/8 px-3 py-2.5 text-[13px] text-emerald">
            Paramètres enregistrés.
          </div>
        )}
        {fi.issues.length > 0 ? fi.panel() : error && (
          <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
