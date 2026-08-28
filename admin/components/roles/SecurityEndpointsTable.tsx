"use client";

import { useMemo, useState } from "react";
import type { SecurityEndpoint } from "@/lib/api";

const ROLE_FILTERS = ["Tous", "ADMIN", "CAMPING", "PARTENAIRE", "CLIENT", "Sans règle"] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

function matchesFilter(endpoint: SecurityEndpoint, filter: RoleFilter): boolean {
  if (filter === "Tous") return true;
  if (filter === "Sans règle") return endpoint.rule === null;
  return endpoint.rule !== null && endpoint.rule.includes(filter);
}

export default function SecurityEndpointsTable({ endpoints }: { endpoints: SecurityEndpoint[] }) {
  const [filter, setFilter] = useState<RoleFilter>("Tous");

  const rows = useMemo(
    () => endpoints.filter((e) => matchesFilter(e, filter)),
    [endpoints, filter],
  );

  const withoutRule = endpoints.filter((e) => e.rule === null).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
              filter === f
                ? "border-gold bg-gold/12 text-navy-800"
                : "border-navy-700/15 text-navy-700/65 hover:bg-navy-700/5"
            }`}
          >
            {f}
            {f === "Sans règle" && withoutRule > 0 && (
              <span className="ml-1.5 rounded-full bg-rose/15 px-1.5 py-0.5 text-[10px] font-bold text-rose">
                {withoutRule}
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-navy-700/45">
          {rows.length} / {endpoints.length} endpoint(s)
        </span>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun endpoint pour ce filtre.</p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-alt">
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">Contrôleur</th>
                  <th className="px-6 py-3 font-medium">Méthode</th>
                  <th className="px-6 py-3 font-medium">Chemin</th>
                  <th className="px-6 py-3 font-medium">Règle (@PreAuthorize)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((e, i) => (
                  <tr key={`${e.controller}-${e.httpMethod}-${e.path}-${i}`} className="hover:bg-gray-50">
                    <td className="px-6 py-2.5 font-medium text-navy-800">{e.controller}</td>
                    <td className="px-6 py-2.5 text-gray-700">{e.httpMethod}</td>
                    <td className="px-6 py-2.5 font-mono text-[12px] text-gray-700">{e.path}</td>
                    <td className="px-6 py-2.5">
                      {e.rule ? (
                        <span className="font-mono text-[12px] text-gray-700">{e.rule}</span>
                      ) : (
                        <span
                          className="text-rose"
                          title="Pas de @PreAuthorize sur cette méthode — protégée uniquement si SecurityConfig couvre son chemin par une règle d'URL, sinon elle retombe sur anyRequest().authenticated() (tout utilisateur connecté)."
                        >
                          aucune — vérifier SecurityConfig
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
