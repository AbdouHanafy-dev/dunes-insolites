import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { canonicalActivityPath, canonicalStayPath, LEGACY_PRODUCT_SLUGS } from "./legacySlugs";
import { withTrailingSlash } from "./schema";
import { routing, localeAlternates } from "@/i18n/routing";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const read = (p: string) => readFileSync(repoRoot + p, "utf8");

/**
 * Phase 6 — offline SEO/migration regression guards. No network, CI-safe.
 * The live-host contract lives in scripts/verify-production-urls.mjs; this
 * pins the deterministic pieces that a code change could silently break.
 */

describe("canonical URL strategy (lib/legacySlugs.ts)", () => {
  it("keeps the flat legacy slug canonical for a legacy product page in French", () => {
    expect(canonicalActivityPath("quad-desert", "fr")).toBe("/quad-desert");
    expect(canonicalStayPath("nuitee-campement-desert", "fr")).toBe("/nuitee-campement-desert");
  });

  it("uses the nested route for a legacy slug in every non-default locale", () => {
    for (const locale of routing.locales.filter((l) => l !== "fr")) {
      expect(canonicalActivityPath("quad-desert", locale)).toBe(`/${locale}/activities/quad-desert`);
      expect(canonicalStayPath("bivouac-desert-tunisie", locale)).toBe(`/${locale}/camp/bivouac-desert-tunisie`);
    }
  });

  it("uses the nested route for a non-legacy slug even in French", () => {
    expect(canonicalActivityPath("camel-trek", "fr")).toBe("/activities/camel-trek");
    expect(canonicalStayPath("some-new-stay", "fr")).toBe("/camp/some-new-stay");
  });

  it("a canonical path is never the bare homepage for a real content page", () => {
    for (const slug of LEGACY_PRODUCT_SLUGS) {
      expect(canonicalActivityPath(slug, "fr")).not.toBe("/");
      expect(canonicalStayPath(slug, "fr")).not.toBe("/");
    }
  });
});

describe("hreflang alternates (i18n/routing.ts)", () => {
  const alt = localeAlternates("en", (l) => (l === "fr" ? "/about" : `/${l}/about`));

  it("emits every locale plus x-default", () => {
    for (const l of routing.locales) expect(alt.languages[l]).toBeDefined();
    expect(alt.languages["x-default"]).toBe("/about"); // x-default = the default-locale path
  });

  it("is reciprocal — canonical for a locale equals that locale's alternate", () => {
    for (const locale of routing.locales) {
      const a = localeAlternates(locale, (l) => (l === "fr" ? "/about" : `/${l}/about`));
      expect(a.canonical).toBe(a.languages[locale]);
    }
  });

  it("no alternate points at a different page path", () => {
    for (const href of Object.values(alt.languages)) {
      expect(href.replace(/^\/[a-z]{2}(?=\/)/, "")).toBe("/about");
    }
  });
});

describe("withTrailingSlash matches next.config.ts trailingSlash:true", () => {
  it("adds exactly one slash, idempotently, and keeps the homepage as '/'", () => {
    expect(withTrailingSlash("")).toBe("/");
    expect(withTrailingSlash("/faq")).toBe("/faq/");
    expect(withTrailingSlash("/faq/")).toBe("/faq/");
  });

  it("next.config.ts still declares trailingSlash: true", () => {
    expect(read("/frontend/next.config.ts")).toMatch(/trailingSlash:\s*true/);
  });
});

describe("robots.txt (app/robots.ts)", () => {
  const robots = read("/frontend/app/robots.ts");
  it("disallows API and the private booking routes", () => {
    for (const p of ["/api/", "/book", "/bookings/"]) expect(robots).toContain(`"${p}"`);
  });
  it("does not disallow the whole site", () => {
    expect(robots).toMatch(/allow:\s*"\/"/);
    expect(robots).not.toMatch(/disallow:\s*\[[^\]]*"\/"[^\]]*\]/);
  });
  it("points the Sitemap directive at /sitemap.xml on the canonical host", () => {
    expect(robots).toMatch(/\$\{site\.url\}\/sitemap\.xml/);
  });
});

describe("sitemap (app/sitemap.ts) contains no private or internal routes", () => {
  const sm = read("/frontend/app/sitemap.ts");
  it("static path list excludes private/auth/api routes", () => {
    for (const bad of ['"/book"', '"/bookings"', '"/account"', '"/login"', '"/signup"', '"/api', "/admin"]) {
      expect(sm).not.toContain(`path: ${bad}`);
    }
  });
  it("accommodation sub-pages are always nested under /camp (no legacy flat URL)", () => {
    expect(sm).toContain("`/camp/${stay.slug}/${accommodation.slug}`");
  });
});

describe("redirect map (docs/seo/redirect-map.csv)", () => {
  const rows = read("/docs/seo/redirect-map.csv")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("source,"))
    .map((l) => {
      const [source, expected_status, destination] = l.split(",");
      return { source, expected_status, destination };
    });

  it("has rows", () => expect(rows.length).toBeGreaterThan(20));

  it("no source is listed twice", () => {
    const seen = new Set<string>();
    for (const r of rows) {
      expect(seen.has(r.source)).toBe(false);
      seen.add(r.source);
    }
  });

  it("no redirect loop — a 301 source never equals its destination", () => {
    for (const r of rows) {
      if (r.expected_status !== "301") continue; // 200 rows are "served in place" — source==destination is correct
      if (r.destination === "DECISION_REQUIRED" || r.destination === "unchanged" || r.destination.includes("*")) continue;
      expect(r.destination).not.toBe(r.source);
    }
  });

  it("never 301s to the bare homepage (CLAUDE.md: no soft-404 homepage redirect)", () => {
    for (const r of rows) {
      if (r.expected_status === "301") expect(r.destination).not.toBe("/");
    }
  });

  it("every 301 destination is a real Next.js route prefix or an explicit decision", () => {
    const okPrefixes = ["/circuits/", "/activities/", "/camp/", "/about/", "/gallery/", "/bookings/", "/account/", "/login/", "/nuitee-campement-desert/", "/bivouac-desert-tunisie/", "https://www.dunes-insolites.com/"];
    for (const r of rows) {
      if (r.expected_status !== "301") continue;
      const ok = r.destination === "DECISION_REQUIRED" || okPrefixes.some((p) => r.destination.startsWith(p));
      expect(ok, `unexpected 301 destination: ${r.source} -> ${r.destination}`).toBe(true);
    }
  });

  it("every redirected (301) source carries the trailing-slash policy", () => {
    for (const r of rows) {
      if (r.expected_status !== "301") continue; // files (/sitemap.xml) and wildcard infra rows are exempt
      if (/^https?:/.test(r.source) || r.source.includes("*")) continue;
      expect(r.source.endsWith("/"), `source missing trailing slash: ${r.source}`).toBe(true);
    }
  });
});

describe("url contract (docs/seo/url-contract.json) is well-formed", () => {
  const contract = JSON.parse(read("/docs/seo/url-contract.json"));
  it("every group has at least one url and a nextjs expectation", () => {
    for (const g of contract.groups) {
      expect(g.urls.length).toBeGreaterThan(0);
      expect(g.nextjs).toBeDefined();
      for (const u of g.urls) expect(u.startsWith("/") || u.startsWith("http")).toBe(true);
    }
  });
  it("the canonical host is https + www", () => {
    expect(contract.canonicalHost).toBe("https://www.dunes-insolites.com");
  });
});

describe("nginx allowlist stays in sync with the legacy slug source of truth", () => {
  const conf = read("/nginx/dunes-insolites.com.conf");
  it("routes every legacy product slug to Next.js", () => {
    for (const slug of LEGACY_PRODUCT_SLUGS) {
      expect(conf.includes(slug), `nginx allowlist missing ${slug}`).toBe(true);
    }
  });
  it("keeps WordPress as the default (a final catch-all location / -> wordpress)", () => {
    const lastLocation = conf.lastIndexOf("location /");
    const wpUpstream = conf.indexOf("proxy_pass http://wordpress");
    expect(wpUpstream).toBeGreaterThan(lastLocation - 200);
    expect(conf).toMatch(/location \/ \{\s*proxy_pass http:\/\/wordpress/);
  });
});
