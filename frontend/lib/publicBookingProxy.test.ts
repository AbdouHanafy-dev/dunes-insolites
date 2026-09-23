import { describe, expect, it } from "vitest";
import { bookingLocale, withLocale } from "@/lib/publicBookingProxy";

const req = (headers: Record<string, string>) => new Request("https://www.dunes-insolites.com/api/stay-bookings", { headers });

describe("bookingLocale", () => {
  it("reads the locale prefix of the page the form was submitted from", () => {
    expect(bookingLocale(req({ referer: "https://www.dunes-insolites.com/en/nuitee-campement-desert/" }))).toBe("en");
    expect(bookingLocale(req({ referer: "https://www.dunes-insolites.com/ar/circuits/" }))).toBe("ar");
  });

  it("treats an unprefixed page as French (the default locale lives at the root)", () => {
    expect(bookingLocale(req({ referer: "https://www.dunes-insolites.com/nuitee-campement-desert/" }))).toBe("fr");
  });

  it("falls back to the NEXT_LOCALE cookie, then French", () => {
    expect(bookingLocale(req({ cookie: "a=1; NEXT_LOCALE=de" }))).toBe("de");
    expect(bookingLocale(req({ cookie: "NEXT_LOCALE=xx" }))).toBe("fr");
    expect(bookingLocale(req({}))).toBe("fr");
  });
});

describe("withLocale", () => {
  it("adds the locale to a JSON body", () => {
    expect(JSON.parse(withLocale('{"name":"Sophie"}', "it"))).toEqual({ name: "Sophie", locale: "it" });
  });

  it("keeps a locale the caller already set, and leaves non-JSON alone", () => {
    expect(JSON.parse(withLocale('{"locale":"en"}', "it")).locale).toBe("en");
    expect(withLocale("not json", "it")).toBe("not json");
  });
});
