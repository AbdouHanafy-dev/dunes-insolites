"use client";

import { useState } from "react";
import { inputClass, labelClass } from "./fields";
import RepeaterField from "./RepeaterField";
import StringListField from "./StringListField";
import { useToast } from "@/components/Toast";
import { AUTO_LOCALES, fetchMachineTranslations, hasFrenchText, mergeMachineTranslation } from "./autoTranslate";

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

export type CatalogTranslationSource = Omit<CatalogTranslationForm, "locale">;

export type TranslationProgress = {
  completed: number;
  total: number;
  percent: number;
};

export type TranslationFieldKey =
  | "name"
  | "description"
  | "aboutText"
  | "highlights"
  | "includedItems"
  | "notIncludedItems"
  | "programSteps";

const ALL_FIELDS: TranslationFieldKey[] = [
  "name", "description", "aboutText", "highlights", "includedItems", "notIncludedItems", "programSteps",
];

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

function filled(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function listComplete(source: string[], translation: string[]) {
  return source.every((item, index) => !filled(item) || filled(translation[index]));
}

function mergeList(source: string[], current: string[]) {
  return Array.from({ length: Math.max(source.length, current.length) }, (_, index) =>
    filled(current[index]) ? current[index] : (source[index] ?? ""),
  );
}

function stepsComplete(source: TranslationProgramStep[], translation: TranslationProgramStep[]) {
  if (source.length === 0) return true;
  return source.every((sourceStep, index) => {
    const translatedStep = translation[index];
    if (!translatedStep) return false;
    return (["label", "title", "description", "pickupPoint", "dropoffPoint", "attraction"] as const).every(
      (key) => !filled(sourceStep[key]) || filled(translatedStep[key]),
    );
  });
}

/** Measures filled translated sections against fields that exist in the French source. */
export function translationProgress(
  source: CatalogTranslationSource,
  translation: CatalogTranslationForm | undefined,
): TranslationProgress {
  const active = translation ?? emptyTranslation("");
  const checks = [
    [filled(source.name), filled(active.name)],
    [filled(source.description), filled(active.description)],
    [filled(source.aboutText), filled(active.aboutText)],
    [source.highlights.some(filled), listComplete(source.highlights, active.highlights)],
    [source.includedItems.some(filled), listComplete(source.includedItems, active.includedItems)],
    [source.notIncludedItems.some(filled), listComplete(source.notIncludedItems, active.notIncludedItems)],
    [source.programSteps.length > 0, stepsComplete(source.programSteps, active.programSteps)],
  ].filter(([required]) => required);
  const completed = checks.filter(([, complete]) => complete).length;
  const total = checks.length;
  return { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

function mergeStep(source: TranslationProgramStep, current?: TranslationProgramStep): TranslationProgramStep {
  return {
    label: current?.label || source.label || "",
    title: current?.title || source.title || "",
    description: current?.description || source.description || "",
    pickupPoint: current?.pickupPoint || source.pickupPoint || "",
    dropoffPoint: current?.dropoffPoint || source.dropoffPoint || "",
    attraction: current?.attraction || source.attraction || "",
  };
}

/** Prefills only empty translated fields, without overwriting work already entered. */
export function prefillFromFrench(
  locale: string,
  source: CatalogTranslationSource,
  current?: CatalogTranslationForm,
): CatalogTranslationForm {
  const active = current ?? emptyTranslation(locale);
  return {
    locale,
    name: filled(active.name) ? active.name : source.name,
    description: filled(active.description) ? active.description : source.description,
    aboutText: filled(active.aboutText) ? active.aboutText : source.aboutText,
    highlights: mergeList(source.highlights, active.highlights),
    includedItems: mergeList(source.includedItems, active.includedItems),
    notIncludedItems: mergeList(source.notIncludedItems, active.notIncludedItems),
    programSteps: source.programSteps.length
      ? source.programSteps.map((step, index) => mergeStep(step, active.programSteps[index]))
      : active.programSteps,
  };
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

function FrenchSourcePreview({ source }: { source: CatalogTranslationSource }) {
  const lists = [
    ["Points forts", source.highlights],
    ["Inclus", source.includedItems],
    ["Non inclus", source.notIncludedItems],
  ] as const;

  return (
    <details className="rounded-lg border border-navy-700/10 bg-white px-3 py-2" dir="ltr">
      <summary className="cursor-pointer text-[12px] font-semibold text-navy-800">
        Voir la version française de référence
      </summary>
      <div className="mt-3 grid gap-3 text-[12px] text-navy-700/70 sm:grid-cols-2">
        {filled(source.name) && <SourceBlock label="Nom" value={source.name} />}
        {filled(source.description) && <SourceBlock label="Description courte" value={source.description} />}
        {filled(source.aboutText) && <SourceBlock label="Présentation détaillée" value={source.aboutText} />}
        {lists.map(([label, items]) =>
          items.some(filled) ? <SourceBlock key={label} label={label} value={items.filter(filled).join(" · ")} /> : null,
        )}
        {source.programSteps.length > 0 && (
          <SourceBlock
            label="Itinéraire"
            value={source.programSteps
              .map((step) => [step.label, step.title, step.description].filter(filled).join(" — "))
              .filter(filled)
              .join("\n")}
          />
        )}
      </div>
    </details>
  );
}

function SourceBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-700/40">{label}</p>
      <p className="whitespace-pre-line">{value}</p>
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
 * Tour translations are read the same way (PublicTourMapper).
 *
 * "Traduire" machine-translates the French source into blank fields only (never over
 * text already typed), nothing is saved until the form is.
 */
export default function TranslationsField({
  translations,
  onChange,
  source,
  positionalSteps = false,
  fields = ALL_FIELDS,
}: {
  translations: Record<string, CatalogTranslationForm>;
  onChange: (translations: Record<string, CatalogTranslationForm>) => void;
  /** Current French fields, used as a visible source and for safe draft prefilling. */
  source: CatalogTranslationSource;
  /** Circuits: also translate the pickup (first step), drop-off (last) and attraction (between). */
  positionalSteps?: boolean;
  /** Which fields this item type really has and the site really shows; the rest are hidden. */
  fields?: TranslationFieldKey[];
}) {
  const toast = useToast();
  const [translating, setTranslating] = useState(false);
  const show = (key: TranslationFieldKey) => fields.includes(key);
  const [activeLocale, setActiveLocale] = useState("EN");
  const active = translations[activeLocale] ?? emptyTranslation(activeLocale);

  function patchActive(fields: Partial<CatalogTranslationForm>) {
    onChange({ ...translations, [activeLocale]: { ...active, ...fields } });
  }

  const hasContent = (t: CatalogTranslationForm | undefined) =>
    !!t && (t.name.trim() || t.description.trim() || t.aboutText.trim() || t.highlights.length || t.includedItems.length || t.notIncludedItems.length || t.programSteps.length);

  const activeProgress = translationProgress(source, translations[activeLocale]);
  const completedLocales = LOCALES.filter((locale) => translationProgress(source, translations[locale.value]).percent === 100).length;

  function prefillActive() {
    onChange({
      ...translations,
      [activeLocale]: prefillFromFrench(activeLocale, source, translations[activeLocale]),
    });
  }

  async function autoTranslate(locales: string[]) {
    if (!hasFrenchText(source)) {
      toast.error("Rien à traduire : remplissez d’abord le français.");
      return;
    }
    setTranslating(true);
    try {
      const result = await fetchMachineTranslations(source, locales);
      const next = { ...translations };
      for (const t of result.translations) next[t.locale] = mergeMachineTranslation(next[t.locale], t);
      onChange(next);
      if (result.failed.length > 0) {
        toast.error(`Non traduit : ${result.failed.join(", ")}. Réessayez dans un instant.`);
      } else {
        toast.success("Traduction automatique ajoutée — à relire avant d’enregistrer");
      }
    } catch {
      toast.error("Le service de traduction ne répond pas. Vous pouvez traduire à la main ou réessayer.");
    } finally {
      setTranslating(false);
    }
  }

  function clearActive() {
    if (!window.confirm("Vider tous les champs de cette langue ?")) return;
    const next = { ...translations };
    delete next[activeLocale];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-navy-700/10 bg-navy-700/[0.025] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[13px] font-semibold text-navy-800">Suivi des traductions</p>
            <p className="mt-0.5 text-[12px] text-navy-700/55">
              Le français est la référence. Une langue vide reprend automatiquement le français sur le site.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-navy-700/65 shadow-sm">
            {completedLocales}/{LOCALES.length} langues remplies
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {LOCALES.map((l) => {
          const progress = translationProgress(source, translations[l.value]);
          return (
            <button
              key={l.value}
              type="button"
              onClick={() => setActiveLocale(l.value)}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                activeLocale === l.value
                  ? "bg-gold text-navy-900"
                  : progress.percent === 100
                    ? "bg-emerald/12 text-emerald"
                    : hasContent(translations[l.value])
                      ? "bg-amber-100 text-amber-800"
                      : "bg-navy-700/8 text-navy-700/60 hover:bg-navy-700/12"
              }`}
            >
              {l.label}
              <span className="text-[10px] opacity-70">{progress.percent}%</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4" dir={activeLocale === "AR" ? "rtl" : "ltr"}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2" dir="ltr">
          <p className="text-[12px] text-navy-700/65">
            {activeProgress.completed}/{activeProgress.total} sections remplies · à relire par une personne maîtrisant la langue
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={translating}
              onClick={() => autoTranslate([activeLocale])}
              className="rounded-md bg-gold px-3 py-1.5 text-[12px] font-semibold text-navy-900 hover:brightness-95 disabled:opacity-60"
            >
              {translating ? "Traduction…" : "Traduire cette langue"}
            </button>
            <button
              type="button"
              disabled={translating}
              onClick={() => autoTranslate([...AUTO_LOCALES])}
              className="rounded-md border border-gold/40 px-3 py-1.5 text-[12px] font-semibold text-navy-800 hover:bg-gold/10 disabled:opacity-60"
            >
              Traduire toutes les langues
            </button>
            <button
              type="button"
              onClick={prefillActive}
              className="rounded-md bg-navy-800 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-700"
            >
              Préremplir depuis le français
            </button>
            {hasContent(translations[activeLocale]) && (
              <button
                type="button"
                onClick={clearActive}
                className="rounded-md border border-rose/25 px-3 py-1.5 text-[12px] font-semibold text-rose hover:bg-rose/8"
              >
                Vider cette langue
              </button>
            )}
          </div>
        </div>
        <p className="-mt-2 text-[11px] text-navy-700/45" dir="ltr">
          Le préremplissage copie uniquement les champs français manquants et ne remplace jamais une traduction déjà saisie.
        </p>
        <FrenchSourcePreview source={source} />
        {show("name") && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nom</label>
            <input className={inputClass} value={active.name} onChange={(e) => patchActive({ name: e.target.value })} />
          </div>
        )}
        {show("description") && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Description courte</label>
            <textarea
              className={`${inputClass} min-h-24`}
              value={active.description}
              onChange={(e) => patchActive({ description: e.target.value })}
            />
          </div>
        )}
        {show("aboutText") && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Présentation détaillée</label>
            <textarea
              className={`${inputClass} min-h-32`}
              value={active.aboutText}
              onChange={(e) => patchActive({ aboutText: e.target.value })}
            />
          </div>
        )}
        {show("highlights") && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Points forts</label>
            <StringListField items={active.highlights} onChange={(highlights) => patchActive({ highlights })} />
          </div>
        )}
        {show("includedItems") && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Inclus</label>
            <StringListField items={active.includedItems} onChange={(includedItems) => patchActive({ includedItems })} />
          </div>
        )}
        {show("notIncludedItems") && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Non inclus</label>
            <StringListField
              items={active.notIncludedItems}
              onChange={(notIncludedItems) => patchActive({ notIncludedItems })}
            />
          </div>
        )}
        {show("programSteps") && (
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
        )}
      </div>
    </div>
  );
}
