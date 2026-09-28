import { describe, expect, it } from "vitest";
import { hasInformationalAccommodation } from "./stayAccommodation";

describe("hasInformationalAccommodation", () => {
  it("treats the bivouac tent as informational when it exists", () => {
    expect(hasInformationalAccommodation({
      slug: "bivouac-desert-tunisie",
      accommodations: [{ slug: "simple-camping-tent" }],
    })).toBe(true);
  });

  it("keeps the camp tiers selectable", () => {
    expect(hasInformationalAccommodation({
      slug: "nuitee-campement-desert",
      accommodations: [{ slug: "desert-tent" }],
    })).toBe(false);
  });

  it("does not invent a fixed tent before one is configured", () => {
    expect(hasInformationalAccommodation({
      slug: "bivouac-desert-tunisie",
      accommodations: [],
    })).toBe(false);
  });
});
