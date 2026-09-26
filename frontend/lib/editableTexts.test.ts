import { describe, expect, it } from "vitest";
import { applyTextOverrides, editableDefaults, isUsableOverride, placeholdersOf } from "./editableTexts";

const messages = {
  tourBookingForm: { upgradeLabel: "Améliorez votre séjour", upgradePrice: "+{price}" },
  header: { home: "Accueil" },
};

describe("editableDefaults", () => {
  it("lists only the editable sections", () => {
    expect(editableDefaults(messages)).toEqual({
      "tourBookingForm.upgradeLabel": "Améliorez votre séjour",
      "tourBookingForm.upgradePrice": "+{price}",
    });
  });
});

describe("placeholdersOf", () => {
  it("finds simple and plural arguments", () => {
    expect(placeholdersOf("{a} et {b}")).toEqual(["a", "b"]);
    expect(placeholdersOf("{nights, plural, =1 {1 nuit} other {# nuits}}")).toEqual(["nights"]);
  });
});

describe("isUsableOverride", () => {
  it("accepts plain text and a kept placeholder", () => {
    expect(isUsableOverride("+{price}", "Supplément : {price}")).toBe(true);
    expect(isUsableOverride("Bonjour", "Salut")).toBe(true);
  });
  it("refuses a made-up placeholder, unbalanced braces and blank text", () => {
    expect(isUsableOverride("+{price}", "{cost}")).toBe(false);
    expect(isUsableOverride("Bonjour", "Salut {")).toBe(false);
    expect(isUsableOverride("Bonjour", "   ")).toBe(false);
  });
});

describe("applyTextOverrides", () => {
  it("replaces an existing editable text", () => {
    const out = applyTextOverrides(messages, { "tourBookingForm.upgradeLabel": "Passez au niveau supérieur" });
    expect((out.tourBookingForm as Record<string, string>).upgradeLabel).toBe("Passez au niveau supérieur");
    expect((messages.tourBookingForm as Record<string, string>).upgradeLabel).toBe("Améliorez votre séjour");
  });
  it("ignores other sections, unknown keys and unusable text", () => {
    const out = applyTextOverrides(messages, {
      "header.home": "Hacked",
      "tourBookingForm.unknown": "x",
      "tourBookingForm.upgradePrice": "{cost}",
    });
    expect(out).toEqual(messages);
  });
  it("returns the messages untouched without overrides", () => {
    expect(applyTextOverrides(messages, undefined)).toBe(messages);
  });
});
