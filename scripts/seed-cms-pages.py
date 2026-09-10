# -*- coding: utf-8 -*-
"""
Populates the CMS Pages collection with real content transferred from
frontend/messages/*.json — the same already-translated, already-verified
text, not retranslated. Creates + publishes 5 pages x 6 locales = 30 Page
records against the real running backend.

Run once against a fresh/empty `pages` table — a one-time content
migration, not idempotent. Re-running it against a database that already
has these pages creates duplicates (PageSlugConflictException per row, one
POST at a time, since (slug, locale, companyType) is unique — the script
just logs the failure and moves on rather than upserting). See
docs/cms.md §9 for what each page's block structure is meant to look like.

Requires: the local backend running (npm run backend:run, or the
`local` Spring profile — see CLAUDE.md/ARCHITECTURE.md §10.6) and a
testadmin@dunes.local / AdminPass1! ADMIN account to exist already.

    python scripts/seed-cms-pages.py
"""
import json
import os
import urllib.request
import urllib.error

BACKEND = "http://127.0.0.1:8099/api"
MESSAGES_DIR = "c:/Users/abdou/OneDrive/Bureau/dunes-insolites/frontend/messages"
LOCALES = ["fr", "en", "de", "it", "da", "ar"]
LOCALE_ENUM = {"fr": "FR", "en": "EN", "de": "DE", "it": "IT", "da": "DA", "ar": "AR"}

SITE = {
    "legalName": "Sabria Desert Adventures",
    "address": "Sabria, Kebili Governorate, Tunisia",
    "email": "hello@dunes-insolites.tn",
    "phone": "+216 27 391 501",
}


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
        "email": os.environ.get("SEED_ADMIN_EMAIL", "testadmin@dunes.local"), "password": os.environ.get("SEED_ADMIN_PASSWORD", "AdminPass1!"),
    })
    assert status == 200, f"login failed: {status} {data}"
    return data["accessToken"]


def block(type_, **data):
    return {"type": type_, "dataJson": json.dumps(data, ensure_ascii=False)}


def rich(heading, content):
    return block("richText", heading=heading, content=content)


def build_legal_privacy(m):
    p = m["legal"]["privacy"]
    blocks = [
        rich("", p["updated"]),
        rich(p["collectHeading"], p["collectP1"] + "\n\n" + p["collectP2"]),
        rich(p["whyHeading"], "\n".join(f"- {p[k]}" for k in ["why1", "why2", "why3", "why4"])),
        rich(p["whoHeading"], p["whoP"]),
        rich(p["keepHeading"], p["keepP"]),
        rich(p["rightsHeading"], p["rightsPre"] + SITE["email"] + p["rightsPost"]),
        rich(p["cookiesHeading"], p["cookiesP"]),
        rich(p["contactHeading"],
             f"{SITE['legalName']}, {SITE['address']}. {SITE['email']} / {SITE['phone']}."),
    ]
    seo = m["meta"]["legalPrivacy"]
    return {"title": p["title"], "slug": "legal-privacy", "blocks": blocks, "seo": seo}


def build_legal_terms(m):
    p = m["legal"]["terms"]
    blocks = [
        rich("", p["updated"]),
        rich(p["bookingHeading"], p["bookingP"]),
        rich(p["paymentHeading"], p["paymentP"]),
        rich(p["cancelHeading"], "\n".join(f"- {p[k]}" for k in ["cancel1", "cancel2", "cancel3", "cancel4"])),
        rich(p["participationHeading"], p["participationP1"] + "\n\n" + p["participationP2"]),
        rich(p["riskHeading"], p["riskP"]),
        rich(p["liabilityHeading"], p["liabilityP"]),
        rich(p["photographyHeading"], p["photographyP"]),
        rich(p["lawHeading"], p["lawPre"] + SITE["email"] + p["lawPost"]),
    ]
    seo = m["meta"]["legalTerms"]
    return {"title": p["title"], "slug": "legal-terms", "blocks": blocks, "seo": seo}


def build_safety(m):
    s = m["safety"]
    blocks = [
        rich("", s["lead"]),
        rich(s["onEveryTripHeading"],
             "\n".join(f"- {s[k]}" for k in ["onEveryTrip1", "onEveryTrip2", "onEveryTrip3", "onEveryTrip4", "onEveryTrip5"])),
        rich(s["heatProtocolHeading"], s["heatProtocolBody"]),
        rich(s["insuranceHeading"], s["insuranceP1"] + "\n\n" + s["insuranceP2"]),
        rich(s["whatToBringHeading"],
             "\n".join(f"- {s[k]}" for k in ["bring1", "bring2", "bring3", "bring4", "bring5"])),
    ]
    for i in range(1, 7):
        blocks.append(block("faq", question=s[f"faqQ{i}"], answer=s[f"faqA{i}"]))
    blocks.append(block("cta", title=s["ctaTitle"], buttonLabel=s["ctaLabel"], buttonUrl="/contact"))
    seo = m["meta"]["safety"]
    return {"title": s["title"], "slug": "safety", "blocks": blocks, "seo": seo}


def build_about(m):
    a = m["about"]
    blocks = [
        rich("", a["lead"]),
        rich(a["whyHeading"], a["whyP1"] + "\n\n" + a["whyP2"]),
        rich(a["howHeading"], "\n".join(f"- {a[k]}" for k in ["how1", "how2", "how3", "how4", "how5"])),
        block(
            "team",
            heading=a["guidesHeading"],
            members=[
                {"name": "Hédi Ben Amor", "role": a["guide1Role"], "photo": "/images/camel.jpg", "bio": a["guide1Bio"]},
                {"name": "Yasmine Trabelsi", "role": a["guide2Role"], "photo": "/images/quad.jpg", "bio": a["guide2Bio"]},
                {"name": "Karim Saïdi", "role": a["guide3Role"], "photo": "/images/sandboard.jpg", "bio": a["guide3Bio"]},
            ],
        ),
    ]
    seo = m["meta"]["about"]
    title = f"{a['titleLine1']} {a['titleLine2']}"
    return {"title": title, "slug": "about", "blocks": blocks, "seo": seo}


def build_contact(m):
    c = m["contact"]
    blocks = [block("hero", title=c["title"], subtitle=c["lead"])]
    seo = m["meta"]["contact"]
    return {"title": c["title"], "slug": "contact", "blocks": blocks, "seo": seo}


BUILDERS = [build_legal_privacy, build_legal_terms, build_safety, build_about, build_contact]


def main():
    token = login()
    print("logged in")
    created = []
    for locale in LOCALES:
        with open(os.path.join(MESSAGES_DIR, f"{locale}.json"), encoding="utf-8") as f:
            m = json.load(f)
        for builder in BUILDERS:
            page = builder(m)
            body = {
                "title": page["title"],
                "slug": page["slug"],
                "locale": LOCALE_ENUM[locale],
                "companyType": "DUNES_INSOLITES",
                "status": "DRAFT",
                "seoTitle": page["seo"]["title"],
                "metaDescription": page["seo"]["description"],
                "noIndex": False,
                "noFollow": False,
                "blocks": page["blocks"],
            }
            status, data = req("POST", "/pages", token=token, body=body)
            if status != 201:
                print(f"FAILED create {locale}/{page['slug']}: {status} {data}")
                continue
            page_id = data["pageId"]
            pstatus, pdata = req("PATCH", f"/pages/{page_id}/publish", token=token)
            ok = pstatus == 200 and pdata.get("status") == "PUBLISHED"
            print(f"{locale}/{page['slug']}: created {page_id} published={ok}")
            created.append((locale, page["slug"], page_id))
    print(f"\ndone — {len(created)}/{len(LOCALES) * len(BUILDERS)} pages created+published")


if __name__ == "__main__":
    main()
