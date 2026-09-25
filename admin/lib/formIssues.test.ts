import { describe, expect, it } from "vitest";
import { issuesFromServer, summarizeFormIssues, validateRequired, type FieldLike } from "./formIssues";

const fields: FieldLike[] = [
  { key: "name", label: "Nom", type: "text", required: true },
  { key: "duration", label: "Durée", type: "text" },
  { key: "maxNights", label: "Nombre de nuits maximum", type: "number", required: true },
  { key: "tva", label: "TVA (%)", type: "number", required: true },
  { key: "isActive", label: "Actif", type: "checkbox" },
];

describe("validateRequired", () => {
  it("reports every empty required field at once, not just the first", () => {
    const issues = validateRequired(fields, { name: "  ", maxNights: undefined, tva: 13, duration: "" });
    expect(issues.map((i) => i.key)).toEqual(["name", "maxNights"]);
    expect(issues[0].message).toContain("obligatoire");
  });

  it("flags an emptied number input (NaN) even when not required", () => {
    const issues = validateRequired(fields, { name: "ok", maxNights: 1, tva: Number.NaN });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ key: "tva", label: "TVA (%)" });
    expect(issues[0].message).toContain("saisissez un nombre");
  });

  it("accepts a complete form and never asks a checkbox to be filled", () => {
    expect(validateRequired(fields, { name: "ok", maxNights: 0, tva: 0, isActive: false })).toEqual([]);
  });
});

describe("issuesFromServer", () => {
  it("attaches a backend error to its own field", () => {
    const [issue] = issuesFromServer(fields, { name: "must not be blank" }, "fallback");
    expect(issue).toMatchObject({ key: "name", label: "Nom", message: "must not be blank" });
  });

  it("keeps nested paths readable and out of the plain fields", () => {
    const issues = issuesFromServer(fields, { "translations[1].name": "too long", "photos[0].url": "invalid" }, "x");
    expect(issues[0]).toMatchObject({ key: "", label: "Traduction n° 2 — nom" });
    expect(issues[1]).toMatchObject({ key: "", label: "Photo n° 1 — adresse de la photo" });
  });

  it("attaches a duplicate-value constraint to the matching input", () => {
    const [issue] = issuesFromServer(fields, {}, "Another record already uses the same value for: name.");
    expect(issue).toMatchObject({ key: "name", label: "Nom" });
    expect(issue.message).toContain("déjà utilisée");
  });

  it("uses the server message when no field detail is available", () => {
    expect(issuesFromServer(fields, {}, "Slug déjà utilisé")).toEqual([
      { key: "", path: "", label: "Serveur", message: "Slug déjà utilisé" },
    ]);
  });

  it("caps the summary and counts the rest", () => {
    const issues = issuesFromServer(fields, { name: "a", duration: "b", tva: "c" }, "x");
    expect(summarizeFormIssues(issues, 1)).toContain("et 2 autre(s)");
  });
});
