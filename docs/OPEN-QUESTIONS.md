# Open questions

Decisions that **are not a developer's to make** and that block work downstream.
Each names who owns it, what it blocks, and what happens by default if it goes
unanswered.

Answer them in the document, with a date. An answered question moves to
[Answered](#answered) and its ADR gets updated.

**Owner key:** 💼 business · 🧾 accountant · ⚖️ legal · 🛠 technical

---

## Blocking

### Q1 🧾 Who invoices the customer for a mixed trip?

A trip containing a Route Insolite circuit and a Dunes Insolites stay is sold by
two legal entities. An invoice is issued *by* one entity — a single fiscal
invoice covering both does not exist as an instrument.

| Option | Customer sees | Internally |
|---|---|---|
| **Voucher + per-entity invoices** *(recommended)* | One trip confirmation | Each entity invoices what it sold |
| **Merchant of record** | One invoice from Route Insolite | Dunes invoices Route internally — different VAT, and a document type the model lacks |
| **Two invoices** | One payment, two invoices | Simplest |

**Blocks:** ADR-0001 stage 6 · whether `Invoice` hangs off `TravelOrder`,
`Reservation`, or both · the entire settlement model.
**Default if unanswered:** per-entity invoices, no merchant of record. Safe, and
avoids inventing an inter-company document type.

---

### Q2 🛠💼 One reservation per product, or per company?

For a trip with a camp stay and a quad ride, both from Dunes:

- **Per product** — `#D-001` camp, `#D-002` quad. Independent status, schedule
  and cancellation.
- **Per company** — one Dunes reservation with two line items. Camp staff see
  one booking to prepare. Matches the current aggregate, so no migration.

**Blocks:** ADR-0001 stage 4 · whether `Reservation` stays as-is or becomes
single-product.
**Default if unanswered:** per company. Cheaper, and matches how the camp
appears to work.

---

### Q3 💼🛠 Which payment provider?

There is no integration today. `Reservation.paymentLink` is a `String` an
administrator pastes in by hand.

- **Local** — Paymee, Konnect, Flouci. Tunisian cards, TND settlement.
- **International** — Stripe. Better for European guests, multi-currency.
- **Both** — routed by the customer's currency.

Affects currency handling, settlement timing, refunds and webhook design.

**Blocks:** ADR-0001 stage 5 · online checkout of any kind.
**Default if unanswered:** manual payment links continue. The September release
assumes this.

---

### Q4 🧾⚖️ What is the remedy for invoices already issued from the shared sequence?

`DocumentSequence` is unique on `(type, year)` — **not company**. Both legal
entities have been drawing from one counter, so each ledger has gaps where the
other took a number. Missing numbers are exactly what an audit looks for.

Documents already issued cannot be renumbered; they are in customers' hands and
in the accounts.

**Blocks:** ADR-0001 stage 1 — the fix must not silently rewrite history.
**Default if unanswered:** none. This one has no safe default. It needs the
accountant before the sequence is changed.
**Severity:** highest open item in the project.

---

### Q5 🛠💼 How does a trip span two domains?

`www.route-insolite.com` and `www.dunes-insolites.com` are different origins and
**cannot share a cookie**.

| Option | Trade-off |
|---|---|
| **One checkout domain** *(recommended)* — `book.dunes-insolites.com` owns the session | Cleanest; keeps brand content domains separate for SEO while unifying the transaction |
| Signed order token in the URL | Works, but URLs leak into logs, history, referrers — needs short expiry |
| One domain, two brand sections | Best SEO consolidation, biggest brand change |

**Blocks:** ADR-0001 stage 4 · cross-brand checkout.
**Default if unanswered:** single-brand checkout only. Each site sells its own
products; no mixed trips.

---

### Q6 💼 Which nine circuit pages move to Route Insolite?

`dunes-insolites.com` currently sells and ranks for nine multi-day circuit pages
that are Route Insolite's product — Ksar Ghilane, Tataouine/Chenini, Star Wars,
2/3/6-day circuits, Douz-Matmata, 4x4. Two owned domains competing on the same
queries suppress each other.

**Blocks:** the SEO migration — every redirect and sitemap entry depends on it.
**Default if unanswered:** keep them on `dunes-insolites.com`. Cannibalisation
continues.
**Note:** moving them cross-domain costs a 2–3 month ranking dip before recovery.
Budget for it; do not panic-revert in week three.

---

### Q7 💼 Is the WordPress booking work stopped?

`/services/sejours/`, `/services/tours/`, `/mes-reservations/` and
`/detail-service/` were all edited in July–August 2026, which suggests a booking
flow is being built inside WooCommerce in parallel with the Spring Boot backend.

**Blocks:** nothing technically, but every day it continues adds work to throw
away and increases cutover risk.
**Default if unanswered:** assume it continues and plan a larger cutover.

---

### Q8 🛠 Read access to `routeinsolite`?

The Angular `admin-app` is deployed, in daily production use, and is the de-facto
specification for what the backoffice must do. It is not on this machine —
authored under `bacem.benakkari@polytechnicien.tn`.

**Blocks:** R3 Sprint 7. Treat as a Sprint 6 blocker, not a Sprint 7 task.
**Default if unanswered:** rebuild blind and ship the wrong 20%, discovered at
handover.

---

### Q9 💼 What happens to `partner-app` and `camping-app`?

If they stay Angular, the business maintains two frontend stacks permanently.

**Blocks:** whether the new backoffice is built as an ADMIN-only app or a
role-aware shell. Decide **before** the shell is built.
**Default if unanswered:** role-aware shell. Costs little now, saves a rewrite.

---

### Q10 ⚖️ On what basis do two legal entities share one customer table?

Each entity processes personal data collected by the other. A Route Insolite
customer has not necessarily consented to the camp holding their details. With
European guests this carries real exposure, and both privacy policies currently
name one company.

**Blocks:** nothing technically. Exposure accrues daily.
**Default if unanswered:** undocumented shared processing — the position least
defensible if challenged.

---

## Answered

### ✅ Canonical domain — `www.dunes-insolites.com`
*Answered 25 Aug 2026.* With `www`, matching the legacy sitemap's declared
canonical host. The new vitrine replaces the existing WordPress site.

### ✅ Languages — all 6, French default at root
*Answered 25 Aug 2026, revised 26 Aug 2026.* Originally French-only at
launch with English deferred to R2 (below, struck through). Revised: all 6
locales already listed in `frontend/lib/site.ts` ship now —
fr (default, unprefixed root, where every existing ranking is), en, de, it,
da, ar (RTL). `next-intl` infrastructure, routing, hreflang, RTL layout
support, and the language switcher are live. Translations for the sitewide
chrome (nav, header, footer, cookie consent) are done in all 6 languages;
long-form page content (activity/stay descriptions, legal pages, about/
safety/contact prose) is still English/French-only pending translation —
see `frontend/messages/*.json` for what's covered so far. All translations
so far are AI-produced drafts, not commissioned/professionally reviewed —
flag this to a native speaker before treating any of it as final, and
**especially** get a qualified legal review before the Privacy/Terms pages
are translated, given real cross-border consumer-protection exposure.

~~French at the root, where every existing ranking is. English under `/en`.
September ships French-only; English lands in R2.~~

### ✅ Backoffice — new Next.js app
*Answered 25 Aug 2026.* Retires the Angular `admin-app`. One stack, shared types
with the vitrine. Built company-aware from its first commit.

### ✅ Source control — GitHub only
*Answered 25 Aug 2026.* `github.com/AbdouHanafy/dunes-insolites`. The backend's
GitLab remote is not configured on the monorepo.

### ✅ Commercial model — `TravelOrder` above `Reservation`, two layers
*Answered 25 Aug 2026.* See ADR-0001. No `OrderItem` layer; `Reservation` fills
that role.
