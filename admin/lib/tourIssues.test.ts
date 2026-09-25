import { describe, expect, it } from "vitest";
import {
  isSaveBlocking,
  knownTourMessageIssues,
  describePath,
  localIssues,
  serverIssues,
  summarizeIssues,
  type TourIssueInput,
} from "./tourIssues";

const valid: TourIssueInput = {
  name: "Djerba – Tataouine",
  description: "Deux jours dans le sud.",
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
    const blocking = issues.filter(isSaveBlocking);
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

describe("a description is required to send for review, not to save", () => {
  it("flags an empty description without blocking a plain save", () => {
    const issues = localIssues({ ...valid, description: "  " });
    expect(issues).toEqual([expect.objectContaining({ step: 0, field: "description" })]);
    expect(issues.filter(isSaveBlocking)).toEqual([]);
  });
});

describe("plain-sentence refusals from the tour service", () => {
  it("pins a duplicate name to the name field, quoting the name", () => {
    const [issue] = serverIssues({}, "Enregistrement refusé — A tour with the name 'Djerba' already exists — (HTTP 409)");
    expect(issue).toMatchObject({ step: 0, field: "name", label: "Nom du circuit" });
    expect(issue.message).toContain("« Djerba »");
  });

  it("pins the sale price rule to the promo field on the pricing step", () => {
    const [issue] = serverIssues({}, "Sale price must be lower than the regular passenger adult price");
    expect(issue).toMatchObject({ step: 8, field: "salePriceAdult" });
  });

  it("splits Tour is not complete into one problem per field and step", () => {
    const issues = serverIssues(
      {},
      "Action refusée — Tour is not complete: description, at least one keyword, at least 4 photos (cover + gallery), insurance confirmation — (HTTP 400)",
    );
    expect(issues.map((i) => [i.field, i.step])).toEqual([
      ["description", 0],
      ["keywords", 3],
      ["photos", 1],
      ["insuranceConfirmed", 10],
    ]);
  });

  it("keeps an item it does not know as its own line instead of dropping it", () => {
    const issues = knownTourMessageIssues("Tour is not complete: something new") ?? [];
    expect(issues).toEqual([expect.objectContaining({ step: -1, message: "something new" })]);
  });
});

describe("database constraint messages (no per-field map)", () => {
  it("pins a duplicate slug to its field and step", () => {
    const issues = serverIssues(
      {},
      "Enregistrement refusé — Another record already uses the same value for: slug. — (HTTP 409)",
    );
    expect(issues).toEqual([
      expect.objectContaining({ step: 0, field: "slug", label: "Slug (URL)" }),
    ]);
    expect(issues[0].message).toContain("déjà utilisée");
  });

  it("maps a snake_case column to its form field and step", () => {
    const [issue] = serverIssues({}, "A required value is missing: cover_photo_url.");
    expect(issue).toMatchObject({ step: 1, field: "coverPhotoUrl", label: "Photo de couverture" });
    expect(issue.message).toContain("exige une valeur");
  });

  it("handles several columns of a composite unique key", () => {
    const issues = serverIssues({}, "Another record already uses the same value for: name, slug.");
    expect(issues.map((i) => i.field)).toEqual(["name", "slug"]);
  });

  it("keeps the raw server text when the column is unknown to the wizard", () => {
    const [issue] = serverIssues({}, "This action can not be completed because other records still depend on it.");
    expect(issue).toMatchObject({ step: -1, label: "Serveur" });
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
