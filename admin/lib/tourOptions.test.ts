import { describe, expect, it } from "vitest";
import { optionKindLabel, optionPriceLabel, slugify } from "./tourOptions";

describe("optionKindLabel", () => {
  it("tells the return-city option from an upgrade", () => {
    expect(optionKindLabel("RETURN_CITY")).toBe("Autre ville de retour");
    expect(optionKindLabel("UPGRADE")).toBe("Amélioration");
    expect(optionKindLabel(null)).toBe("Amélioration");
  });
});

describe("optionPriceLabel", () => {
  it("writes the price with how it applies", () => {
    expect(optionPriceLabel(30, "PER_PERSON_NIGHT")).toBe("30 € par personne et par nuit");
    expect(optionPriceLabel(15, "PER_BOOKING")).toBe("15 € une seule fois");
    expect(optionPriceLabel(null, "PER_PERSON")).toBe("0 € par personne");
  });
});

describe("slugify", () => {
  it("makes a clean identifier from a title", () => {
    expect(slugify("Passer en suite !")).toBe("passer-en-suite");
    expect(slugify("  Petit-déjeuner au lever du soleil ")).toBe("petit-dejeuner-au-lever-du-soleil");
    expect(slugify("Tente à l’écart")).toBe("tente-a-l-ecart");
  });
  it("gives an empty string when there is nothing usable", () => {
    expect(slugify("!!!")).toBe("");
  });
});
