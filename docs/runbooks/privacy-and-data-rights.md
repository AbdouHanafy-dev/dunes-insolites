# Runbook — privacy & data-subject rights

Operational procedures + the state of each technical control. Written 2 Sep 2026
(Phase 5). Companion documents:
[`../privacy/data-inventory.md`](../privacy/data-inventory.md),
[`../privacy/legal-decisions-required.md`](../privacy/legal-decisions-required.md).

Each control is tagged:

- **IMPLEMENTED** — code exists, tested.
- **LEGAL/BUSINESS DECISION REQUIRED** — cannot be finished without an answer in `legal-decisions-required.md`.
- **NOT IMPLEMENTED** — known gap, no code.

---

## 1. Access & portability (GDPR Art. 15 / 20)

**IMPLEMENTED.** `GET /api/users/me/export` — authenticated; returns a JSON
document (`Content-Disposition: attachment; filename=my-data.json`) containing
the caller's profile, reservations (+ lines, accommodation, participants),
invoices, transactions, notifications, reviews and newsletter membership.

- Scoped to the JWT subject via `CallerContext.requireUserId()` — no id is read
  from the request, so it cannot be pointed at another user.
- Excludes passwords/hashes (this app never stores them — Keycloak does),
  tokens, secrets, other users' data.
- Tests: `UserDataExportIT` (own data; unauthenticated rejected; no cross-user
  data; no secret fields).

**Procedure for a written request:** ask the person to sign in and use
"Export my data", or an operator runs the endpoint with the person's session.
Financial records included in the export are also covered by §4.

**Format sufficiency:** `LEGAL/BUSINESS DECISION REQUIRED` (F-5.7) — JSON is
machine-readable and portable; confirm no other format is contractually owed.

## 2. Rectification (Art. 16)

**IMPLEMENTED (partial).** Staff can correct `name`, `email`, `phone`,
`matriculeFiscal`, `agencyAddress` via `PUT /api/users/{id}` (ADMIN). Email
changes propagate to Keycloak.

**NOT IMPLEMENTED:** self-service profile edit (`PUT /api/users/me`). A person
must currently ask an operator. Low risk; noted.

## 3. Consent / terms (Art. 7)

**IMPLEMENTED.**

- `User.termsAcceptedAt` is set **server-side** to the server clock at
  registration, for CLIENT accounts only. `RegisterRequest` carries a boolean
  `acceptedTerms` (defaults `false` — fail closed), **never a timestamp**.
- A CLIENT registration with `acceptedTerms=false` is rejected
  (`TermsNotAcceptedException`) before any Keycloak or DB write.
- No update DTO (`UserRequest`) has a field that can rewrite consent.
- Tests: `KeycloakUserSyncServiceConsentTest` (server clock; rejection;
  seed-account exemption; no spoofable date; no rewrite field).

**LEGAL/BUSINESS DECISION REQUIRED:**
- F-5.5 — whether the newsletter needs a distinct marketing-consent record
  (opt-in vs single/double opt-in) and an unsubscribe mechanism.
- F-5.6 — cookie/analytics consent copy and whether GA4 is used. *Technical
  state:* the frontend already gates GA4 on an explicit "accept all" choice
  (`components/Analytics.tsx`, `lib/consent.ts`), sends `anonymize_ip: true`,
  and never hardcodes the measurement id.

## 4. Erasure (Art. 17) — and the accounting exception

**NOT IMPLEMENTED as self-service. Designed here; blocked on F-5.3.**

Dependency reality:

```
User
 ├── Reservation      → soft-deleted (deletedAt); FK kept for invoices
 │    └── Participant  → names, deletable
 ├── Invoice          → numbered fiscal document — MUST be retained (F-5.3)
 ├── Transaction      → payment record — retained with the invoice
 ├── Review           → public content; author name is the PII
 ├── Notification     → cascade-deleted today by admin deleteUser
 └── Keycloak account → removable
```

The existing `DELETE /api/users/{id}` (ADMIN, `@perm.can('USERS','FULL')`)
hard-deletes the `User` row + cascades notifications + account-action tokens,
and is **blocked by a real FK** if any reservation/invoice/transaction points at
the user — i.e. it already fails closed on records that must survive. It logs
the (now-masked) email.

**Recommended erasure design (needs F-5.3 to implement):** convert erasure to
**anonymisation** — keep invoices/transactions/reservations for the statutory
retention period but null/replace the person's direct identifiers
(`name → "Utilisateur supprimé"`, `email → deleted+<uuid>@invalid`,
`phone/matriculeFiscal/agencyAddress → null`), detach or null the author name on
reviews, delete notifications and loyalty data, and remove the Keycloak account.
Whether the name may be stripped from an **already-issued** invoice, and the
retention period, are F-5.3.

**Never** on an erasure request: delete an invoice, delete transaction history,
delete accounting records, or cascade-delete another user's data.

## 5. Restriction / objection (Art. 18 / 21)

**NOT IMPLEMENTED.** No "freeze processing" flag. Handle manually (deactivate
the Keycloak account) until the erasure/anonymisation seam exists.

## 6. PII logging rules

**IMPLEMENTED.** `observability/LogSanitizer` — `maskEmail()` / `maskPhone()`.
Applied to every routine INFO/WARN log that printed a raw email:
`EmailService`, `KeycloakUserSyncService`, `AccountActionServiceImpl`,
`NewsletterServiceImpl`, `NotificationConsumer`, `AuthService`,
`InvoiceEmailService`. `DeadLetterConsumer` no longer logs the raw message
payload on a persist failure (identifiers only).

**Rules going forward:**
- Never log a full email, phone, name, address, token, `Authorization` header,
  cookie, password, or a request/message body containing them.
- `userId` (a UUID) *is* fine — it is the correlation key.
- Correlation ids are fine — random, not personal data.
- Server-side stack traces at ERROR are fine (operator logs); they must never
  reach an HTTP response (see §7).
- **Log retention period: `LEGAL/BUSINESS DECISION REQUIRED` (F-5.2).**

## 7. Production error responses

**IMPLEMENTED.** `GlobalExceptionHandler` returns a generic message for any
unhandled exception (`"An unexpected error occurred…"`), never a stack trace,
exception class, SQL, or constraint name. DB constraint violations collapse to a
generic 409. Tests: `GlobalExceptionHandlerLeakageTest`.

Config requirement for production: `server.error.include-message=never`,
`include-stacktrace=never`, `include-binding-errors=never` (Spring Boot
defaults; confirm not overridden on the host).

## 8. Authorization / data isolation

**IMPLEMENTED (Phase 4 + 5).** Per-user ownership enforced at the service layer
for reservation read/update/cancel, invoice read, payment. Notifications are
self-scoped by JWT subject. The data export is subject-scoped. Company-level
isolation is **NOT IMPLEMENTED** (ADR-0002, blocked on Q1/Q2/Q4/Q9).

## 9. DLQ / email PII

**IMPLEMENTED.** `DeadLetterMessageResponse` is metadata-only (no payload, no
headers, no recipient). Replay is ADMIN-only, keyed by the DLQ row id (an
operator cannot redirect a message to an arbitrary recipient — the stored
payload is replayed verbatim). Raw payload retained in the DB **only** for
replay. `failureReason` is free text — an operator should treat it as
potentially sensitive.

## 10. Incident considerations

- A DB or backup compromise exposes all data in §1–§6 in clear (no
  application-level field encryption). `LEGAL/BUSINESS DECISION REQUIRED` on
  whether at-rest field encryption is required (F-5.4 scope).
- Breach-notification process, DPO contact, supervisory authority: **legal, not
  technical** — out of scope for this runbook.

## 11. Data minimisation — known excess

- `ReservationResponse` exposes assigned **guide/chauffeur name + phone** to the
  customer. Plausibly intended (the customer needs to know who meets them) but
  it is staff PII on a customer-facing response — confirm it is deliberate.
- `BookingFlow.tsx` writes the full booking (name/email/phone) to
  `sessionStorage` for the confirmation page. Same-origin, tab-scoped, the
  user's own data — acceptable, noted.
- Newsletter has no unsubscribe endpoint (§3, F-5.5).
