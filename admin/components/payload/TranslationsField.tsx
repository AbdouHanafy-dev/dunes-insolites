"use client";

import { useState } from "react";
import { inputClass, labelClass } from "./fields";
import RepeaterField from "./RepeaterField";
import StringListField from "./StringListField";

export type TranslationProgramStep = {
  label: string;
  title: string;
  description: string;
  /** Circuits only: pickup (first step), drop-off (last), attraction (between). */
  pickupPoint?: string;
  dropoffPoint?: string;
  attraction?: string;
};

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
    programSteps: Array<{
      label: string | null;
      title: string | null;
      description: string | null;
      pickupPoint?: string | null;
      dropoffPoint?: string | null;
      attraction?: string | null;
    }> | null;
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
          pickupPoint: s.pickupPoint ?? "",
          dropoffPoint: s.dropoffPoint ?? "",
          attraction: s.attraction ?? "",
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

/** Translated steps of a circuit: the texts plus the one place-name that fits the step's position. */
function PositionalStepsEditor({
  steps,
  onChange,
}: {
  steps: TranslationProgramStep[];
  onChange: (steps: TranslationProgramStep[]) => void;
}) {
  const total = steps.length;
  const patch = (index: number, fields: Partial<TranslationProgramStep>) =>
    onChange(steps.map((s, i) => (i === index ? { ...s, ...fields } : s)));

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const places: { key: "pickupPoint" | "dropoffPoint" | "attraction"; label: string }[] =
          total === 1
            ? [
                { key: "pickupPoint", label: "Lieu de prise en charge" },
                { key: "dropoffPoint", label: "Lieu de dépose" },
              ]
            : index === 0
              ? [{ key: "pickupPoint", label: "Lieu de prise en charge" }]
              : index === total - 1
                ? [{ key: "dropoffPoint", label: "Lieu de dépose" }]
                : [{ key: "attraction", label: "Attraction" }];
        return (
          <div key={index} className="rounded-xl border border-navy-700/10 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy-700/40">Étape {index + 1}</span>
              <button
                type="button"
                onClick={() => onChange(steps.filter((_, i) => i !== index))}
                className="rounded-md border border-rose/25 px-2.5 py-1 text-xs font-medium text-rose hover:bg-rose/8"
              >
                Retirer
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Repère</label>
                <input className={inputClass} value={step.label} onChange={(e) => patch(index, { label: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Titre</label>
                <input className={inputClass} value={step.title} onChange={(e) => patch(index, { title: e.target.value })} />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} min-h-24`}
                value={step.description}
                onChange={(e) => patch(index, { description: e.target.value })}
              />
            </div>
            {places.map((p) => (
              <div key={p.key} className="mt-3 flex flex-col gap-1">
                <label className={labelClass}>{p.label}</label>
                <input
                  className={inputClass}
                  placeholder="Laissez vide pour reprendre le texte français"
                  value={step[p.key] ?? ""}
                  onChange={(e) => patch(index, { [p.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...steps, { label: "", title: "", description: "" }])}
        className="rounded-lg border border-dashed border-navy-700/20 px-4 py-3 text-sm font-medium text-navy-700/70 hover:border-gold/50 hover:text-navy-800"
      >
        + Ajouter une étape
      </button>
    </div>
  );
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
  positionalSteps = false,
}: {
  translations: Record<string, CatalogTranslationForm>;
  onChange: (translations: Record<string, CatalogTranslationForm>) => void;
  /** Circuits: also translate the pickup (first step), drop-off (last) and attraction (between). */
  positionalSteps?: boolean;
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
          {positionalSteps ? (
            <PositionalStepsEditor
              steps={active.programSteps}
              onChange={(programSteps) => patchActive({ programSteps })}
            />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
