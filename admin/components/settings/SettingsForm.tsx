"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminCampingSettings } from "@/lib/api";

export default function SettingsForm({ initialData }: { initialData: AdminCampingSettings | null }) {
  const router = useRouter();
  const [maxCapacity, setMaxCapacity] = useState<string>(
    initialData?.maxCapacity != null ? String(initialData.maxCapacity) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/proxy/camping-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxCapacity: Number(maxCapacity) }),
    });

    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? data.error ?? "Une erreur est survenue.");
      return;
    }
    setSaved(true);
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

      <form onSubmit={onSave} className="card flex max-w-md flex-col gap-4 rounded-2xl p-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxCapacity" className={labelClass}>
            Capacité maximale (personnes / nuit)
          </label>
          <input
            id="maxCapacity"
            type="number"
            min={1}
            required
            className={inputClass}
            value={maxCapacity}
            onChange={(e) => setMaxCapacity(e.target.value)}
          />
          <p className="text-[13px] text-navy-700/50">
            Utilisée pour le calcul de disponibilité des nuitées et bivouacs.
          </p>
        </div>

        {initialData?.updatedAt && (
          <p className="text-[12px] text-navy-700/40">
            Dernière modification : {new Date(initialData.updatedAt).toLocaleString("fr-FR")}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-gradient-to-br from-gold to-gold-light px-4 py-2.5 text-sm font-bold text-navy-950 shadow-[0_4px_14px_rgba(197,155,61,0.3)] transition hover:shadow-[0_6px_20px_rgba(197,155,61,0.4)] disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>

        {saved && (
          <div className="rounded-[10px] border border-emerald/25 bg-emerald/8 px-3 py-2.5 text-[13px] text-emerald">
            Paramètres enregistrés.
          </div>
        )}
        {error && (
          <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
