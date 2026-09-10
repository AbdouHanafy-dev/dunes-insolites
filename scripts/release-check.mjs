#!/usr/bin/env node
/**
 * `npm run release:check` — the single deterministic pre-release gate.
 *
 * Runs every check that can be performed locally / in CI without a live
 * production host, and prints one verdict:
 *
 *   PASS    — every deterministic gate is green; deploy is not blocked by code
 *   FAIL    — a gate failed; fix before deploying
 *   BLOCKED — a gate could not run (e.g. Docker down for integration tests);
 *             re-run where it can, or treat as an infra-access blocker
 *
 * It never touches production and never mutates anything. Integration tests
 * (real Postgres/RabbitMQ) are opt-in with --it because they need Docker.
 *
 *   node scripts/release-check.mjs            # fast gates only
 *   node scripts/release-check.mjs --it       # + backend integration tests
 *   node scripts/release-check.mjs --json     # machine-readable summary
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const WITH_IT = process.argv.includes("--it");
const AS_JSON = process.argv.includes("--json");
const root = process.cwd();

const results = [];
function run(name, cmd, args, { blockingOnError = false, cwd = root, env = {} } = {}) {
  const started = Date.now();
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env: { ...process.env, ...env }, shell: process.platform === "win32" });
  const out = (r.stdout || "") + (r.stderr || "");
  const ms = Date.now() - started;
  let status;
  if (r.error && r.error.code === "ENOENT") status = "BLOCKED";
  else if (r.status === 0) status = "PASS";
  else status = blockingOnError && /docker|testcontainers|could not find a valid docker/i.test(out) ? "BLOCKED" : "FAIL";
  results.push({ name, status, ms, tail: out.trim().split("\n").slice(-4).join("\n") });
  const icon = status === "PASS" ? "✓" : status === "BLOCKED" ? "▲" : "✗";
  process.stdout.write(`  ${icon} ${name.padEnd(42)} ${status} (${(ms / 1000).toFixed(1)}s)\n`);
  return status;
}

// ── check: static config invariants that don't have their own script ──
function staticInvariants() {
  const problems = [];
  const appYml = existsSync("backend/src/main/resources/application.yml")
    ? readFileSync("backend/src/main/resources/application.yml", "utf8") : "";
  if (appYml && !/ddl-auto:\s*(validate|none)/.test(appYml)) problems.push("application.yml ddl-auto is not validate/none");

  // Flyway migrations: strictly increasing V-numbers, no duplicates, no gaps that skip a version.
  const migDir = "backend/src/main/resources/db/migration";
  if (existsSync(migDir)) {
    const versions = readdirSync(migDir)
      .filter((f) => /^V\d+__/.test(f))
      .map((f) => Number(f.match(/^V(\d+)__/)[1]))
      .sort((a, b) => a - b);
    const dupes = versions.filter((v, i) => versions.indexOf(v) !== i);
    if (dupes.length) problems.push(`duplicate Flyway version(s): ${[...new Set(dupes)].join(", ")}`);
    for (let i = 1; i < versions.length; i++) {
      if (versions[i] !== versions[i - 1] + 1) problems.push(`Flyway version gap: V${versions[i - 1]} -> V${versions[i]}`);
    }
  }

  // No production seed fallback forced on by a real assignment (the
  // fail-closed build gate below is the authoritative check; this catches a
  // literal override slipped into config).
  const apiTs = existsSync("frontend/lib/api.ts") ? readFileSync("frontend/lib/api.ts", "utf8") : "";
  if (apiTs && /^\s*(?:const|let|var|export\s+const)\s+\w*SEED\w*\s*=\s*(?:true|["']true["'])/m.test(apiTs)) {
    problems.push("frontend/lib/api.ts force-enables a seed fallback via a literal assignment");
  }

  results.push({ name: "static invariants", status: problems.length ? "FAIL" : "PASS", ms: 0, tail: problems.join("\n") });
  const icon = problems.length ? "✗" : "✓";
  process.stdout.write(`  ${icon} ${"static invariants".padEnd(42)} ${problems.length ? "FAIL" : "PASS"}\n`);
  if (problems.length) for (const p of problems) process.stdout.write(`      - ${p}\n`);
}

// ── check: latest DB backup is fresh (only if a backups dir exists) ──
function backupFreshness() {
  const dir = process.env.BACKUP_DIR || "backups/postgres";
  if (!existsSync(dir)) {
    results.push({ name: "backup freshness", status: "BLOCKED", ms: 0, tail: `no ${dir} on this machine (check on the DB host)` });
    process.stdout.write(`  ▲ ${"backup freshness".padEnd(42)} BLOCKED (no local backups dir)\n`);
    return;
  }
  const dumps = readdirSync(dir).filter((f) => f.endsWith(".dump"));
  if (!dumps.length) { results.push({ name: "backup freshness", status: "FAIL", ms: 0, tail: "no .dump files" }); process.stdout.write(`  ✗ ${"backup freshness".padEnd(42)} FAIL (no dumps)\n`); return; }
  const newest = Math.max(...dumps.map((f) => statSync(join(dir, f)).mtimeMs));
  const ageH = (Date.now() - newest) / 3.6e6;
  const maxH = Number(process.env.BACKUP_MAX_AGE_HOURS || 26);
  const ok = ageH <= maxH;
  results.push({ name: "backup freshness", status: ok ? "PASS" : "FAIL", ms: 0, tail: `newest dump is ${ageH.toFixed(1)}h old (max ${maxH}h)` });
  process.stdout.write(`  ${ok ? "✓" : "✗"} ${"backup freshness".padEnd(42)} ${ok ? "PASS" : "FAIL"} (${ageH.toFixed(1)}h old)\n`);
}

console.log(`\nrelease:check — ${new Date().toISOString()}\n${"-".repeat(64)}`);

staticInvariants();
run("secret scan", "node", ["scripts/scan-secrets.mjs"]);
run("production config", "node", ["scripts/validate-prod-config.mjs"]);
run("typecheck", "npm", ["run", "typecheck"]);
run("lint", "npm", ["run", "lint"]);
run("web tests (frontend + admin)", "npm", ["run", "test:web"]);
run("backend unit tests", "npm", ["run", "backend:test:unit"]);
{
  // A production build with no NEXT_PUBLIC_API_URL and no seed opt-in MUST
  // fail (DI-031). We run it quietly and invert: build-fails => gate PASSES.
  process.stdout.write(`  · running fail-closed build check (this build is expected to fail)…\n`);
  const started = Date.now();
  const r = spawnSync("npm", ["run", "build", "--workspace", "frontend"], {
    cwd: root, encoding: "utf8", shell: process.platform === "win32",
    env: { ...process.env, NEXT_PUBLIC_API_URL: "", ALLOW_SEED_FALLBACK: "", NEXT_PUBLIC_ALLOW_SEED_FALLBACK: "", DEPLOY_ENV: "production" },
  });
  const buildFailedAsExpected = r.status !== 0;
  const status = buildFailedAsExpected ? "PASS" : "FAIL";
  results.push({ name: "frontend fails closed w/o API url", status, ms: Date.now() - started,
    tail: buildFailedAsExpected ? "" : "the production build SUCCEEDED with no API url — it must fail closed" });
  process.stdout.write(`  ${status === "PASS" ? "✓" : "✗"} ${"frontend fails closed w/o API url".padEnd(42)} ${status}\n`);
}
backupFreshness();

if (WITH_IT) {
  run("backend integration tests", "npm", ["run", "backend:test:it"], { blockingOnError: true });
} else {
  results.push({ name: "backend integration tests", status: "BLOCKED", ms: 0, tail: "skipped — pass --it (needs Docker)" });
  process.stdout.write(`  ▲ ${"backend integration tests".padEnd(42)} BLOCKED (run with --it)\n`);
}

const fails = results.filter((r) => r.status === "FAIL");
const blocked = results.filter((r) => r.status === "BLOCKED");
const verdict = fails.length ? "FAIL" : blocked.length ? "BLOCKED" : "PASS";

console.log("-".repeat(64));
if (fails.length) {
  console.log(`\nFAILED gates:`);
  for (const f of fails) console.log(`  ✗ ${f.name}\n${f.tail.split("\n").map((l) => "      " + l).join("\n")}`);
}
if (blocked.length) {
  console.log(`\nBLOCKED gates (re-run where possible):`);
  for (const b of blocked) console.log(`  ▲ ${b.name} — ${b.tail.split("\n")[0]}`);
}
console.log(`\nRELEASE CHECK: ${verdict}`);
console.log(verdict === "PASS"
  ? "  Every deterministic gate is green. Deployment is not blocked by code."
  : verdict === "BLOCKED"
  ? "  No gate failed, but some could not run. Resolve the blockers or run them elsewhere (e.g. CI with Docker)."
  : "  Fix the failed gates before deploying.");

if (AS_JSON) console.log("\n" + JSON.stringify({ verdict, results: results.map(({ name, status, ms }) => ({ name, status, ms })) }, null, 2));

process.exit(verdict === "FAIL" ? 1 : verdict === "BLOCKED" ? 2 : 0);
