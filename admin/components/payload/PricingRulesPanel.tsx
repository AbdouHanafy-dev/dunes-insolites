"use client";

import { readApiError } from "@/lib/apiError";
import { useFormIssues } from "@/components/useFormIssues";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminPricingRule } from "@/lib/api";

const RULE_FIELDS = [
  { key: "ruleType", label: "Type", type: "text" },
  { key: "startDate", label: "Date / Début", type: "date", required: true },
  { key: "endDate", label: "Fin", type: "date" },
  { key: "priceTtc", label: "Prix (TTC)", type: "number", required: true },
];

/**
 * Date/period price overrides for one resource (an accommodation tier or a
 * guide/transport option) - same shape and API convention on both sides
 * (`/{resourceApiPath}/{id}/pricing-rules`), so this one panel covers
 * either by just changing the base path.
 */
export default function PricingRulesPanel({
  resourceApiPath,
  resourceId,
}: {
  /** e.g. "extras" or "accommodation-types" */
  resourceApiPath: string;
  resourceId: string;
}) {
  const toast = useToast();
  const fi = useFormIssues(RULE_FIELDS);
  const basePath = `${resourceApiPath}/${resourceId}/pricing-rules`;

  const [rules, setRules] = useState<AdminPricingRule[] | null>(null);
  const [ruleType, setRuleType] = useState<"DATE" | "PERIOD">("DATE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priceTtc, setPriceTtc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/proxy/${basePath}`);
      if (!res.ok || cancelled) return;
      setRules((await res.json()) as AdminPricingRule[]);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [basePath]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    fi.clear();
    const problems = [];
    if (!startDate) problems.push(fi.issue("startDate", "date obligatoire — elle est vide."));
    if (ruleType === "PERIOD") {
      if (!endDate) problems.push(fi.issue("endDate", "date obligatoire — elle est vide."));
      else if (startDate && endDate < startDate) {
        problems.push(fi.issue("endDate", `doit être le même jour ou après le début (début ${startDate}, fin ${endDate}).`));
      }
    }
    const price = Number(priceTtc);
    if (priceTtc.trim() === "") problems.push(fi.issue("priceTtc", "prix obligatoire — il est vide."));
    else if (!Number.isFinite(price) || price < 0) {
      problems.push(fi.issue("priceTtc", `doit être un nombre positif ou nul (saisi : ${priceTtc}).`));
    }
    if (ruleType === "DATE" && startDate) {
      const same = (rules ?? []).find((r) => r.ruleType === "DATE" && r.startDate === startDate);
      if (same) problems.push(fi.issue("startDate", `une règle « Date » existe déjà pour le ${startDate} (${same.priceTtc} €) — supprimez-la d'abord.`));
    }
    if (problems.length > 0) {
      toast.error(fi.local(problems));
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/proxy/${basePath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ruleType,
        startDate,
        endDate: ruleType === "DATE" ? startDate : endDate,
        priceTtc: Number(priceTtc),
        active: true,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(await fi.fromResponse(res, "Création de la règle refusée"));
      return;
    }
    const created = (await res.json()) as AdminPricingRule;
    setRules((prev) => [...(prev ?? []), created]);
    setStartDate("");
    setEndDate("");
    setPriceTtc("");
    fi.clear();
    toast.success("Règle de prix créée");
  }

  async function remove(ruleId: string) {
    const res = await fetch(`/api/proxy/${basePath}/${ruleId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await readApiError(res, "Suppression impossible"));
      return;
    }
    setRules((prev) => (prev ?? []).filter((r) => r.id !== ruleId));
    toast.success("Règle supprimée");
  }

  return (
    <div className="card rounded-2xl p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">
        Tarifs par date ou période
      </h3>
      <p className="mt-1 text-[12px] text-navy-700/45">
        Une règle « Date » l&apos;emporte toujours sur une règle « Période » qui la recouvre. Sans règle,
        le prix standard s&apos;applique.
      </p>

      {rules === null ? (
        <p className="mt-3 text-sm text-navy-700/50">Chargement…</p>
      ) : rules.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">Aucune règle pour le moment.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-navy-700/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Début</th>
                <th className="px-4 py-2 font-medium">Fin</th>
                <th className="px-4 py-2 font-medium">Prix</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2">{r.ruleType === "DATE" ? "Date" : "Période"}</td>
                  <td className="px-4 py-2">{r.startDate}</td>
                  <td className="px-4 py-2">{r.endDate}</td>
                  <td className="px-4 py-2">{r.priceTtc} €</td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" className="text-rose hover:underline" onClick={() => remove(r.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={create} noValidate className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Type</label>
          <select
            className={inputClass}
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as "DATE" | "PERIOD")}
          >
            <option value="DATE">Date précise</option>
            <option value="PERIOD">Période</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>{ruleType === "DATE" ? "Date" : "Début"}</label>
          <input
            id="startDate"
            type="date"
            required
            className={fi.inputClass("startDate")}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          {fi.errs("startDate")}
        </div>
        {ruleType === "PERIOD" && (
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Fin</label>
            <input
              id="endDate"
              type="date"
              required
              className={fi.inputClass("endDate")}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {fi.errs("endDate")}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Prix (TTC)</label>
          <input
            id="priceTtc"
            type="number"
            step="0.001"
            required
            className={fi.inputClass("priceTtc")}
            value={priceTtc}
            onChange={(e) => setPriceTtc(e.target.value)}
          />
          {fi.errs("priceTtc")}
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className="btn btn-secondary">
            {busy ? "Ajout…" : "Ajouter"}
          </button>
        </div>
        <div className="col-span-full">{fi.panel()}</div>
      </form>
    </div>
  );
}
