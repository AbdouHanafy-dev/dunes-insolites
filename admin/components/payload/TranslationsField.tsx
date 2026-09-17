"use client";

import { useState } from "react";
import { inputClass, labelClass } from "./fields";
import RepeaterField from "./RepeaterField";
import StringListField from "./StringListField";

export type TranslationProgramStep = { label: string; title: string; description: string };

export type CatalogTranslationForm = {
  locale: string;
  name: string;
  description: string;
  aboutText: string;
  highlights: string[];
  includedItems: string[];
  notIncludedItems: string[];
  programSteps: TranslationProgramStep[];
};

const LOCALES = [
  { value: "EN", label: "Anglais" },
  { value: "AR", label: "Arabe" },
  { value: "DE", label: "Allemand" },
  { value: "IT", label: "Italien" },
  { value: "DA", label: "Danois" },
];

export function emptyTranslation(locale: string): CatalogTranslationForm {
  return { locale, name: "", description: "", aboutText: "", highlights: [], includedItems: [], notIncludedItems: [], programSteps: [] };
}

// Shared conversions between the wire shape (CatalogTranslationDto[] - see
// AdminCatalogTranslation in lib/api.ts) and this field's Record<locale, form>
// - used by every editor that embeds this field (Tour/TourType/Extra).
export function translationsToRecord(
  list: Array<{
    locale: string;
    name: string | null;
    description: string | null;
    aboutText: string | null;
    highlights: string[] | null;
    includedItems: string[] | null;
    notIncludedItems: string[] | null;
    programSteps: Array<{ label: string | null; title: string | null; description: string | null }> | null;
  }> | null | undefined,
): Record<string, CatalogTranslationForm> {
  return Object.fromEntries(
    (list ?? []).map((t) => [
      t.locale,
      {
        locale: t.locale,
        name: t.name ?? "",
        description: t.description ?? "",
        aboutText: t.aboutText ?? "",
        highlights: t.highlights ?? [],
        includedItems: t.includedItems ?? [],
        notIncludedItems: t.notIncludedItems ?? [],
        programSteps: (t.programSteps ?? []).map((s) => ({
          label: s.label ?? "",
          title: s.title ?? "",
          description: s.description ?? "",
        })),
      } satisfies CatalogTranslationForm,
    ]),
  );
}

export function translationsToArray(record: Record<string, CatalogTranslationForm>) {
  return Object.values(record)
    .filter(
      (t) =>
        t.name.trim() ||
        t.description.trim() ||
        t.aboutText.trim() ||
        t.highlights.length ||
        t.includedItems.length ||
        t.notIncludedItems.length ||
        t.programSteps.length,
    )
    .map((t) => ({
      locale: t.locale,
      name: t.name || null,
      description: t.description || null,
      aboutText: t.aboutText || null,
      highlights: t.highlights,
      includedItems: t.includedItems,
      notIncludedItems: t.notIncludedItems,
      programSteps: t.programSteps,
    }));
}

/**
 * Per-locale marketing copy for a Tour/TourType/Extra - shared shape with
 * the backend's CatalogTranslationDto (see PublicCatalogTranslation), so
 * this one component covers all three admin editors. The public site
 * already reads TourType/Extra translations live with a French fallback
 * per field (PublicActivityController/PublicStayController's `locale`
 * param) - filling these in has an immediate effect on /en, /ar, etc.
 * Tour's own translations aren't consumed by any public endpoint yet.
 */
export default function TranslationsField({
  translations,
  onChange,
}: {
  translations: Record<string, CatalogTranslationForm>;
  onChange: (translations: Record<string, CatalogTranslationForm>) => void;
}) {
  const [activeLocale, setActiveLocale] = useState("EN");
  const active = translations[activeLocale] ?? emptyTranslation(activeLocale);

  function patchActive(fields: Partial<CatalogTranslationForm>) {
    onChange({ ...translations, [activeLocale]: { ...active, ...fields } });
  }

  const hasContent = (t: CatalogTranslationForm | undefined) =>
    !!t && (t.name.trim() || t.description.trim() || t.aboutText.trim() || t.highlights.length || t.includedItems.length || t.notIncludedItems.length || t.programSteps.length);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-navy-700/55">
        Contenu traduit. Le français reste la version de référence — une langue sans contenu ici affichera
        simplement le français en attendant.
      </p>
      <div className="flex flex-wrap gap-2">
        {LOCALES.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setActiveLocale(l.value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
              activeLocale === l.value
                ? "bg-gold text-navy-900"
                : hasContent(translations[l.value])
                  ? "bg-emerald/12 text-emerald"
                  : "bg-navy-700/8 text-navy-700/60 hover:bg-navy-700/12"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Nom</label>
          <input className={inputClass} value={active.name} onChange={(e) => patchActive({ name: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Description courte</label>
          <textarea
            className={`${inputClass} min-h-24`}
            value={active.description}
            onChange={(e) => patchActive({ description: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Présentation détaillée</label>
          <textarea
            className={`${inputClass} min-h-32`}
            value={active.aboutText}
            onChange={(e) => patchActive({ aboutText: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Points forts</label>
          <StringListField items={active.highlights} onChange={(highlights) => patchActive({ highlights })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Inclus</label>
          <StringListField items={active.includedItems} onChange={(includedItems) => patchActive({ includedItems })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Non inclus</label>
          <StringListField
            items={active.notIncludedItems}
            onChange={(notIncludedItems) => patchActive({ notIncludedItems })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Itinéraire</label>
          <RepeaterField
            itemLabel="Étape"
            items={active.programSteps as unknown as Record<string, unknown>[]}
            onChange={(items) => patchActive({ programSteps: items as unknown as TranslationProgramStep[] })}
            fields={[
              { type: "text", key: "label", label: "Repère" },
              { type: "text", key: "title", label: "Titre" },
              { type: "textarea", key: "description", label: "Description" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
