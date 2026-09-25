import { describe, expect, it } from "vitest";
import { readApiError } from "./apiError";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("readApiError", () => {
  it("lists every rejected field with its own reason", async () => {
    const res = json(400, {
      status: 400,
      error: "Bad Request",
      message: "Validation failed — please check the fields below",
      errors: { name: "must not be blank", "adultPriceTtc": "must be greater than 0" },
    });
    const text = await readApiError(res, "Enregistrement impossible");
    expect(text).toContain("Enregistrement impossible");
    expect(text).toContain("Validation failed");
    expect(text).toContain("name : must not be blank");
    expect(text).toContain("adultPriceTtc : must be greater than 0");
    expect(text).toContain("(HTTP 400)");
  });

  it("prefers the detailed message over the HTTP reason phrase", async () => {
    const text = await readApiError(json(409, { error: "Conflict", message: "Cette date est déjà bloquée" }));
    expect(text).toContain("Cette date est déjà bloquée");
    expect(text).not.toContain("Conflict");
  });

  it("explains a 403 even when the server only says Forbidden", async () => {
    const text = await readApiError(json(403, { error: "Forbidden" }), "Suppression impossible");
    expect(text).toContain("Votre rôle ne permet pas cette action");
    expect(text).toContain("(HTTP 403)");
  });

  it("keeps a plain-text body and never leaks an HTML error page", async () => {
    const plain = await readApiError(new Response("upstream timed out", { status: 504 }));
    expect(plain).toContain("upstream timed out");
    const html = await readApiError(new Response("<html><body>502</body></html>", { status: 502 }));
    expect(html).not.toContain("<html>");
    expect(html).toContain("(HTTP 502)");
  });
});
