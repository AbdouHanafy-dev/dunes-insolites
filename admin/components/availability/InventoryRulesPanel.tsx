"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import { readApiError } from "@/lib/apiError";

type Rule = { id: string; ruleType: "DATE" | "PERIOD"; startDate: string; endDate: string; maxUnits: number; note: string | null };

export default function InventoryRulesPanel({ resourceApiPath, resourceId, baseCapacity }: {
  resourceApiPath: "extras" | "accommodation-types";
  resourceId: string;
  baseCapacity: number | null;
}) {
  const toast = useToast();
  const basePath = `${resourceApiPath}/${resourceId}/inventory-rules`;
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [type, setType] = useState<"DATE" | "PERIOD">("DATE");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [units, setUnits] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/proxy/${basePath}`).then((res) => res.ok ? res.json() : Promise.reject())
      .then((body: Rule[]) => { if (!ignore) setRules(body); })
      .catch(() => { if (!ignore) setRules([]); });
    return () => { ignore = true; };
  }, [basePath]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const maxUnits = Number(units);
    if (!start || (type === "PERIOD" && (!end || end < start)) || units === "" || !Number.isInteger(maxUnits) || maxUnits < 0) {
      toast.error("Vérifiez les dates et saisissez une capacité entière positive ou 0."); return;
    }
    setBusy(true);
    const response = await fetch(`/api/proxy/${basePath}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      ruleType: type, startDate: start, endDate: type === "DATE" ? start : end, maxUnits, note: note || null, active: true,
    }) });
    setBusy(false);
    if (!response.ok) { toast.error(await readApiError(response, "Règle refusée")); return; }
    const created = await response.json() as Rule;
    setRules((current) => [...(current ?? []), created]); setStart(""); setEnd(""); setUnits(""); setNote("");
    toast.success("Règle de disponibilité ajoutée");
  }

  async function remove(id: string) {
    const response = await fetch(`/api/proxy/${basePath}/${id}`, { method: "DELETE" });
    if (!response.ok) { toast.error(await readApiError(response, "Suppression impossible")); return; }
    setRules((current) => (current ?? []).filter((rule) => rule.id !== id));
  }

  return <section className="card rounded-2xl p-5">
    <h3 className="text-[13px] font-bold uppercase tracking-wide text-navy-700/50">Disponibilité par date ou période</h3>
    <p className="mt-1 text-[12px] text-navy-700/45">Capacité normale : {baseCapacity ?? "non configurée"}. Une date précise prime sur une période. Saisissez 0 pour fermer.</p>
    {rules === null ? <p className="mt-3 text-sm text-gray-400">Chargement…</p> : rules.length === 0 ? <p className="mt-3 text-sm text-gray-400">Aucune exception de capacité.</p> :
      <div className="mt-3 overflow-hidden rounded-xl border border-navy-700/10"><table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase text-gray-400"><th className="px-3 py-2">Type</th><th className="px-3 py-2">Dates</th><th className="px-3 py-2">Capacité</th><th className="px-3 py-2">Note</th><th /></tr></thead><tbody className="divide-y divide-gray-100">{rules.map((rule) => <tr key={rule.id}><td className="px-3 py-2">{rule.ruleType === "DATE" ? "Date" : "Période"}</td><td className="px-3 py-2">{rule.startDate}{rule.endDate !== rule.startDate ? ` → ${rule.endDate}` : ""}</td><td className="px-3 py-2 font-semibold">{rule.maxUnits === 0 ? <span className="text-rose">Fermé</span> : `${rule.maxUnits} unités`}</td><td className="px-3 py-2 text-gray-500">{rule.note || "—"}</td><td className="px-3 py-2 text-right"><button type="button" onClick={() => remove(rule.id)} className="text-rose hover:underline">Supprimer</button></td></tr>)}</tbody></table></div>}
    <form onSubmit={create} className="mt-4 grid gap-3 md:grid-cols-5">
      <label className={labelClass}>Type<select className={inputClass} value={type} onChange={(e) => setType(e.target.value as "DATE" | "PERIOD")}><option value="DATE">Date précise</option><option value="PERIOD">Période</option></select></label>
      <label className={labelClass}>{type === "DATE" ? "Date" : "Début"}<input required type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></label>
      {type === "PERIOD" && <label className={labelClass}>Fin<input required type="date" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} /></label>}
      <label className={labelClass}>Capacité (0 = fermé)<input required min={0} step={1} type="number" className={inputClass} value={units} onChange={(e) => setUnits(e.target.value)} /></label>
      <label className={labelClass}>Note<input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Promotion, maintenance…" /></label>
      <div className="flex items-end"><button disabled={busy} className="btn btn-secondary" type="submit">{busy ? "Ajout…" : "Ajouter"}</button></div>
    </form>
  </section>;
}
