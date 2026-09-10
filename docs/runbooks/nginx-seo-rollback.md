# Runbook — nginx / SEO rollback

**Purpose:** get `www.dunes-insolites.com` back to **100 % WordPress** with one
controlled change, fast, if the strangler split (Stage 1, Phase 7) regresses a
ranked URL.

**Status of this runbook:** the *procedure* is written and the *mechanism* is
proven locally (`scripts/nginx-coexistence-test.mjs`, 16/16). It has **NOT** been
executed against the real production host — see "Not yet verified" at the end.

---

## Current state (before Phase 7)

```
Cloudflare ──▶ origin nginx ──▶ WordPress (Yoast)        [100% WordPress today]
                             └▶ Next.js  (NOT DEPLOYED)
```

- `www.dunes-insolites.com` is behind **Cloudflare** (proxied DNS).
- The origin host runs WordPress. `nginx -t` and the routing logic of
  `nginx/dunes-insolites.com.conf` are verified in a container, but its 3
  `TODO`s (real `next_app` host/port, real `wordpress` host/port, real TLS
  paths) need the server and are open. The repo does **not** know whether this
  file is the live origin config.

## Target state at Stage 1 (what Phase 7 deploys)

```
Cloudflare ──▶ origin nginx (dunes-insolites.com.conf) ──▶ Next.js   (allowlisted paths only)
                                                        └▶ WordPress (everything else — the default)
```

## Rollback state

```
Cloudflare ──▶ origin nginx (previous known-good) ──▶ WordPress   (everything)
```

WordPress is untouched throughout — it keeps serving every ranked URL. Rollback
only removes the Next.js allowlist.

---

## Rollback mechanism — a single symlink/include swap

Deploy the split config as an **include**, never by editing the live vhost in
place, so rollback is one atomic swap:

```
/etc/nginx/sites-available/
    dunes-insolites.wordpress-only.conf      # the pre-Phase-7 config, kept verbatim
    dunes-insolites.split.conf               # = nginx/dunes-insolites.com.conf with the 3 TODOs filled
/etc/nginx/sites-enabled/
    dunes-insolites.conf -> ../sites-available/dunes-insolites.split.conf
```

**Forward (Phase 7 Stage 1):**
```bash
ln -sfn ../sites-available/dunes-insolites.split.conf /etc/nginx/sites-enabled/dunes-insolites.conf
nginx -t && systemctl reload nginx
```

**Rollback (this runbook):**
```bash
ln -sfn ../sites-available/dunes-insolites.wordpress-only.conf /etc/nginx/sites-enabled/dunes-insolites.conf
nginx -t && systemctl reload nginx
```

`reload` (not `restart`) = zero dropped connections, no downtime.

---

## Rollback procedure (step by step)

| # | Step | Command / check | Expected |
|---|---|---|---|
| 1 | **Record the trigger** | note which URL(s) regressed + the post-cutover crawl diff (`scripts/seo-baseline-crawl.mjs`) | a specific URL list, not "SEO looks off" |
| 2 | **Identify the active config** | `readlink /etc/nginx/sites-enabled/dunes-insolites.conf` | `...split.conf` |
| 3 | **Swap to WordPress-only** | `ln -sfn ../sites-available/dunes-insolites.wordpress-only.conf /etc/nginx/sites-enabled/dunes-insolites.conf` | — |
| 4 | **Validate syntax** | `nginx -t` | `syntax is ok` / `test is successful` |
| 5 | **Reload** | `systemctl reload nginx` (or `nginx -s reload`) | no error, `systemctl status nginx` active |
| 6 | **Purge Cloudflare cache** | Cloudflare dashboard → Caching → Purge Everything (or API); the HTML is `cf-cache-status: DYNAMIC` today so this is belt-and-braces for redirects | purge accepted |
| 7 | **Smoke-test critical URLs** | `BASE_URL=https://www.dunes-insolites.com SEO_PROFILE=wordpress node scripts/verify-production-urls.mjs` | **0 failed** (62 checks) |
| 8 | **Verify ranked WordPress URLs** | spot-check 5+ from `docs/seo-baseline/20260826T084416Z.json` — expect 200, self-canonical | all 200 |
| 9 | **Verify the previously-regressed URL(s)** | `curl -sI` each one from step 1 | back to the baseline status |
| 10 | **Verify booking still reachable** (if the split had gone live) | `/api/health` via the site; WordPress `/panier/` etc. 200 | as before cutover |
| 11 | **Verify 301s** | `http://…` → `https://www.…`; `https://dunes-insolites.com/` → `https://www.…/` | 301, correct target |
| 12 | **Verify canonical + hreflang unaffected** | pick 3 ranked URLs, confirm `<link rel=canonical>` = self, no rogue hreflang | unchanged from baseline |
| 13 | **Record the result** | append to `docs/seo-baseline/rollback-drills.md`: timestamp, trigger, who, `verify:seo` output, time-to-recover | done |

**Target time to recover: < 15 minutes** (steps 3–9). Google's "roll back within
the hour" bar (ROADMAP §349) is met with margin.

---

## What rollback does NOT fix

- **Cloudflare-level** redirects/rules (if Phase 7 adds any there) — those must
  be reverted in the Cloudflare dashboard separately. Keep a screenshot of the
  Cloudflare Rules/Page Rules **before** Stage 1.
- **DNS changes** — this runbook assumes DNS is unchanged. If Stage 1 moves DNS,
  rollback also means reverting the DNS record (longer TTL exposure).
- **Search Console sitemap** — if `/sitemap.xml` was resubmitted, the old
  `/sitemap_index.xml` submission is still valid as long as WordPress serves it;
  no action needed on rollback.
- **Already-served 301s** — a browser/proxy that cached a 301 from the split
  keeps it until its own cache expires. This is why every migration 301 must be
  correct *before* Stage 1, and why the split is deployed path-by-path.

---

## Not yet verified (launch blockers for Phase 7, not Phase 6)

- [ ] The `wordpress-only.conf` baseline exists on the server and is byte-for-byte the current live config — **requires server access**.
- [ ] `next_app` / `wordpress` upstream addresses and TLS paths filled in and `nginx -t` passes **on the server**.
- [ ] The include/symlink layout above matches how the server actually loads vhosts.
- [ ] Cloudflare: whether the split happens at the origin (this config) or partly in Cloudflare rules — **D-4 in phase6-url-inventory.md**.
- [ ] A real rollback drill executed against a staging origin (or a maintenance-window drill on production), with `verify:seo` before/after.
