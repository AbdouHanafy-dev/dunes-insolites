import { describe, expect, it } from "vitest";
import { activeFilterCount, applyFilters, matchesSearch, optionsFrom, type FilterDef } from "./tableFilters";

type Row = { name: string; status: string; date: string | null };
const rows: Row[] = [
  { name: "Ariana Correia", status: "PAID", date: "2026-10-07T10:00:00" },
  { name: "rob", status: "UNPAID", date: "2027-06-04" },
  { name: "khelia haikel", status: "PAID", date: null },
];
const defs: FilterDef<Row>[] = [
  { id: "status", label: "Statut", kind: "select", options: [], get: (r) => r.status },
  { id: "date", label: "Date", kind: "date", get: (r) => r.date },
];

describe("applyFilters", () => {
  it("returns everything when nothing is set", () => {
    expect(applyFilters(rows, defs, {})).toHaveLength(3);
    expect(applyFilters(rows, defs, { status: "" })).toHaveLength(3);
  });
  it("filters by a drop-down value", () => {
    expect(applyFilters(rows, defs, { status: "PAID" }).map((r) => r.name)).toEqual(["Ariana Correia", "khelia haikel"]);
  });
  it("filters by a date range, inclusive, comparing the day only", () => {
    expect(applyFilters(rows, defs, { "date:from": "2026-10-07", "date:to": "2026-10-07" }).map((r) => r.name)).toEqual(["Ariana Correia"]);
    expect(applyFilters(rows, defs, { "date:from": "2027-01-01" }).map((r) => r.name)).toEqual(["rob"]);
  });
  it("drops rows without a date once a date range is set", () => {
    expect(applyFilters(rows, defs, { "date:to": "2030-01-01" }).map((r) => r.name)).not.toContain("khelia haikel");
  });
  it("combines filters", () => {
    expect(applyFilters(rows, defs, { status: "PAID", "date:from": "2026-01-01" }).map((r) => r.name)).toEqual(["Ariana Correia"]);
  });
});

describe("matchesSearch", () => {
  it("needs every word somewhere in the row, in any order", () => {
    expect(matchesSearch(["Ariana Correia", "Tente"], "correia tente")).toBe(true);
    expect(matchesSearch(["Ariana Correia", "Tente"], "correia suite")).toBe(false);
    expect(matchesSearch(["x"], "  ")).toBe(true);
    expect(matchesSearch([null, 180], "180")).toBe(true);
  });
});

describe("optionsFrom / activeFilterCount", () => {
  it("lists distinct values sorted by label", () => {
    expect(optionsFrom(rows, (r) => r.status, (v) => (v === "PAID" ? "Payé" : "Non payé"))).toEqual([
      { value: "UNPAID", label: "Non payé" },
      { value: "PAID", label: "Payé" },
    ]);
  });
  it("counts only the filters that are set", () => {
    expect(activeFilterCount({ status: "PAID", "date:from": "", "date:to": "2026-01-01" })).toBe(2);
  });
});
