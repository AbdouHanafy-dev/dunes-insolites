"use client";

import { inputClass, labelClass } from "@/components/payload/fields";
import { seoChecks } from "@/lib/seo";
import type { AdminPage } from "@/lib/api";

type SeoFields = Pick<
  AdminPage,
  | "seoTitle"
  | "metaDescription"
  | "focusKeyword"
  | "canonicalUrl"
  | "noIndex"
  | "noFollow"
  | "ogTitle"
  | "ogDescription"
  | "ogImageUrl"
>;

export default function SeoEditor({
  form,
  onChange,
  fallbackTitle,
  fallbackUrl,
}: {
  form: SeoFields;
  onChange: (patch: Partial<SeoFields>) => void;
  fallbackTitle: string;
  fallbackUrl: string;
}) {
  const title = form.seoTitle || fallbackTitle || "(sans titre)";
  const description = form.metaDescription || "";
  const url = form.canonicalUrl || fallbackUrl;

  const checks = seoChecks(form, fallbackTitle);

  return (
    <div className="flex flex-col gap-6">
      {/* Google preview */}
      <div>
        <p className={labelClass}>Aperçu Google</p>
        <div className="mt-2 rounded-xl border border-navy-700/10 bg-white p-4">
          <p className="truncate text-[13px] text-emerald">{url || "https://dunes-insolites.com/…"}</p>
          <p className="mt-0.5 truncate text-[18px] text-[#1a0dab]">{title}</p>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-navy-700/70">
            {description || "Aucune méta-description — Google en générera une automatiquement."}
          </p>
        </div>
      </div>

      {/* Quality checks */}
      <div>
        <p className={labelClass}>Vérifications SEO</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-sm">
              <span
                className={
                  c.level === "ok" ? "text-emerald" : c.level === "warn" ? "text-gold-dark" : "text-rose"
                }
              >
                {c.level === "ok" ? "✓" : c.level === "warn" ? "⚠" : "✗"}
              </span>
              <span className="text-navy-700/80">{c.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={labelClass}>Titre SEO</label>
          <input
            className={inputClass}
            value={form.seoTitle ?? ""}
            placeholder={fallbackTitle}
            onChange={(e) => onChange({ seoTitle: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={labelClass}>Méta-description</label>
          <textarea
            className={`${inputClass} min-h-20`}
            value={form.metaDescription ?? ""}
            onChange={(e) => onChange({ metaDescription: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Mot-clé principal</label>
          <input
            className={inputClass}
            value={form.focusKeyword ?? ""}
            onChange={(e) => onChange({ focusKeyword: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>URL canonique</label>
          <input
            className={inputClass}
            value={form.canonicalUrl ?? ""}
            placeholder={fallbackUrl}
            onChange={(e) => onChange({ canonicalUrl: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input
            type="checkbox"
            checked={!!form.noIndex}
            onChange={(e) => onChange({ noIndex: e.target.checked })}
            className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
          />
          noindex
        </label>
        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input
            type="checkbox"
            checked={!!form.noFollow}
            onChange={(e) => onChange({ noFollow: e.target.checked })}
            className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
          />
          nofollow
        </label>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={labelClass}>Open Graph — titre</label>
          <input
            className={inputClass}
            value={form.ogTitle ?? ""}
            onChange={(e) => onChange({ ogTitle: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={labelClass}>Open Graph — description</label>
          <textarea
            className={`${inputClass} min-h-16`}
            value={form.ogDescription ?? ""}
            onChange={(e) => onChange({ ogDescription: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={labelClass}>Open Graph — image (URL)</label>
          <input
            className={inputClass}
            value={form.ogImageUrl ?? ""}
            onChange={(e) => onChange({ ogImageUrl: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

