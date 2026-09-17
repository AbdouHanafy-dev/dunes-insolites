"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/components/payload/fields";
import RepeaterField from "@/components/payload/RepeaterField";
import StringListField from "./StringListField";

export type TranslationProgramStep = { label: string; title: string; description: string };

export type TourTranslationForm = {
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

export function emptyTranslation(locale: string): TourTranslationForm {
  return { locale, name: "", description: "", aboutText: "", highlights: [], includedItems: [], notIncludedItems: [], programSteps: [] };
}

/** Not yet read by the public site (see V18 migration comment) - this
 *  drafts EN/DE/IT/DA/AR copy ready for whenever the frontend is wired to
 *  read it, same status TourType/Extra's translations already have. */
export default function TranslationsField({
  translations,
  onChange,
}: {
  translations: Record<string, TourTranslationForm>;
  onChange: (translations: Record<string, TourTranslationForm>) => void;
}) {
  const [activeLocale, setActiveLocale] = useState("EN");
  const active = translations[activeLocale] ?? emptyTranslation(activeLocale);

  function patchActive(fields: Partial<TourTranslationForm>) {
    onChange({ ...translations, [activeLocale]: { ...active, ...fields } });
  }

  const hasContent = (t: TourTranslationForm | undefined) =>
    !!t && (t.name.trim() || t.description.trim() || t.aboutText.trim() || t.highlights.length || t.includedItems.length || t.notIncludedItems.length || t.programSteps.length);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-navy-700/55">
        Contenu traduit pour ce tour. Le français reste la version de référence — une langue sans contenu ici
        affichera simplement le français en attendant.
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
          <label className={labelClass}>Nom du tour</label>
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
