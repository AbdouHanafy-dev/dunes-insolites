# -*- coding: utf-8 -*-
"""
DI-024 — real 301 redirects for the legacy WordPress URLs that have no
equivalent content in the new Next.js vitrine, derived from the actual
crawl in docs/seo-baseline/20260826T084416Z.json (63 real URLs, not a
guess). Creates rows in the Redirect collection (backend/.../model/
Redirect.java) via the real /api/redirects endpoint — the same table
frontend/middleware.ts already reads at request time, so these take
effect the moment this script runs, no deploy needed.

What this deliberately does NOT cover, and why:

- Blog/informational URLs (are-there-any-deserts-in-tunisia, blog-desert,
  guide-excursions-desert-tunisien, meteo-dans-le-desert-tunisien-...,
  quand-visiter-le-desert-tunisien, and ~11 more like them) — that content
  stays on WordPress behind the nginx split (DI-023), it is not migrating
  into this app at all. Redirecting it here would fight DI-023's routing.
- WordPress category archives (/category/*) and Templately builder pages
  (?templately_library=...) — theme/taxonomy internals, not real indexed
  content the SEO plan counts among the 53.
- panier/, review/, detail-service/ — no equivalent page exists and none
  was invented; these are left unmapped rather than guessed at. Revisit
  if any of them turns out to carry real backlinks/ranking worth saving.

The 13 legacy circuit URLs (Ksar Ghilane, Tataouine/Chenini, Douz-Matmata,
4x4, the 2/3/4/6-day excursions) all point at /circuits — a real "coming
soon" page (frontend/app/[locale]/circuits/page.tsx), not a 404 and not
the homepage (CLAUDE.md: never 301 to homepage) and not a placeholder
route to a product that doesn't exist. See docs/OPEN-QUESTIONS.md Q6:
these stay on dunes-insolites.com until Route Insolite (R4) actually
ships a real destination.

Run once against the real running backend:

    python scripts/seed-legacy-redirects.py

Not idempotent — Redirect.fromPath is unique, so a second run 409s on
every row it already created and just logs it, same pattern as
seed-cms-pages.py.
"""
import json
import urllib.request
import urllib.error

BACKEND = "http://127.0.0.1:8099/api"

# (from legacy path, to path) — every "from" is trailingSlash-style,
# matching frontend/next.config.ts's trailingSlash: true.
REDIRECTS = [
    # Multi-day circuits — Route Insolite's product, not launched yet (Q6).
    ("/6-jours-excursion-desert-tunisien/", "/circuits/"),
    ("/circuit-4-jours-desert-tunisien-djerba-tataouine-tozeur/", "/circuits/"),
    ("/circuit-tataouine-et-chenini-au-depart-de-djerba/", "/circuits/"),
    ("/day-trip-desert-douz-and-matmata/", "/circuits/"),
    ("/desert-3-jour/", "/circuits/"),
    ("/excursion-2-jours-desert-tunisien/", "/circuits/"),
    ("/excursion-desert-tunisie-2-jours/", "/circuits/"),
    ("/excursion-dune-journee-a-ksar-ghilane/", "/circuits/"),
    ("/excursion-tataouine-chenini-desert-tunisie-star-wars/", "/circuits/"),
    ("/immersion-saharienne-2-nuits-daventure-en-camp-et-bivouac/", "/circuits/"),
    ("/ksar-ghilane-desert-tunisia/", "/circuits/"),
    ("/tour-desert-tunisia/", "/circuits/"),
    ("/tunisie-sahara-en-4x4/", "/circuits/"),
    # Near-duplicate "a night in the desert" landing pages — same topic as
    # the two pages DI-022 already rewrites (nuitee-campement-desert,
    # bivouac-desert-tunisie), just a different WordPress URL for it.
    ("/nuit-desert-tunisien-dunes-insolites/", "/nuitee-campement-desert/"),
    ("/bivouac-desert-tunisien-sahara/", "/bivouac-desert-tunisie/"),
    ("/spend-a-night-in-the-tunisian-desert-at-dunes-insolites-camp/", "/nuitee-campement-desert/"),
    # WooCommerce/theme service hub pages.
    ("/services/", "/activities/"),
    ("/services/activites/", "/activities/"),
    ("/services/sejours/", "/camp/"),
    ("/services/tours/", "/circuits/"),
    # Account/booking pages — new site's real equivalents.
    ("/mes-reservations/", "/bookings/"),
    ("/mon-compte/", "/account/"),
    ("/mot-de-passe-oublie/", "/login/"),
    # Standalone landing page — closest real equivalent is About.
    ("/dunes-insolites-sabria-evasion-sahara/", "/about/"),
]


def req(method, path, token=None, body=None):
    url = f"{BACKEND}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, (json.loads(raw) if raw else {"error": str(e)})


def login():
    status, data = req("POST", "/auth/login", body={
        "email": "testadmin@dunes.local", "password": "AdminPass1!",
    })
    assert status == 200, f"login failed: {status} {data}"
    return data["accessToken"]


def main():
    token = login()
    created, skipped = 0, 0
    for from_path, to_path in REDIRECTS:
        status, data = req("POST", "/redirects", token=token, body={
            "fromPath": from_path, "toPath": to_path, "statusCode": 301,
        })
        if status == 201:
            created += 1
            print(f"created  {from_path} -> {to_path}")
        else:
            skipped += 1
            print(f"skipped  {from_path} -> {to_path}  ({status}: {data.get('message', data)})")
    print(f"\n{created} created, {skipped} skipped (of {len(REDIRECTS)} total).")


if __name__ == "__main__":
    main()
