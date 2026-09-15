# SEO cutover (Part B) — readiness plan, not an execution

**Date:** 15 September 2026. **Status: prepared, NOT executed.** Nothing in
this document has been run. This exists so the actual cutover — when the
owner explicitly says go — is a fast, well-understood 2-record change instead
of a live decision made under pressure.

---

## 1. What changed today

**M-7 is resolved.** The owner now has verified write access to the real
`dunes-insolites.com` Cloudflare zone (confirmed live: added and read back a
test comment on a DNS record, no error; `DNS Setup: Full` confirms Cloudflare
is authoritative for this zone). That closes the governance blocker that had
this whole cutover on hold. See `docs/reports/security-assessment-2026-09-10.md`.

**This does not mean the cutover is ready to run today.** See §3.

---

## 2. Current real architecture (verified, not assumed)

```
dunes-insolites.com   (the ranked domain, WITH hyphen)
  → Cloudflare (proxied, DNS Setup: Full)
  → origin: cPanel host (185.7.33.81 / 196.203.63.105)
  → WordPress + Yoast SEO — 100% of traffic, 53–63 indexed FR URLs, untouched

dunesinsolites.com    (the staging domain, NO hyphen)
  → nginx on the Contabo VPS (79.143.185.33)
  → dunes-v2-frontend (the new Next.js vitrine) — this app is what would
    replace WordPress, once cut over
```

Two separate, unrelated infrastructures. The cutover is a DNS change on the
**first** domain, pointing it at the **second**'s server.

**Note on prior planning:** an earlier phase (`docs/reports/phase6-nginx-seo.md`,
`docs/runbooks/nginx-seo-rollback.md`) planned a different mechanism — an
nginx *strangler* split running on the WordPress origin host itself, gradually
routing individual paths to Next.js on the same server. That plan predates the
Contabo VPS existing. It is **superseded**, not current: the actual build now
lives on a separate server, so the real cutover is a plain DNS switch (§4),
not an nginx path-routing split. Flagging this so the two documents aren't
followed as if they describe the same plan.

---

## 3. Why this isn't ready to execute yet — the real blockers

1. **The visual redesign from this week is not deployed anywhere except this
   machine.** Every change made in this session (new palette, restructured
   Stays/Activities/Experience/BookDirect/CTA, the Location module, the font
   consolidation, the gallery card treatment) exists only in local dev
   servers (`localhost:3000`/`:3100`) and uncommitted/unpushed working-tree
   changes. `dunes-v2-frontend` on the VPS is still running the **pre-redesign**
   build. Cutting DNS over to it today would put WordPress's 53 ranked pages
   behind the *old*, not the new, vitrine.
2. **`verify:seo` has not been re-run against the new build.** The last real
   pass (Phase 6, 2 Sep) was 60/60 against production WordPress — it has
   never been run against the new Next.js app with real content, and never
   with this week's redesign.
3. **The redirect map and legacy-slug handling need re-confirming** against
   whatever's actually deployed — `docs/seo/redirect-map.csv` (63 rows) and
   the two open content decisions (D-1: `/presentation-campement-dunes-insolites/`
   + `/dunes-insolites-camp-gallery/` canonical target; D-2: `/panier/`,
   `/review/`, `/detail-service/` have no mapped target) were never resolved.
   Guessing at either is explicitly against the rules — they need the owner's
   call, not mine.
4. **No rollback drill has been run against the real domain.** The mechanism
   is proven in a local Docker test (16/16), never against
   `dunes-insolites.com` itself.

None of these are hard — they're sequencing. Doing the DNS swap before them
is the actual risk, not the DNS edit itself.

---

## 4. The cutover, exactly, once §3 is clear

Two records, on `dunes-insolites.com`, in Cloudflare:

| Record | Current | New |
|---|---|---|
| `dunes-insolites.com` (A, `@`) | `185.7.33.81` | `79.143.185.33` |
| `www.dunes-insolites.com` (CNAME) | `dunes-insolites.com` | `dunes-insolites.com` *(unchanged — resolves through the new `@` automatically)* |

Everything else in the zone (MX, the cPanel-service A records, TXT/SPF/DKIM,
the new DMARC record) stays untouched — mail keeps flowing through the
existing host regardless of where the web traffic points.

**Rollback:** revert the one `@` A-record value back to `185.7.81.81`.
Propagation is immediate on Cloudflare's own proxy (no TTL wait the way a
non-proxied record would have) — this is the "30-second rollback" referenced
elsewhere.

**Pre-flight checklist, to run immediately before flipping the record — not before:**
- [ ] This week's redesign is built, deployed to `dunes-v2-frontend`, and
      spot-checked on `dunesinsolites.com` (the safe staging domain).
- [ ] `certbot` has issued a real cert for `www.dunesinsolites.com` on the VPS
      (currently HTTP-only per earlier notes — needs to be done before any
      real domain points at it over HTTPS).
- [ ] `npm run verify:seo` run against the staging domain, `SEO_PROFILE=nextjs`
      — real pass, not assumed.
- [ ] D-1 and D-2 have an owner decision, not a guess.
- [ ] The owner has explicitly said to execute the cutover — not just
      confirmed Cloudflare access.

---

## 5. What this document is not

It is not permission to execute. Nothing here should be run without a
separate, explicit "do the cutover now" from the owner — confirming
Cloudflare access (done, 15 Sep) is a different decision from cutting a
ranked domain's traffic over.
