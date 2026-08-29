# -*- coding: utf-8 -*-
"""
Populates the Navigation collection with the site's real menu — transferred
from frontend/lib/site.ts's `nav` array (already live, hardcoded into
Header.tsx's fallback) and frontend/messages/*.json's `nav` namespace
(already-translated, already-shipped labels), not invented. 6 items x 6
locales = 36 real NavigationItem rows.

Once these exist, Header.tsx's own logic (frontend/app/[locale]/layout.tsx)
prefers this CMS-managed navigation over the hardcoded fallback — see
docs/cms.md's Navigation section. Run once; NavigationItem has no unique
constraint, so a second run creates duplicates.

Requires the local backend running and testadmin@dunes.local / AdminPass1!
to exist.

    python scripts/seed-navigation.py
"""
import json
import sys
import urllib.request
import urllib.error

# Windows' console defaults to a codepage (cp1252) that can't print Arabic/
# non-Latin script — real data was fine either way (this only affects the
# progress log, not what got POSTed), but a crash here mid-loop stops the
# remaining requests before they even fire. Hit this the hard way on the
# first real run (fr/en/de/it/da completed, ar died after its first row).
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BACKEND = "http://127.0.0.1:8099/api"
LOCALES = ["fr", "en", "de", "it", "da", "ar"]
LOCALE_ENUM = {"fr": "FR", "en": "EN", "de": "DE", "it": "IT", "da": "DA", "ar": "AR"}

# (labelKey in nav.*, href, menuType) — order and hrefs straight from
# frontend/lib/site.ts's DUNES_INSOLITES.nav.
NAV_ITEMS = [
    ("theCamp", "/about", "NONE"),
    ("experiences", "/activities", "EXPERIENCES"),
    ("stay", "/camp", "STAYS"),
    ("gallery", "/gallery", "NONE"),
    ("safety", "/safety", "NONE"),
    ("contact", "/contact", "NONE"),
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
    messages = {loc: json.load(open(f"frontend/messages/{loc}.json", encoding="utf-8")) for loc in LOCALES}

    created, skipped = 0, 0
    for loc in LOCALES:
        nav_labels = messages[loc]["nav"]
        for order, (key, href, menu_type) in enumerate(NAV_ITEMS):
            label = nav_labels[key]
            status, data = req("POST", "/navigation", token=token, body={
                "label": label, "url": href, "locale": LOCALE_ENUM[loc],
                "companyType": "DUNES_INSOLITES", "displayOrder": order, "menuType": menu_type,
            })
            if status == 201:
                created += 1
                print(f"created  [{loc}] {label} -> {href}")
            else:
                skipped += 1
                print(f"skipped  [{loc}] {label}  ({status}: {data})")

    print(f"\n{created} created, {skipped} skipped (of {len(LOCALES) * len(NAV_ITEMS)} total).")


if __name__ == "__main__":
    main()
