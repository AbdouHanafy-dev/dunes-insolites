import { describe, expect, it } from "vitest";
import {
  emptyTranslation,
  prefillFromFrench,
  translationProgress,
  type CatalogTranslationSource,
} from "../components/payload/TranslationsField";

const source: CatalogTranslationSource = {
  name: "Circuit dans le Sahara",
  description: "Deux jours dans le désert.",
  aboutText: "Présentation complète.",
  highlights: ["Coucher de soleil", "Camp"],
  includedItems: ["Dîner"],
  notIncludedItems: ["Pourboires"],
  programSteps: [
    {
      label: "Jour 1",
      title: "Départ",
      description: "Départ de Tunis",
      pickupPoint: "Tunis",
    },
  ],
};

describe("catalog translation helpers", () => {
  it("prefills missing fields from French without overwriting existing translations", () => {
    const current = {
      ...emptyTranslation("EN"),
      name: "Sahara tour",
      highlights: ["Sunset", ""],
      programSteps: [{ label: "Day 1", title: "", description: "Departure from Tunis" }],
    };

    const result = prefillFromFrench("EN", source, current);

    expect(result.name).toBe("Sahara tour");
    expect(result.description).toBe(source.description);
    expect(result.highlights).toEqual(["Sunset", "Camp"]);
    expect(result.programSteps[0]).toMatchObject({
      label: "Day 1",
      title: "Départ",
      description: "Departure from Tunis",
      pickupPoint: "Tunis",
    });
  });

  it("reports completion only for sections present in the French source", () => {
    const partial = prefillFromFrench("EN", source, {
      ...emptyTranslation("EN"),
      name: "Sahara tour",
    });
    partial.description = "";

    expect(translationProgress(source, partial)).toEqual({ completed: 6, total: 7, percent: 86 });
  });

  it("does not mark an empty French source as translated", () => {
    const emptySource: CatalogTranslationSource = {
      name: "",
      description: "",
      aboutText: "",
      highlights: [],
      includedItems: [],
      notIncludedItems: [],
      programSteps: [],
    };

    expect(translationProgress(emptySource, undefined)).toEqual({ completed: 0, total: 0, percent: 0 });
  });
});
