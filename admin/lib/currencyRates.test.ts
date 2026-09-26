import { describe, expect, it } from "vitest";
import { formatRate, parseAmount, perEuro } from "./currencyRates";

describe("parseAmount", () => {
  it("reads a positive number with a dot or a comma", () => {
    expect(parseAmount("12")).toBe(12);
    expect(parseAmount("13,6")).toBe(13.6);
    expect(parseAmount(" 13.6 ")).toBe(13.6);
  });
  it("rejects empty, zero, negative and text", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-3")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("perEuro", () => {
  it("derives what one euro is worth from the three equivalent amounts", () => {
    expect(perEuro(10, 12, 30)).toEqual({ usd: 1.2, tnd: 3 });
  });
  it("waits until all three amounts are valid", () => {
    expect(perEuro(10, null, 30)).toBeNull();
  });
});

describe("formatRate", () => {
  it("drops trailing zeros and uses the French decimal comma", () => {
    expect(formatRate(1.2)).toBe("1,2");
    expect(formatRate(3)).toBe("3");
    expect(formatRate(3.4)).toBe("3,4");
  });
});
