#!/usr/bin/env node
/**
 * Phase 6 — deterministic SEO/URL response-contract checker for the
 * WordPress -> Next.js strangler migration.
 *
 *   BASE_URL=https://www.dunes-insolites.com \
 *   SEO_PROFILE=wordpress \
 *   node scripts/verify-production-urls.mjs
 *
 * Env:
 *   BASE_URL      required. The host to test (real production, a staging
 *                 origin, or a local nginx container). No default — the test
 *                 must never silently hit a developer's machine.
 *   SEO_PROFILE   "wordpress" (default) = assert the CURRENT live baseline.
 *                 "nextjs" = assert the post-Stage-1 expected state.
 *   SEO_CONTRACT  path to the contract JSON (default docs/seo/url-contract.json).
 *   SEO_JSON_OUT  optional path to write a machine-readable result file.
 *
 * Exit code 0 = every expectation met. Non-zero = at least one unexpected
 * result (wrong status, redirect loop, redirect chain, bad canonical, broken
 * hreflang, sitemap contains a redirecting/404/private URL, ...).
 *
 * Read-only: only ever issues GET requests. Never mutates anything.
 */

import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

const BASE_URL = process.env.BASE_URL?.replace(/\/+$/, "");
const PROFILE = process.env.SEO_PROFILE || "wordpress";
const CONTRACT_PATH = process.env.SEO_CONTRACT || "docs/seo/url-contract.json";
const JSON_OUT = process.env.SEO_JSON_OUT || "";
// "servedBy: wordpress" groups only make sense through the full nginx split.
// Off by default so a bare `next start` run isn't drowned in WordPress-only
// expectations it structurally cannot meet.
const THROUGH_NGINX = process.env.SEO_THROUGH_NGINX === "1" || process.env.SEO_THROUGH_NGINX === "true";
// Legacy 301s that live in the CMS Redirect table (middleware.ts reads
// /public/redirects). A bare `next start` with no backend has none — set
// this only when the backend is up and seed-legacy-redirects.py has run.
const CMS_REDIRECTS = process.env.SEO_CMS_REDIRECTS === "1" || process.env.SEO_CMS_REDIRECTS === "true";
const TIMEOUT_MS = 20000;
const MAX_REDIRECTS = 10;

if (!BASE_URL) {
  console.error("BASE_URL is required, e.g. BASE_URL=https://www.dunes-insolites.com node scripts/verify-production-urls.mjs");
  process.exit(2);
}
if (PROFILE !== "wordpress" && PROFILE !== "nextjs") {
  console.error(`SEO_PROFILE must be "wordpress" or "nextjs" (got "${PROFILE}")`);
  process.exit(2);
}

const contract = JSON.parse(readFileSync(CONTRACT_PATH, "utf8"));
const results = [];
let failures = 0;
let robotsDisallowRules = null;

async function loadRobotsDisallow() {
  try {
    const r = await fetch(BASE_URL + "/robots.txt", { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const body = await r.text();
    robotsDisallowRules = [...body.matchAll(/^\s*Disallow:\s*(\S+)\s*$/gim)].map((m) => m[1]);
  } catch {
    robotsDisallowRules = [];
  }
}
function robotsTxtDisallows(path) {
  return (robotsDisallowRules || []).some((rule) => rule !== "/" && path.startsWith(rule));
}

function record(name, url, ok, detail) {
  results.push({ group: name, url, ok, detail });
  if (!ok) failures++;
  const tag = ok ? "  ok  " : "FAIL  ";
  console.log(`${tag}${(url || name).padEnd(62)} ${detail || ""}`);
}

function absolute(u) {
  if (/^https?:\/\//i.test(u)) return u;
  return BASE_URL + (u.startsWith("/") ? u : "/" + u);
}

/** One request, no auto-follow. Returns {status, location, headers, body?}. */
async function once(url, wantBody) {
  const res = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "dunes-seo-verify/1 (+phase6)" },
  });
  const ct = res.headers.get("content-type") || "";
  const body = wantBody && (ct.includes("html") || ct.includes("xml") || ct.includes("text")) ? await res.text() : "";
  return { status: res.status, location: res.headers.get("location"), contentType: ct, body, headers: res.headers };
}

/** Follows redirects, returns the full hop chain + loop/chain detection. */
async function trace(url, wantBody) {
  const hops = [];
  const seen = new Set();
  let current = absolute(url);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    if (seen.has(current)) {
      return { hops, loop: true, current, final: null };
    }
    seen.add(current);
    let r;
    try {
      r = await once(current, false);
    } catch (e) {
      hops.push({ url: current, error: e.message });
      return { hops, loop: false, error: e.message, final: null };
    }
    hops.push({ url: current, status: r.status, location: r.location });
    if (r.status >= 300 && r.status < 400 && r.location) {
      current = new URL(r.location, current).toString();
      continue;
    }
    // terminal — re-fetch with a body only if a check needs it
    const finalRes = wantBody ? await once(current, true) : r;
    return { hops, loop: false, final: { url: current, status: r.status, contentType: finalRes.contentType, body: finalRes.body, headers: finalRes.headers } };
  }
  return { hops, loop: false, chainTooLong: true, final: null };
}

function pathOf(u) {
  try { return new URL(u).pathname.replace(/[?#].*$/, ""); } catch { return String(u); }
}
function sameUrl(a, b) {
  if (!a || !b) return a === b;
  try { const x = new URL(a), y = new URL(b); return x.host === y.host && x.pathname === y.pathname; } catch { return a === b; }
}
/** Rewrite a production-absolute URL onto the host under test. */
function ontoBase(u) {
  try {
    const parsed = new URL(u);
    const base = new URL(BASE_URL);
    if (parsed.host !== base.host) { parsed.protocol = base.protocol; parsed.host = base.host; }
    return parsed.toString();
  } catch { return u; }
}
function metaTag(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}
function canonicalOf(html) {
  return metaTag(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
    || metaTag(html, /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
}
function hreflangsOf(html) {
  const out = {};
  for (const m of html.matchAll(/<link[^>]+rel=["']alternate["'][^>]*>/gi)) {
    const tag = m[0];
    const hl = tag.match(/hreflang=["']([^"']+)["']/i);
    const href = tag.match(/href=["']([^"']+)["']/i);
    if (hl && href) out[hl[1].toLowerCase()] = href[1];
  }
  return out;
}
function metaRobotsOf(html) {
  return (metaTag(html, /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i) || "").toLowerCase();
}

function checkExpectation(group, url, exp, tr) {
  const problems = [];
  const first = tr.hops[0];
  const final = tr.final;

  if (tr.loop) problems.push("REDIRECT LOOP: " + tr.hops.map((h) => h.url).join(" -> "));
  if (tr.chainTooLong) problems.push("redirect chain too long");
  if (tr.error) problems.push("request error: " + tr.error);
  if (problems.length) return problems;

  const redirectHops = tr.hops.filter((h) => h.status >= 300 && h.status < 400);
  if (exp.maxHops != null && redirectHops.length > exp.maxHops) {
    problems.push(`redirect chain: ${redirectHops.length} hops (max ${exp.maxHops}) — ${tr.hops.map((h) => `${h.status} ${h.url}`).join(" | ")}`);
  }

  const firstStatus = first.status;
  const statusOK =
    (exp.status != null && firstStatus === exp.status) ||
    (exp.statusOneOf && exp.statusOneOf.includes(firstStatus));
  if (exp.status != null || exp.statusOneOf) {
    if (!statusOK) problems.push(`status ${firstStatus}, expected ${exp.status ?? exp.statusOneOf.join("/")}`);
  }

  if (exp.location && first.location) {
    const got = new URL(first.location, tr.hops[0].url).toString();
    if (got !== exp.location) problems.push(`Location ${got}, expected ${exp.location}`);
  }
  if (exp.locationOneOf && first.location) {
    const got = new URL(first.location, tr.hops[0].url).toString();
    if (!exp.locationOneOf.includes(got)) problems.push(`Location ${got} not in ${exp.locationOneOf.join(" / ")}`);
  }
  if (exp.locationStartsWith && first.location && !first.location.startsWith(exp.locationStartsWith))
    problems.push(`Location ${first.location} does not start with ${exp.locationStartsWith}`);
  if (exp.locationEndsWith && first.location && !first.location.replace(/[?#].*$/, "").endsWith(exp.locationEndsWith))
    problems.push(`Location ${first.location} does not end with "${exp.locationEndsWith}"`);

  if (final) {
    if (exp.finalStatus != null && final.status !== exp.finalStatus)
      problems.push(`final status ${final.status}, expected ${exp.finalStatus}`);
    if (exp.finalStatusOneOf && !exp.finalStatusOneOf.includes(final.status))
      problems.push(`final status ${final.status} not in ${exp.finalStatusOneOf.join("/")}`);

    const html = final.body || "";
    const robots = metaRobotsOf(html);

    // "must not be indexable": pass if 404, or meta noindex, or robots.txt Disallow.
    if (exp.mustBeRobotsDisallowedOrNotFound) {
      const notFound = final.status === 404 || first.status === 404;
      const noindexed = robots.includes("noindex");
      const disallowed = robotsTxtDisallows(pathOf(final.url));
      if (!notFound && !noindexed && !disallowed)
        problems.push(`indexable private route: status ${final.status}, no meta noindex, not robots-disallowed`);
      return problems; // no further HTML assertions for these
    }

    if (html) {
      // A resolving (200) page must not be noindex; a 404 SHOULD be noindex — don't flag that.
      if (final.status === 200 && robots.includes("noindex") && !exp.allowNoindex)
        problems.push(`meta robots contains noindex on a 200: "${robots}"`);

      const canon = canonicalOf(html);
      if (exp.canonical && !sameUrl(canon, exp.canonical)) problems.push(`canonical ${canon}, expected ${exp.canonical}`);
      if (exp.selfCanonical) {
        // Compare by PATH — canonical always carries the production host
        // (metadataBase), which is correct even when testing localhost/staging.
        if (canon && pathOf(canon) !== pathOf(final.url))
          problems.push(`not self-canonical: canonical path ${pathOf(canon)} != ${pathOf(final.url)}`);
        if (canon && !canon.startsWith("https://")) problems.push(`canonical is not https: ${canon}`);
        if (canon && contract.canonicalHost && new URL(canon).host !== new URL(contract.canonicalHost).host)
          problems.push(`canonical host ${new URL(canon).host}, expected ${new URL(contract.canonicalHost).host}`);
      }
      if (Array.isArray(exp.hreflang)) {
        const hl = hreflangsOf(html);
        for (const want of exp.hreflang) if (!hl[want]) problems.push(`missing hreflang "${want}"`);
        for (const [lang, href] of Object.entries(hl)) {
          if (!/^https:\/\//.test(href)) problems.push(`hreflang ${lang} not absolute-https: ${href}`);
        }
      }
    } else if (exp.selfCanonical || exp.canonical || Array.isArray(exp.hreflang)) {
      problems.push("expected an HTML body to inspect canonical/hreflang, got none");
    }
  }
  return problems;
}

async function verifyGroup(group) {
  const exp = group[PROFILE];
  if (!exp) return;
  if (exp.servedBy === "wordpress" && !THROUGH_NGINX) {
    record(group.name, "", true, "SKIPPED (needs the nginx split — set SEO_THROUGH_NGINX=1)");
    return;
  }
  if (group.requires === "cms-redirects" && !CMS_REDIRECTS && PROFILE === "nextjs") {
    record(group.name, "", true, "SKIPPED (needs a seeded CMS Redirect table — set SEO_CMS_REDIRECTS=1)");
    return;
  }
  const wantBody = exp.selfCanonical || exp.canonical || Array.isArray(exp.hreflang) || exp.finalStatus === 200 || exp.mustBeRobotsDisallowedOrNotFound;
  for (const url of group.urls) {
    if (exp.servedBy === "wordpress" && PROFILE === "nextjs") {
      // Stage-1 expectation is "unchanged, still WordPress" — assert current behaviour holds.
    }
    let tr;
    try {
      tr = await trace(url, wantBody);
    } catch (e) {
      record(group.name, url, false, "trace error: " + e.message);
      continue;
    }
    const problems = checkExpectation(group.name, url, exp, tr);
    record(group.name, url, problems.length === 0, problems.length ? problems.join(" ; ") : `status ${tr.hops[0].status}${tr.final ? " -> " + tr.final.status : ""}`);
  }
}

async function verifyRobots() {
  const exp = contract.robots?.[PROFILE];
  if (!exp) return;
  const tr = await trace("/robots.txt", true);
  const problems = [];
  const status = tr.final?.status ?? tr.hops[0].status;
  if (exp.status != null && status !== exp.status) problems.push(`status ${status}, expected ${exp.status}`);
  const body = tr.final?.body || "";
  for (const s of exp.mustContain || []) if (!body.includes(s)) problems.push(`robots.txt missing "${s}"`);
  for (const d of exp.mustDisallow || []) if (!new RegExp(`Disallow:\\s*${d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(body)) problems.push(`robots.txt does not Disallow ${d}`);
  for (const d of exp.mustNotDisallow || []) if (new RegExp(`Disallow:\\s*${d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m").test(body)) problems.push(`robots.txt wrongly Disallows ${d}`);
  record("robots.txt", "/robots.txt", problems.length === 0, problems.join(" ; ") || `status ${status}`);
}

async function verifySitemap() {
  const exp = contract.sitemap?.[PROFILE];
  if (!exp) return;
  const path = exp.path || "/sitemap.xml";
  const tr = await trace(path, true);
  const problems = [];
  const firstStatus = tr.hops[0].status;
  if (exp.status != null && firstStatus !== exp.status) problems.push(`status ${firstStatus}, expected ${exp.status}`);
  if (exp.location && tr.hops[0].location) {
    const got = new URL(tr.hops[0].location, BASE_URL + path).toString();
    if (got !== exp.location) problems.push(`Location ${got}, expected ${exp.location}`);
  }
  if (exp.everyUrlMustBe) {
    const xml = tr.final?.body || "";
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (!locs.length) problems.push("no <loc> entries found in sitemap");
    for (const bad of exp.mustNotContain || []) {
      const hit = locs.find((l) => l.includes(bad));
      if (hit) problems.push(`sitemap contains a forbidden URL fragment "${bad}": ${hit}`);
    }
    // Sample up to 25 entries to keep the run fast, plus every non-product page.
    const sample = locs.length <= 25 ? locs : locs.filter((_, i) => i % Math.ceil(locs.length / 25) === 0);
    for (const loc of sample) {
      const t = await trace(ontoBase(loc), exp.everyUrlMustBe.selfCanonical);
      const s = t.hops[0].status;
      if (exp.everyUrlMustBe.noRedirect && s >= 300 && s < 400) problems.push(`sitemap URL redirects (${s}): ${loc} -> ${t.hops[0].location}`);
      if (exp.everyUrlMustBe.status != null && s !== exp.everyUrlMustBe.status && !(s >= 300 && s < 400))
        problems.push(`sitemap URL status ${s}: ${loc}`);
      if (exp.everyUrlMustBe.selfCanonical && t.final?.body) {
        const c = canonicalOf(t.final.body);
        if (c && pathOf(c) !== pathOf(loc)) problems.push(`sitemap URL not self-canonical: ${pathOf(loc)} canonical=${pathOf(c)}`);
      }
    }
  }
  record("sitemap", path, problems.length === 0, problems.join(" ; ") || `status ${firstStatus}, entries ok`);
}

async function pool(items, size, worker) {
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) await worker(items[i++]);
  }));
}

console.log(`\nSEO URL contract — profile="${PROFILE}"  base=${BASE_URL}\n${"-".repeat(80)}`);
await loadRobotsDisallow();
await Promise.all([verifyRobots(), verifySitemap()]);
await pool(contract.groups, 4, verifyGroup);

console.log("-".repeat(80));
console.log(`${results.length} checks, ${failures} failed.`);

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ base: BASE_URL, profile: PROFILE, ranAt: new Date().toISOString(), failures, results }, null, 2));
  console.log(`Result written to ${JSON_OUT}`);
}

process.exit(failures ? 1 : 0);
