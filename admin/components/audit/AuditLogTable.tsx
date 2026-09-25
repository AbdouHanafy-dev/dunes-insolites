"use client";

import { useEffect, useState } from "react";
import {
  ACTION_OPTIONS,
  actionLabel,
  actorDisplay,
  entityTypeLabel,
  isFailure,
  summarizeDevice,
  type AuditLogPage,
} from "@/lib/auditLog";

const PAGE_SIZE = 50;

const selectClass =
  "rounded-[9px] border border-navy-700/15 bg-white px-3 py-2.5 text-[14px] text-navy-800 outline-none transition focus:border-gold/60 focus:ring-3 focus:ring-gold/15";

const ACTION_BADGE: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700",
  UPDATE: "bg-amber-50 text-amber-700",
  DELETE: "bg-rose/10 text-rose",
  ACTION: "bg-navy-700/8 text-navy-700",
};

/** yyyy-mm-dd from a date input -> the ISO instant at local midnight (or the next one). */
function dayStart(value: string, addDays = 0): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + addDays);
  return d.toISOString();
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AuditLogTable() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [types, setTypes] = useState<string[]>([]);
  // What the last "Filtrer" click applied; typing in the actor box alone does not refetch.
  const [applied, setApplied] = useState({ actor: "", action: "", entityType: "", from: "", to: "" });
  // The last response, tagged with the request it answers: "loading" is simply "the current
  // request has no answer yet", so nothing has to set state synchronously inside the effect.
  const [result, setResult] = useState<{ key: string; data: AuditLogPage | null; error: string | null } | null>(null);

  const query = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (applied.actor.trim()) query.set("actor", applied.actor.trim());
  if (applied.action) query.set("action", applied.action);
  if (applied.entityType) query.set("entityType", applied.entityType);
  const fromIso = dayStart(applied.from);
  const toIso = dayStart(applied.to, 1); // "to" is a day: include all of it
  if (fromIso) query.set("from", fromIso);
  if (toIso) query.set("to", toIso);
  const queryString = query.toString();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: { key: string; data: AuditLogPage | null; error: string | null };
      try {
        const res = await fetch(`/api/proxy/admin/audit-log?${queryString}`);
        if (res.status === 403) {
          next = { key: queryString, data: null, error: "Seuls les administrateurs peuvent consulter le journal d’activité." };
        } else if (!res.ok) {
          next = { key: queryString, data: null, error: `Impossible de charger le journal (HTTP ${res.status}).` };
        } else {
          next = { key: queryString, data: (await res.json()) as AuditLogPage, error: null };
        }
      } catch {
        next = { key: queryString, data: null, error: "Le serveur est injoignable. Réessayez dans un instant." };
      }
      if (!cancelled) setResult(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const loading = result?.key !== queryString;
  const data = result?.data ?? null;
  const error = result?.key === queryString ? result.error : null;

  useEffect(() => {
    fetch("/api/proxy/admin/audit-log/entity-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: string[]) => setTypes(Array.isArray(list) ? list : []))
      .catch(() => setTypes([]));
  }, []);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setApplied({ actor, action, entityType, from, to });
  }

  function reset() {
    setActor(""); setAction(""); setEntityType(""); setFrom(""); setTo("");
    setPage(0);
    setApplied({ actor: "", action: "", entityType: "", from: "", to: "" });
  }

  const total = data?.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Journal d’activité</h1>
        <p className="mt-1 text-sm text-navy-700/55">
          Qui a créé, modifié ou supprimé quoi, et depuis quel appareil. Les contenus des formulaires ne sont pas enregistrés.
        </p>
      </div>

      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[12px] font-medium text-navy-700/70">
          Personne
          <input
            type="text"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Nom ou e-mail"
            className={`${selectClass} w-52`}
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-navy-700/70">
          Action
          <select value={action} onChange={(e) => setAction(e.target.value)} className={selectClass}>
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-navy-700/70">
          Type
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className={selectClass}>
            <option value="">Tous les types</option>
            {types.map((t) => (
              <option key={t} value={t}>{entityTypeLabel(t)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-navy-700/70">
          Du
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-navy-700/70">
          Au
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} />
        </label>
        <button type="submit" className="btn btn-primary">Filtrer</button>
        <button type="button" onClick={reset} className="btn">Réinitialiser</button>
      </form>

      {error && (
        <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[13px] text-rose" role="alert">
          {error}
        </div>
      )}

      <div className="card overflow-hidden rounded-2xl">
        {loading && !data ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Chargement…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">
            {error ? "—" : "Aucune activité enregistrée pour ces critères."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">Date et heure</th>
                  <th className="px-5 py-3 font-medium">Qui</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Sur quoi</th>
                  <th className="px-5 py-3 font-medium">Résultat</th>
                  <th className="px-5 py-3 font-medium">Adresse IP · appareil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((e) => {
                  const who = actorDisplay(e);
                  return (
                    <tr key={e.id} className={isFailure(e.statusCode) ? "bg-rose/5" : undefined} title={`${e.method} ${e.path}`}>
                      <td className="whitespace-nowrap px-5 py-3 text-gray-700">{formatWhen(e.occurredAt)}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-navy-800">{who.primary}</div>
                        {who.secondary && <div className="text-[12px] text-gray-400">{who.secondary}</div>}
                        {e.actorRoles && <div className="text-[11px] uppercase tracking-wide text-gray-400">{e.actorRoles}</div>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${ACTION_BADGE[e.action] ?? ACTION_BADGE.ACTION}`}>
                          {actionLabel(e.action, e.verb)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-navy-800">{entityTypeLabel(e.entityType)}</div>
                        {e.entityLabel ? (
                          <div className="max-w-xs truncate text-[12px] text-gray-500" title={e.entityLabel}>{e.entityLabel}</div>
                        ) : e.entityId ? (
                          <div className="text-[11px] text-gray-400">{e.entityId.slice(0, 8)}…</div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span className={isFailure(e.statusCode) ? "font-medium text-rose" : "text-gray-600"}>
                          {isFailure(e.statusCode) ? `Refusé (${e.statusCode})` : `OK (${e.statusCode})`}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        <div>{e.ip ?? "—"}</div>
                        <div className="text-[12px] text-gray-400">{summarizeDevice(e.userAgent)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-navy-700/70">
          <span>{data.total} entrée(s) · page {page + 1} sur {lastPage + 1}</span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-sm" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              ← Précédent
            </button>
            <button type="button" className="btn btn-sm" disabled={page >= lastPage || loading} onClick={() => setPage((p) => p + 1)}>
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
