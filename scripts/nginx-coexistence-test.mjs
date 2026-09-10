#!/usr/bin/env node
/**
 * Phase 6 — local, reproducible proof that nginx/dunes-insolites.com.conf
 * routes WordPress URLs to WordPress and new URLs to Next.js, and that adding
 * a Next.js route cannot silently steal a ranked WordPress URL.
 *
 * Runs the REAL repo nginx config in a throwaway `nginx:stable` container
 * (self-signed cert), with:
 *   - next_app   -> a Next.js server you have running on host :3000
 *   - wordpress  -> a stub that answers 200 "WORDPRESS" for anything
 * then asserts each routing category. Read-only; tears the container down.
 *
 * Prereqs: Docker, and a Next.js server on http://localhost:3000
 *   (ALLOW_SEED_FALLBACK=true npm run start --workspace frontend  — or  npm run dev).
 *
 * Usage:  node scripts/nginx-coexistence-test.mjs
 */
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const CONF = "nginx/dunes-insolites.com.conf";
const CTN = "dunes-nginx-coexist";
const HTTPS_PORT = 18443;
const WP_PORT = 18081;
const FRONTEND = "http://localhost:3000";

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", ...opts }).trim();
}
function quiet(cmd) { try { sh(cmd); } catch { /* ignore */ } }

// 0. sanity
try { sh("docker version"); } catch { console.error("Docker is required."); process.exit(2); }
{
  let ok = false;
  const r = spawnSync("curl", ["-s", "-w", "\\n%{http_code}", "--max-time", "8", `${FRONTEND}/`], { encoding: "utf8" });
  ok = /[23]\d\d\s*$/.test(r.stdout || "");
  if (!ok) {
    console.error(`No Next.js server on ${FRONTEND} (curl: ${r.status} "${(r.stdout || "").trim()}"). Start one first:\n  ALLOW_SEED_FALLBACK=true npm run start --workspace frontend`);
    process.exit(2);
  }
}

// Under the repo, not the OS tmp dir: Docker Desktop only mounts paths it
// shares, and the repo working dir is already known-good (nginx/README.md).
const work = mkdtempSync(join(process.cwd(), ".nginx-coexist-"));
let failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? "  ok  " : "FAIL  "}${name.padEnd(58)} ${detail || ""}`);
  if (!ok) failures++;
};

try {
  // 1. a tiny WordPress stub (nginx returning a fixed body for everything)
  writeFileSync(join(work, "wp.conf"), `server { listen ${WP_PORT}; location / { add_header Content-Type text/plain; return 200 "WORDPRESS $request_uri"; } }`);
  quiet(`docker rm -f ${CTN}`);

  // 2. bring up the real config in a container
  writeFileSync(join(work, "boot.sh"), [
    "#!/bin/sh",
    "set -e",
    "rm -f /etc/nginx/conf.d/default.conf",
    "cp /tmp/src.conf /etc/nginx/conf.d/dunes.conf",
    "cp /tmp/wp.conf /etc/nginx/conf.d/wp-stub.conf",
    "sed -i 's#server 127.0.0.1:3000;#server host.docker.internal:3000;#' /etc/nginx/conf.d/dunes.conf",
    `sed -i 's#server 127.0.0.1:8081;#server 127.0.0.1:${WP_PORT};#' /etc/nginx/conf.d/dunes.conf`,
    "mkdir -p /etc/letsencrypt/live/dunes-insolites.com",
    "openssl req -x509 -newkey rsa:2048 -nodes -keyout /etc/letsencrypt/live/dunes-insolites.com/privkey.pem -out /etc/letsencrypt/live/dunes-insolites.com/fullchain.pem -days 1 -subj '/CN=www.dunes-insolites.com' 2>/dev/null",
    // Anchor to the indented directive lines (4-space indent) only — a looser
    // pattern also uncomments the word "ssl_certificate" in the header comment.
    "sed -i 's|^    # ssl_certificate|    ssl_certificate|' /etc/nginx/conf.d/dunes.conf",
    "nginx -t",
    "exec nginx -g 'daemon off;'",
    "",
  ].join("\n"));

  sh(`docker run -d --name ${CTN} --add-host=host.docker.internal:host-gateway ` +
    `-v "${process.cwd()}/${CONF}:/tmp/src.conf:ro" -v "${work}/wp.conf:/tmp/wp.conf:ro" -v "${work}/boot.sh:/tmp/boot.sh:ro" ` +
    `-p ${HTTPS_PORT}:443 nginx:stable sh /tmp/boot.sh`,
    { env: { ...process.env, MSYS_NO_PATHCONV: "1" } });

  // wait for readiness
  let up = false;
  for (let i = 0; i < 20; i++) {
    try { sh(`docker exec ${CTN} curl -sk -o /dev/null https://127.0.0.1/ -H "Host: www.dunes-insolites.com"`); up = true; break; } catch { spawnSync(process.execPath, ["-e", "setTimeout(()=>process.exit(0), 1000)"]); }
  }
  check("nginx -t (real repo config parses)", up, up ? "" : "container never became ready — see: docker logs " + CTN);
  if (!up) { console.log(sh(`docker logs ${CTN}`).slice(-2000)); process.exit(1); }

  const probe = (path) => {
    const out = sh(`docker exec ${CTN} curl -sk -o /dev/null -w "%{http_code}|%{redirect_url}" --max-redirs 0 -H "Host: www.dunes-insolites.com" "https://127.0.0.1${path}"`);
    const [code, loc] = out.split("|");
    const body = sh(`docker exec ${CTN} curl -sk --max-redirs 0 -H "Host: www.dunes-insolites.com" "https://127.0.0.1${path}"`).slice(0, 40);
    return { code: Number(code), loc, body };
  };

  // 3. routing categories
  const wp1 = probe("/blog-desert/");
  check("ranked WordPress URL -> WordPress", wp1.body.startsWith("WORDPRESS"), `${wp1.code} body="${wp1.body}"`);

  const wp2 = probe("/category/sabria/");
  check("WordPress taxonomy URL -> WordPress", wp2.body.startsWith("WORDPRESS"), `${wp2.code}`);

  const wp3 = probe("/panier/");
  check("unmapped legacy URL -> WordPress (fail-safe)", wp3.body.startsWith("WORDPRESS"), `${wp3.code}`);

  const next1 = probe("/nuitee-campement-desert/");
  check("legacy product slug -> Next.js (not WordPress)", !next1.body.startsWith("WORDPRESS") && (next1.code === 200), `${next1.code}`);

  const next2 = probe("/faq/");
  check("new app route /faq/ -> Next.js", !next2.body.startsWith("WORDPRESS") && next2.code === 200, `${next2.code}`);

  const next3 = probe("/ksar-ghilane-desert-tunisia/");
  check("DI-024 legacy circuit URL -> Next.js (for the 301)", !next3.body.startsWith("WORDPRESS"), `${next3.code} loc=${next3.loc}`);

  const api = probe("/api/health");
  check("/api/* -> Next.js (BFF), never WordPress", !api.body.startsWith("WORDPRESS"), `${api.code}`);

  const home = probe("/");
  check("/ -> Next.js homepage", !home.body.startsWith("WORDPRESS") && home.code === 200, `${home.code}`);

  const nextAssets = probe("/_next/static/anything");
  check("/_next/* -> Next.js", !nextAssets.body.startsWith("WORDPRESS"), `${nextAssets.code}`);

  const robots = probe("/robots.txt");
  check("/robots.txt -> Next.js", !robots.body.startsWith("WORDPRESS"), `${robots.code}`);

  const sm = probe("/sitemap.xml");
  check("/sitemap.xml -> Next.js", !sm.body.startsWith("WORDPRESS"), `${sm.code}`);

  // locale-prefixed routes (the multi-language rollout — all 6 locales are in
  // app/sitemap.ts). None is a ranked WordPress URL (baseline crawl is 100%
  // unprefixed French), but they must still reach Next.js, not a WP 404.
  const lp1 = probe("/en/about/");
  check("/en/about/ (locale-prefixed) -> Next.js", !lp1.body.startsWith("WORDPRESS"), `${lp1.code}`);
  const lp2 = probe("/de/quad-desert/");
  check("/de/quad-desert/ (locale-prefixed legacy slug) -> Next.js", !lp2.body.startsWith("WORDPRESS"), `${lp2.code}`);
  const lp3 = probe("/ar/faq/");
  check("/ar/faq/ (RTL locale) -> Next.js", !lp3.body.startsWith("WORDPRESS"), `${lp3.code}`);

  // 4. the load-bearing property: a NEW next route must not steal a WP URL
  //    (i.e. /blog-desert/ is NOT in any allowlist regex -> must hit WordPress)
  check("adding Next routes cannot intercept an un-allowlisted WP URL",
    probe("/blog-sahara-tunisie/").body.startsWith("WORDPRESS") &&
    probe("/are-there-any-deserts-in-tunisia/").body.startsWith("WORDPRESS"), "");

  console.log("-".repeat(72));
  console.log(`${failures === 0 ? "PASS" : "FAIL"} — ${failures} failed`);
} finally {
  quiet(`docker rm -f ${CTN}`);
  rmSync(work, { recursive: true, force: true });
}

process.exit(failures ? 1 : 0);
