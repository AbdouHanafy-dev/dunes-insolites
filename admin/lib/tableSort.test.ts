import { describe, expect, it } from "vitest";
import { nextSort, sortRows } from "./tableSort";

type Row = { name: string; price: number | null };
const rows: Row[] = [
  { name: "b", price: 20 },
  { name: "A", price: null },
  { name: "c", price: 5 },
  { name: "a10", price: 1 },
  { name: "a2", price: 2 },
];

describe("sortRows", () => {
  it("sorts numbers numerically and puts empty values last in both directions", () => {
    expect(sortRows(rows, (r) => r.price, "asc").map((r) => r.price)).toEqual([1, 2, 5, 20, null]);
    expect(sortRows(rows, (r) => r.price, "desc").map((r) => r.price)).toEqual([20, 5, 2, 1, null]);
  });
  it("sorts text case-insensitively with natural numbers", () => {
    expect(sortRows(rows, (r) => r.name, "asc").map((r) => r.name)).toEqual(["A", "a2", "a10", "b", "c"]);
  });
  it("does not mutate its input", () => {
    const copy = [...rows];
    sortRows(rows, (r) => r.name, "desc");
    expect(rows).toEqual(copy);
  });
});

describe("nextSort", () => {
  it("starts a new column ascending and flips the same one", () => {
    expect(nextSort(null, "name")).toEqual({ key: "name", dir: "asc" });
    expect(nextSort({ key: "name", dir: "asc" }, "name")).toEqual({ key: "name", dir: "desc" });
    expect(nextSort({ key: "name", dir: "desc" }, "price")).toEqual({ key: "price", dir: "asc" });
  });
});
