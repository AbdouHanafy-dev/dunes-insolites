import { afterEach, describe, expect, it, vi } from "vitest";
import {
  catalogSourceFromForm,
  fillEmptyLocales,
  fillNotices,
  frenchFingerprint,
  isStale,
  mergeMachineTranslation,
} from "../components/payload/autoTranslate";
import { emptyTranslation, type CatalogTranslationForm } from "../components/payload/TranslationsField";

const source = {
  goodToKnow: "",
  petPolicyNote: "",
  ticketInfo: "",
  notSuitableFor: [],
  notAllowed: [],
  mustBring: [],
  name: "Nuit au camp",
  description: "Une nuit.",
  aboutText: "",
  highlights: [],
  includedItems: ["Dîner", "Petit-déjeuner"],
  notIncludedItems: [],
  programSteps: [],
};

const machine = (locale: string): CatalogTranslationForm => ({
  ...emptyTranslation(locale),
  name: `${locale} name`,
  description: `${locale} description`,
  includedItems: [`${locale} dinner`, `${locale} breakfast`],
});

function stubBackend(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 503, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("mergeMachineTranslation", () => {
  it("never replaces text that was already typed", () => {
    const typed = { ...emptyTranslation("DE"), name: "Handgeschrieben", includedItems: ["Abendessen", ""] };
    const merged = mergeMachineTranslation(typed, machine("DE"));
    expect(merged.name).toBe("Handgeschrieben");
    expect(merged.description).toBe("DE description");
    expect(merged.includedItems).toEqual(["Abendessen", "DE breakfast"]);
  });
});

describe("fillEmptyLocales", () => {
  it("fills only the languages that are completely empty", async () => {
    const fetchMock = stubBackend({
      translations: [{ ...machine("AR"), aboutText: null, highlights: null, notIncludedItems: null, programSteps: null }],
      failedLocales: [],
    });
    const typed = { ...emptyTranslation("EN"), name: "Camp night" };
    const result = await fillEmptyLocales(source, {
      EN: typed,
      DE: { ...emptyTranslation("DE"), description: "Eine Nacht." },
      IT: { ...emptyTranslation("IT"), name: "Notte" },
      DA: { ...emptyTranslation("DA"), name: "Nat" },
    });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent.locales).toEqual(["AR"]);
    expect(result.filled).toEqual(["AR"]);
    expect(result.translations.EN).toBe(typed);
    expect(result.translations.AR.name).toBe("AR name");
  });

  it("does not call the service when there is no French text or nothing is empty", async () => {
    const fetchMock = stubBackend({ translations: [], failedLocales: [] });
    const blank = { ...source, name: "", description: "", includedItems: [] };
    await fillEmptyLocales(blank, {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("survives the service being down and reports every language as not done", async () => {
    stubBackend({}, false);
    const result = await fillEmptyLocales(source, {});
    expect(result.filled).toEqual([]);
    expect(result.failed).toEqual(["EN", "AR", "DE", "IT", "DA"]);
    expect(result.translations).toEqual({});
  });

  it("reports a partial failure without losing the languages that worked", async () => {
    stubBackend({ translations: [machine("EN")], failedLocales: ["AR"] });
    const result = await fillEmptyLocales(source, {});
    expect(result.filled).toEqual(["EN"]);
    expect(result.failed).toEqual(["AR"]);
    expect(fillNotices(result).map((n) => n.error)).toEqual([false, true]);
  });
});

describe("catalogSourceFromForm", () => {
  it("reads the French copy that rides along in a nuitée form", () => {
    expect(catalogSourceFromForm({ name: "A", aboutText: "B", includedItems: ["x", 3] }).includedItems).toEqual(["x"]);
  });
});

describe("review status and stale detection", () => {
  it("flags machine-filled languages for review and remembers the French they came from", async () => {
    stubBackend({ translations: [machine("DE")], failedLocales: [] });
    const result = await fillEmptyLocales(source, {});
    expect(result.translations.DE.reviewStatus).toBe("AUTO");
    expect(result.translations.DE.sourceHash).toBe(frenchFingerprint(source));
  });

  it("does not flag a language that already had content as untouched: it now holds machine text", () => {
    const typed = { ...emptyTranslation("DE"), name: "Handgeschrieben" };
    expect(mergeMachineTranslation(typed, machine("DE"), "h1").reviewStatus).toBe("AUTO");
  });

  it("changes the fingerprint when, and only when, the French changes", () => {
    expect(frenchFingerprint(source)).toBe(frenchFingerprint({ ...source }));
    expect(frenchFingerprint(source)).not.toBe(frenchFingerprint({ ...source, name: "Nuit au camp Sabria" }));
  });

  it("calls a translation stale only when it carries a fingerprint that no longer matches", () => {
    const fp = frenchFingerprint(source);
    const made = { ...emptyTranslation("DE"), name: "x", sourceHash: fp };
    expect(isStale(made, fp)).toBe(false);
    expect(isStale(made, frenchFingerprint({ ...source, name: "changed" }))).toBe(true);
    // Written by hand or saved before tracking: no fingerprint, never stale.
    expect(isStale({ ...emptyTranslation("DE"), name: "x" }, fp)).toBe(false);
    expect(isStale(undefined, fp)).toBe(false);
  });
});
