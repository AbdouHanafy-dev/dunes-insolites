"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import {
  LOCALE_LABELS, NAMESPACE_LABELS, overriddenCount, textRows,
  type SiteTextCatalogue, type SiteTextOverrides, type SiteTextRow,
} from "@/lib/siteTexts";

/**
 * Edits the wording of the booking forms. Each text lists its six languages; the shipped wording
 * shows as the placeholder, and an empty field means "use the shipped text". Keep {placeholders}
 * such as {price} or {count} as they are: the site fills them in.
 */
export default function SiteTextsEditor({
  catalogue,
  initialOverrides,
}: {
  catalogue: SiteTextCatalogue;
  initialOverrides: SiteTextOverrides;
}) {
  const [saved, setSaved] = useState<SiteTextOverrides>(initialOverrides);
  const [namespace, setNamespace] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => textRows(catalogue, namespace, query), [catalogue, namespace, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <label className="text-[13px] text-navy-700/70">
          Section
          <select
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="mt-1 block rounded-[9px] border border-navy-700/15 bg-white px-3 py-2 text-[13px] text-navy-800"
          >
            <option value="">Toutes</option>
            {catalogue.namespaces.map((ns) => (
              <option key={ns} value={ns}>{NAMESPACE_LABELS[ns] ?? ns}</option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-[13px] text-navy-700/70">
          Rechercher
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Un mot du texte ou de sa clé"
            className="mt-1 block w-full rounded-[9px] border border-navy-700/15 bg-white px-3 py-2 text-[13px] text-navy-800"
          />
        </label>
        <span className="pb-2 text-[12px] text-navy-700/50">{rows.length} texte{rows.length > 1 ? "s" : ""}</span>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <TextRow
            key={row.path}
            row={row}
            catalogue={catalogue}
            saved={saved}
            isOpen={open === row.path}
            onToggle={() => setOpen(open === row.path ? null : row.path)}
            onSaved={(locale, value) =>
              setSaved((cur) => {
                const next = { ...cur, [locale]: { ...(cur[locale] ?? {}) } };
                if (value) next[locale][row.path] = value;
                else delete next[locale][row.path];
                return next;
              })
            }
          />
        ))}
        {rows.length === 0 && <p className="text-sm text-navy-700/50">Aucun texte ne correspond.</p>}
      </div>
    </div>
  );
}

function TextRow({
  row, catalogue, saved, isOpen, onToggle, onSaved,
}: {
  row: SiteTextRow;
  catalogue: SiteTextCatalogue;
  saved: SiteTextOverrides;
  isOpen: boolean;
  onToggle: () => void;
  onSaved: (locale: string, value: string) => void;
}) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const changed = overriddenCount(saved, row.path);
  const valueOf = (locale: string) => drafts[locale] ?? saved[locale]?.[row.path] ?? "";
  const dirty = catalogue.locales.filter((l) => valueOf(l).trim() !== (saved[l]?.[row.path] ?? ""));

  async function save() {
    setBusy(true);
    let failed = 0;
    for (const locale of dirty) {
      const value = valueOf(locale).trim();
      const res = await fetch("/api/proxy/admin/site-texts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, key: row.path, value }),
      });
      if (res.ok) {
        onSaved(locale, value);
        setDrafts((cur) => { const next = { ...cur }; delete next[locale]; return next; });
      } else failed++;
    }
    setBusy(false);
    if (failed) toast.error(`${failed} langue(s) non enregistrée(s)`);
    else toast.success("Texte enregistré — visible sur le site d’ici quelques minutes");
  }

  return (
    <div className="card rounded-2xl">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <span>
          <span className="block text-[11px] uppercase tracking-wide text-navy-700/40">
            {NAMESPACE_LABELS[row.namespace] ?? row.namespace} · {row.key}
          </span>
          <span className="mt-0.5 block text-sm font-medium text-navy-800">{row.fallback}</span>
        </span>
        {changed > 0 && <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] text-navy-800">modifié · {changed}</span>}
      </button>
      {isOpen && (
        <div className="flex flex-col gap-3 border-t border-navy-700/10 p-4">
          {catalogue.locales.map((locale) => (
            <label key={locale} className="text-[12px] text-navy-700/60">
              {LOCALE_LABELS[locale] ?? locale}
              <textarea
                rows={2}
                maxLength={600}
                dir={locale === "ar" ? "rtl" : "ltr"}
                value={valueOf(locale)}
                placeholder={catalogue.defaults[locale]?.[row.path] ?? row.fallback}
                onChange={(e) => setDrafts((cur) => ({ ...cur, [locale]: e.target.value }))}
                className="mt-1 block w-full rounded-[9px] border border-navy-700/15 bg-white px-3 py-2 text-[13px] text-navy-800"
              />
            </label>
          ))}
          <div>
            <button type="button" className="btn btn-primary" disabled={busy || dirty.length === 0} onClick={save}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
