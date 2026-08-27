#!/usr/bin/env node
// DI-023 — recomputes which legacy URLs still belong to WordPress vs which
// ones nginx/dunes-insolites.com.conf should already be routing to Next.js.
//
// Diffs the most recent SEO baseline crawl (docs/seo-baseline/*.json,
// scripts/seo-baseline-crawl.mjs) against the slugs Next.js actually serves
// today (frontend/lib/legacySlugs.ts's rewrites, plus the homepage and
// gallery/about rewrites hardcoded below since legacySlugs.ts only covers
// the product pages). Re-run this after every DI-022 migration batch and
// update nginx/dunes-insolites.com.conf's allowlist regex to match.
//
// Usage: node scripts/nginx-wordpress-allowlist.mjs

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASELINE_DIR = new URL("../docs/seo-baseline/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const NON_PRODUCT_NEXT_PATHS = new Set(["/", "/presentation-campement-dunes-insolites/", "/dunes-insolites-camp-gallery/"]);

function latestBaselineFile() {
  const files = readdirSync(BASELINE_DIR).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) throw new Error(`No baseline crawl found in ${BASELINE_DIR}`);
  return join(BASELINE_DIR, files[files.length - 1]);
}

async function legacyProductSlugs() {
  const mod = await import("../frontend/lib/legacySlugs.ts").catch(() => null);
  if (mod) return [...mod.LEGACY_PRODUCT_SLUGS].map((s) => `/${s}/`);
  // Fallback if ts-node/tsx isn't available to import a .ts file directly -
  // keep this list in sync with frontend/lib/legacySlugs.ts by hand.
  return [
    "/nuitee-campement-desert/",
    "/bivouac-desert-tunisie/",
    "/sandboarding-desert/",
    "/quad-desert/",
    "/bedouin-diner-sahara-tunisien/",
    "/soirees-sous-les-etoiles/",
    "/le-pain-de-sabel/",
  ];
}

const file = latestBaselineFile();
const data = JSON.parse(readFileSync(file, "utf8"));
const paths = [...new Set(data.records.map((r) => new URL(r.url).pathname))].sort();

const nextHandles = new Set([...(await legacyProductSlugs()), ...NON_PRODUCT_NEXT_PATHS]);
const stillOnWordPress = paths.filter((p) => !nextHandles.has(p));

console.log(`Baseline: ${file}`);
console.log(`${paths.length} total URLs, ${paths.length - stillOnWordPress.length} now on Next.js, ${stillOnWordPress.length} still on WordPress:\n`);
console.log(stillOnWordPress.join("\n"));
