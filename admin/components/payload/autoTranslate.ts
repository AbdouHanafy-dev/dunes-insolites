import type { CatalogTranslationForm, CatalogTranslationSource, TranslationProgramStep } from "./TranslationsField";

// Machine translation of the French copy. Kept apart from TranslationsField so the
// pure merge rules are testable and the component stays presentational.

export const AUTO_LOCALES = ["EN", "AR", "DE", "IT", "DA"] as const;

const filled = (value: string | null | undefined) => Boolean(value?.trim());

export function hasFrenchText(source: CatalogTranslationSource): boolean {
  return (
    filled(source.name) ||
    filled(source.description) ||
    filled(source.aboutText) ||
    filled(source.goodToKnow) ||
    filled(source.petPolicyNote) ||
    filled(source.ticketInfo) ||
    [
      ...source.highlights, ...source.includedItems, ...source.notIncludedItems,
      ...source.notSuitableFor, ...source.notAllowed, ...source.mustBring,
    ].some(filled) ||
    source.programSteps.some((s) => [s.label, s.title, s.description, s.pickupPoint, s.dropoffPoint, s.attraction].some(filled))
  );
}

export function localeHasContent(t: CatalogTranslationForm | undefined): boolean {
  return (
    !!t &&
    (filled(t.name) ||
      filled(t.description) ||
      filled(t.aboutText) ||
      filled(t.goodToKnow) ||
      filled(t.petPolicyNote) ||
      filled(t.ticketInfo) ||
      t.highlights.length > 0 ||
      t.includedItems.length > 0 ||
      t.notIncludedItems.length > 0 ||
      t.notSuitableFor.length > 0 ||
      t.notAllowed.length > 0 ||
      t.mustBring.length > 0 ||
      t.programSteps.length > 0)
  );
}

function mergeStrings(current: string[], machine: string[]): string[] {
  return Array.from({ length: Math.max(current.length, machine.length) }, (_, i) =>
    filled(current[i]) ? current[i] : (machine[i] ?? ""),
  );
}

function mergeStep(current: TranslationProgramStep | undefined, machine: TranslationProgramStep | undefined): TranslationProgramStep {
  const pick = (key: keyof TranslationProgramStep) => (filled(current?.[key]) ? current?.[key] : machine?.[key]) ?? "";
  return {
    label: pick("label"),
    title: pick("title"),
    description: pick("description"),
    pickupPoint: pick("pickupPoint"),
    dropoffPoint: pick("dropoffPoint"),
    attraction: pick("attraction"),
  };
}

/**
 * Fills what is blank and leaves everything already typed alone: a hand-written
 * translation is never replaced by a machine one.
 */
export function mergeMachineTranslation(
  current: CatalogTranslationForm | undefined,
  machine: CatalogTranslationForm,
): CatalogTranslationForm {
  const base = current ?? {
    ...machine, name: "", description: "", aboutText: "", highlights: [], includedItems: [], notIncludedItems: [], programSteps: [],
    goodToKnow: "", petPolicyNote: "", ticketInfo: "", notSuitableFor: [], notAllowed: [], mustBring: [],
  };
  const stepCount = Math.max(base.programSteps.length, machine.programSteps.length);
  return {
    locale: machine.locale,
    name: filled(base.name) ? base.name : machine.name,
    description: filled(base.description) ? base.description : machine.description,
    aboutText: filled(base.aboutText) ? base.aboutText : machine.aboutText,
    highlights: mergeStrings(base.highlights, machine.highlights),
    includedItems: mergeStrings(base.includedItems, machine.includedItems),
    notIncludedItems: mergeStrings(base.notIncludedItems, machine.notIncludedItems),
    goodToKnow: filled(base.goodToKnow) ? base.goodToKnow : machine.goodToKnow,
    petPolicyNote: filled(base.petPolicyNote) ? base.petPolicyNote : machine.petPolicyNote,
    ticketInfo: filled(base.ticketInfo) ? base.ticketInfo : machine.ticketInfo,
    notSuitableFor: mergeStrings(base.notSuitableFor, machine.notSuitableFor),
    notAllowed: mergeStrings(base.notAllowed, machine.notAllowed),
    mustBring: mergeStrings(base.mustBring, machine.mustBring),
    programSteps: Array.from({ length: stepCount }, (_, i) => mergeStep(base.programSteps[i], machine.programSteps[i])),
  };
}

type WireTranslation = {
  locale: string;
  name: string | null;
  description: string | null;
  aboutText: string | null;
  highlights: string[] | null;
  includedItems: string[] | null;
  notIncludedItems: string[] | null;
  goodToKnow?: string | null;
  petPolicyNote?: string | null;
  ticketInfo?: string | null;
  notSuitableFor?: string[] | null;
  notAllowed?: string[] | null;
  mustBring?: string[] | null;
  programSteps: Array<Partial<Record<keyof TranslationProgramStep, string | null>>> | null;
};

function fromWire(t: WireTranslation): CatalogTranslationForm {
  return {
    locale: t.locale,
    name: t.name ?? "",
    description: t.description ?? "",
    aboutText: t.aboutText ?? "",
    highlights: t.highlights ?? [],
    includedItems: t.includedItems ?? [],
    notIncludedItems: t.notIncludedItems ?? [],
    goodToKnow: t.goodToKnow ?? "",
    petPolicyNote: t.petPolicyNote ?? "",
    ticketInfo: t.ticketInfo ?? "",
    notSuitableFor: t.notSuitableFor ?? [],
    notAllowed: t.notAllowed ?? [],
    mustBring: t.mustBring ?? [],
    programSteps: (t.programSteps ?? []).map((s) => ({
      label: s.label ?? "",
      title: s.title ?? "",
      description: s.description ?? "",
      pickupPoint: s.pickupPoint ?? "",
      dropoffPoint: s.dropoffPoint ?? "",
      attraction: s.attraction ?? "",
    })),
  };
}

export type MachineResult = { translations: CatalogTranslationForm[]; failed: string[] };

/** Asks the backend to translate the French source. Throws when the call itself fails. */
export async function fetchMachineTranslations(source: CatalogTranslationSource, locales: string[]): Promise<MachineResult> {
  const res = await fetch("/api/proxy/admin/translations/auto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...source, locales }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { translations: WireTranslation[]; failedLocales: string[] };
  return { translations: data.translations.map(fromWire), failed: data.failedLocales };
}

export type FillResult = {
  translations: Record<string, CatalogTranslationForm>;
  /** Languages that were completely empty and have now been machine-filled — to be reviewed. */
  filled: string[];
  failed: string[];
};

/**
 * Save-time safety net: every language with no content at all is machine-filled, so the
 * site never shows French by accident. A language that already has something is never touched.
 * Never throws — a save must not depend on an unofficial service being up.
 */
export async function fillEmptyLocales(
  source: CatalogTranslationSource,
  translations: Record<string, CatalogTranslationForm>,
): Promise<FillResult> {
  const empty = AUTO_LOCALES.filter((l) => !localeHasContent(translations[l]));
  if (empty.length === 0 || !hasFrenchText(source)) return { translations, filled: [], failed: [] };
  try {
    const result = await fetchMachineTranslations(source, empty);
    const next = { ...translations };
    for (const t of result.translations) next[t.locale] = mergeMachineTranslation(next[t.locale], t);
    return { translations: next, filled: result.translations.map((t) => t.locale), failed: result.failed };
  } catch {
    return { translations, filled: [], failed: [...empty] };
  }
}

export type SaveNotice = { error: boolean; text: string };

/** What the operator should be told after a save-time fill. Empty when nothing happened. */
export function fillNotices(result: FillResult): SaveNotice[] {
  const notices: SaveNotice[] = [];
  if (result.filled.length > 0) {
    notices.push({ error: false, text: `Langues remplies automatiquement : ${result.filled.join(", ")} — pensez à les relire.` });
  }
  if (result.failed.length > 0) {
    notices.push({
      error: true,
      text: `Traduction automatique indisponible (${result.failed.join(", ")}) : ces langues s’affichent en français pour l’instant.`,
    });
  }
  return notices;
}

export type SavePreparation = { form: Record<string, unknown>; notices: SaveNotice[] };

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/**
 * The French copy of a nuitée / activity / service form. Their French about-text and
 * included lists are not typed in these forms but ride along in the record, and the
 * site shows their translations, so they are part of the source.
 */
export function catalogSourceFromForm(form: Record<string, unknown>): CatalogTranslationSource {
  return {
    name: str(form.name),
    description: str(form.description),
    aboutText: str(form.aboutText),
    highlights: strs(form.highlights),
    includedItems: strs(form.includedItems),
    notIncludedItems: strs(form.notIncludedItems),
    programSteps: [],
    goodToKnow: "",
    petPolicyNote: "",
    ticketInfo: "",
    notSuitableFor: [],
    notAllowed: [],
    mustBring: [],
  };
}

/** `CollectionEditor.prepareSave` for the editors that embed TranslationsField with a plain form. */
export async function prepareCatalogSave(form: Record<string, unknown>): Promise<SavePreparation> {
  const translations = (form.translations ?? {}) as Record<string, CatalogTranslationForm>;
  const result = await fillEmptyLocales(catalogSourceFromForm(form), translations);
  return {
    form: result.filled.length > 0 ? { ...form, translations: result.translations } : form,
    notices: fillNotices(result),
  };
}
