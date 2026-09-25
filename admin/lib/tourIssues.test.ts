import { describe, expect, it } from "vitest";
import {
  SAVE_BLOCKING_STEPS,
  describePath,
  localIssues,
  serverIssues,
  summarizeIssues,
  type TourIssueInput,
} from "./tourIssues";

const valid: TourIssueInput = {
  name: "Djerba – Tataouine",
  photos: [1, 2, 3],
  coverPhotoUrl: "/c.jpg",
  copyrightConfirmed: true,
  programSteps: [{}],
  keywords: ["sahara"],
  passengerAdultPrice: 100,
  salePriceAdult: null,
  passengerChildPrice: 50,
  passengerInfantPrice: 0,
  partnerAdultPrice: 80,
  partnerChildPrice: 40,
  tva: 13,
  insuranceConfirmed: true,
  complianceConfirmed: true,
};

describe("localIssues", () => {
  it("returns nothing for a complete circuit", () => {
    expect(localIssues(valid)).toEqual([]);
  });

  it("names the exact field, step and value at fault", () => {
    const issues = localIssues({ ...valid, name: " ", passengerChildPrice: -5, salePriceAdult: 120 });
    const byField = Object.fromEntries(issues.map((i) => [i.field, i]));
    expect(byField.name).toMatchObject({ step: 0, label: "Nom du circuit" });
    expect(byField.passengerChildPrice.message).toContain("-5");
    expect(byField.salePriceAdult.message).toContain("120");
    expect(byField.salePriceAdult.message).toContain("100");
    expect(byField.salePriceAdult.step).toBe(8);
  });

  it("treats an emptied number input (NaN) as an error, not as silently invalid", () => {
    const issues = localIssues({ ...valid, passengerAdultPrice: Number.NaN });
    expect(issues.find((i) => i.field === "passengerAdultPrice")?.message).toContain("saisissez un nombre");
  });

  it("counts the cover photo and says how many are missing", () => {
    const issues = localIssues({ ...valid, photos: [1], coverPhotoUrl: null });
    expect(issues.find((i) => i.field === "photos")?.message).toContain("1 photo(s) sur 4");
    expect(issues.find((i) => i.field === "photos")?.message).toContain("manque 3");
  });

  it("only blocks a plain save on basics and pricing", () => {
    const issues = localIssues({ ...valid, keywords: [], insuranceConfirmed: false, name: "" });
    const blocking = issues.filter((i) => SAVE_BLOCKING_STEPS.includes(i.step));
    expect(blocking.map((i) => i.field)).toEqual(["name"]);
    expect(issues.length).toBeGreaterThan(blocking.length);
  });
});

describe("serverIssues", () => {
  it("pins each backend path to its wizard step with a readable label", () => {
    const issues = serverIssues(
      {
        "programSteps[2].title": "must not be blank",
        "translations[1].name": "too long",
        passengerAdultPrice: "must be positive",
      },
      "fallback",
    );
    expect(issues).toEqual([
      expect.objectContaining({ step: 2, label: "Itinéraire, étape 3 — titre", message: "must not be blank" }),
      expect.objectContaining({ step: 9, label: "Traduction n° 2 — nom" }),
      expect.objectContaining({ step: 8, label: "Prix adulte (passager)" }),
    ]);
  });

  it("keeps an unknown field visible instead of dropping it", () => {
    const [issue] = serverIssues({ brandNewField: "nope" }, "fallback");
    expect(issue).toMatchObject({ step: -1, label: "brandNewField", message: "nope" });
  });

  it("falls back to the server message when no field detail exists", () => {
    expect(serverIssues({}, "Conflit : slug déjà utilisé")).toEqual([
      expect.objectContaining({ step: -1, message: "Conflit : slug déjà utilisé" }),
    ]);
  });
});

describe("describePath / summarizeIssues", () => {
  it("labels indexed list items", () => {
    expect(describePath("highlights[0]").label).toBe("Points forts, élément n° 1");
  });

  it("caps the toast text and says how many were left out", () => {
    const issues = serverIssues(
      { name: "a", slug: "b", duration: "c", location: "d", description: "e", aboutText: "f" },
      "x",
    );
    const text = summarizeIssues(issues, ["Base"], 2);
    expect(text).toContain("et 4 autre(s)");
  });
});
