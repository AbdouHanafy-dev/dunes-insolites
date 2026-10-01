import { describe, expect, it } from "vitest";
import { pageNumber, paginate, PUBLIC_PAGE_SIZE } from "./pagination";

describe("pagination", () => {
  const items = Array.from({ length: 14 }, (_, index) => index + 1);

  it("uses six public items per page", () => {
    expect(PUBLIC_PAGE_SIZE).toBe(6);
    expect(paginate(items, 1).items).toEqual([1, 2, 3, 4, 5, 6]);
    expect(paginate(items, 2).items).toEqual([7, 8, 9, 10, 11, 12]);
    expect(paginate(items, 3).items).toEqual([13, 14]);
  });

  it("clamps invalid or out-of-range pages", () => {
    expect(pageNumber(undefined)).toBe(1);
    expect(pageNumber("invalid")).toBe(1);
    expect(pageNumber("-2")).toBe(1);
    expect(paginate(items, 99).currentPage).toBe(3);
  });

  it("keeps an empty list on a stable first page", () => {
    expect(paginate([], 2)).toMatchObject({
      items: [],
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      start: 0,
    });
  });
});
