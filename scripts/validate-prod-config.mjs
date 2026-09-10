#!/usr/bin/env node
/**
 * Production-configuration gate (production-hardening item 6).
 *
 * Static checks that a deploy-time misconfiguration cannot pass CI. This does
 * NOT need a running app — it reads the committed config files and asserts the
 * invariants the hardening work established.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const ok = [];

function read(p) {
  const f = join(root, p);
  return existsSync(f) ? readFileSync(f, "utf8") : null;
}
function check(name, cond, detail) {
  if (cond) ok.push(name);
  else problems.push(`${name} — ${detail}`);
}

// 1. Hibernate must not mutate the schema in any committed profile.
for (const p of [
  "backend/src/main/resources/application.yml",
  "backend/src/main/resources/application-staging.yml",
]) {
  const s = read(p);
  if (s == null) continue;
  const m = s.match(/ddl-auto:\s*(\w+)/);
  if (m) {
    check(`${p}: ddl-auto`, m[1] === "validate" || m[1] === "none",
      `ddl-auto is "${m[1]}" — must be "validate" (Flyway owns the schema)`);
  }
}

// 2. No literal secret values in committed config.
const SECRET_KEY = /(password|secret|client-secret|api[_-]?key|token)\s*[:=]\s*(.+)$/i;
for (const p of [
  "backend/src/main/resources/application.yml",
  "backend/src/main/resources/application-staging.yml",
  "backend/docker-compose.yml",
  "backend/docker-compose.staging.yml",
  "backend/docker-compose.backup.yml",
]) {
  const s = read(p);
  if (s == null) continue;
  s.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const m = t.match(SECRET_KEY);
    if (!m) return;
    const val = m[2].trim().replace(/["']/g, "").replace(/#.*$/, "").trim();
    // allowed: empty, a ${ENV} placeholder, or an obvious non-secret enum
    const safe =
      val === "" ||
      val === "true" ||
      val === "false" ||
      /^\$\{[^}]+\}$/.test(val) ||
      /^\$\{[^}]+:[^}]*\}$/.test(val);
    check(`${p}:${i + 1} no literal secret`, safe,
      `"${t}" assigns a literal value to a secret-shaped key`);
  });
}

// 3. The seed-fallback guard is fail-closed and DEPLOY_ENV is gone.
const api = read("frontend/lib/api.ts");
if (api != null) {
  check("frontend/lib/api.ts: no DEPLOY_ENV", !api.includes("DEPLOY_ENV"),
    "still references the removed DEPLOY_ENV flag");
  check("frontend/lib/api.ts: fail-closed guard present",
    api.includes("MisconfiguredBackendError") && api.includes("SEED_FALLBACK_ENABLED"),
    "the fail-closed seed guard is missing");
}

// 4. SEO invariant that a WordPress migration must not lose.
const nextcfg = read("frontend/next.config.ts");
if (nextcfg != null) {
  check("frontend/next.config.ts: trailingSlash", /trailingSlash:\s*true/.test(nextcfg),
    "trailingSlash is not true — every legacy URL would become a redirect");
}

// 5. Flyway migration filenames are well-formed and sequential.
const migDir = "backend/src/main/resources/db/migration";
if (existsSync(join(root, migDir))) {
  const files = readdirSync(join(root, migDir)).filter((f) => f.endsWith(".sql"));
  const versions = [];
  for (const f of files) {
    const m = f.match(/^V(\d+)__[a-z0-9_]+\.sql$/i);
    check(`migration ${f}`, !!m, "does not match V<n>__<snake_case>.sql");
    if (m) versions.push(Number(m[1]));
  }
  versions.sort((a, b) => a - b);
  const gaps = versions.filter((v, i) => i > 0 && v !== versions[i - 1] + 1);
  check("migrations: no version gaps", gaps.length === 0, `gap before V${gaps.join(", V")}`);
}

console.log(`validate-prod-config: ${ok.length} checks passed`);
if (problems.length) {
  console.error(`\nvalidate-prod-config: ${problems.length} FAILED:`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log("validate-prod-config: OK");
