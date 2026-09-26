import { describe, expect, it } from "vitest";
import { overriddenCount, textRows, type SiteTextCatalogue } from "./siteTexts";

const catalogue: SiteTextCatalogue = {
  locales: ["fr", "en"],
  namespaces: ["tourBookingForm", "currencySwitcher"],
  defaults: {
    fr: { "tourBookingForm.upgradeLabel": "Améliorez votre séjour", "tourBookingForm.stepCities": "Départ et retour", "currencySwitcher.label": "Devise" },
    en: {},
  },
};

describe("textRows", () => {
  it("lists every text in section order", () => {
    expect(textRows(catalogue, "", "").map((r) => r.path)).toEqual([
      "tourBookingForm.upgradeLabel", "tourBookingForm.stepCities", "currencySwitcher.label",
    ]);
  });
  it("filters by section and by what was typed, in the key or the text", () => {
    expect(textRows(catalogue, "currencySwitcher", "").map((r) => r.key)).toEqual(["label"]);
    expect(textRows(catalogue, "", "améliorez").map((r) => r.key)).toEqual(["upgradeLabel"]);
    expect(textRows(catalogue, "", "STEPCITIES").map((r) => r.key)).toEqual(["stepCities"]);
  });
});

describe("overriddenCount", () => {
  it("counts the languages changed for one text", () => {
    expect(overriddenCount({ fr: { a: "x" }, en: { a: "y", b: "z" }, de: {} }, "a")).toBe(2);
    expect(overriddenCount({}, "a")).toBe(0);
  });
});
