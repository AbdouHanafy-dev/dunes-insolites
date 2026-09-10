# Legal / business decisions required for GDPR sign-off (F-5)

These are **not a developer's to decide**. Each blocks a piece of privacy
compliance. The engineering side of Phase 5 (export, PII-safe logging, error
hygiene, consent-timestamp hardening, IDOR) is done and does not wait on these —
but **legal GDPR sign-off is not possible until they are answered**.

**Owner key:** 💼 business · 🧾 accountant · ⚖️ legal · 🛠 technical

Answer in place, with a date; move settled items to an "Answered" section and
update `data-inventory.md` / `privacy-and-data-rights.md`.

---

## F-5.1 ⚖️💼 — Controller structure

Which legal entity is the **data controller** for:

- Dunes Insolites accommodation bookings — assumed Dunes Insolites (El Faouar
  4264, Kébili) throughout the inventory, **unconfirmed**.
- Route Insolite bookings (not yet live).
- Shared platform data — the single `users` table holds customers of both
  entities. Joint controllers? Separate? (This is also `OPEN-QUESTIONS.md` Q10.)
- Mixed trips (Q1).

**Blocks:** the "Controller" column of `data-inventory.md`; both privacy
policies (each currently names one company); the lawful basis analysis.

## F-5.2 🧾⚖️💼 — Retention periods

No retention period is set anywhere in the code. Required for:

| Data | Note |
|---|---|
| Customer accounts (inactive) | |
| Reservations | operational + evidentiary |
| Invoices | **statutory accounting** — see F-5.3 |
| Transactions | with the invoice |
| Reviews | published content |
| Newsletter subscribers | marketing |
| Application logs (contain masked email + userId) | |
| `DeadLetterMessage` rows (raw notification payload) | |
| Rate-limit / IP data | transient today; decision needed only if ever persisted |

**Do not invent periods.** Until set, nothing can be auto-expired and the
inventory's "Retention" column stays `LEGAL/BUSINESS DECISION REQUIRED`.

## F-5.3 🧾⚖️ — Erasure vs accounting retention

When a customer requests erasure, what **must** be kept, and for how long?

- Invoices — Tunisian commercial/tax law retention period? Must the customer's
  **name / matricule fiscal / address on an already-issued invoice** be
  preserved verbatim, or may it be anonymised?
- Transactions / payment history.
- Reservation history tied to an invoice.
- Consent timestamp (needed as proof of a lawful basis while that basis is used).

**Blocks:** implementing `DELETE /api/users/me` as anonymisation. The technical
design is written (`privacy-and-data-rights.md` §4); it is not implemented
because choosing what survives is this decision.

## F-5.4 ⚖️ — Processors / sub-processors

Confirm legal status + DPA + transfer basis for each:

| Service | Current state |
|---|---|
| Keycloak hosting | self-hosted on the VPS; location + safeguards unconfirmed |
| PostgreSQL hosting | self-hosted (docker-compose) on the VPS |
| SMTP — Gmail / Google Workspace | sends name, email, booking + invoice detail, invoice PDF; Workspace DPA + EU/US transfer unconfirmed. Gmail app password also still pending rotation (CLAUDE.md). |
| Hosting provider (VPS `79.143.185.33`) | provider identity + DPA unconfirmed |
| Off-site backup target | `OFFSITE_CMD` unset; when set, the destination is a sub-processor |
| Google Analytics 4 | see F-5.6 |
| RabbitMQ | self-hosted; processor = self |

Also: is **at-rest field encryption** required for the direct identifiers, or is
full-disk / DB-level encryption on the host sufficient?

## F-5.5 💼⚖️ — Marketing-consent model

`POST /api/public/subscribe` stores `{email, subscribedAt}` and nothing else. No
mailing provider is wired up. Decide:

- Is subscribing itself sufficient consent, or is double opt-in required?
- Should a separate `marketingConsentAt` be recorded (distinct from ToS)?
- An **unsubscribe / withdrawal** mechanism is required and does not exist —
  once the model is decided this is a small, unambiguous build.

## F-5.6 ⚖️💼 — Analytics / cookies

- Will GA4 actually be enabled? (`NEXT_PUBLIC_GA_MEASUREMENT_ID` is unset; the
  code path exists and is consent-gated with `anonymize_ip`.)
- Cookie-policy wording, and the list of cookies for the banner.
- Any other analytics/tracking (none in the code today).

*Technical state is already compliant-shaped* — GA4 loads only after an explicit
"accept all", IP anonymised, id only in an env var. This decision is about
copy + whether to turn it on, not code.

## F-5.7 🛠⚖️ — Data-export format

`GET /api/users/me/export` returns JSON. Confirm JSON satisfies the portability
obligation, or specify another format / delivery process (e.g. a signed
download, a PDF summary alongside).

---

## Not F-5, but adjacent and still open

- **Q10** (`OPEN-QUESTIONS.md`) — lawful basis for two legal entities sharing
  one customer table. Overlaps F-5.1.
- **Q3** — payment provider; changes the processor list (F-5.4) once chosen.
- Privacy policy / Terms of Service **content** in all 6 locales — the current
  translations are AI drafts; `OPEN-QUESTIONS.md` already flags that a
  qualified legal review is required before the Privacy/Terms pages ship.
