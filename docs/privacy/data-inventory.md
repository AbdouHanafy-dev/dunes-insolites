# Personal-data inventory

**Status:** technical audit, 2 September 2026 (Phase 5). Records *what the code
does*. Every column marked `LEGAL/BUSINESS DECISION REQUIRED` is answered in
[`legal-decisions-required.md`](legal-decisions-required.md), not here.

**Scope:** Dunes Insolites, the only entity launching 15 Sept. Route Insolite is
not yet live; company isolation is designed but unimplemented (ADR-0002).

**Controller:** `LEGAL/BUSINESS DECISION REQUIRED` (F-5.1) — assumed Dunes
Insolites (El Faouar 4264, Kébili) for its own bookings throughout this
document, pending confirmation.

---

## 1. Identity / account

| Data | Entity·field | Source | Purpose | API exposure | Internal consumers | External recipient | Retention | Deletion / anonymisation | Decision |
|---|---|---|---|---|---|---|---|---|---|
| Name | `User.name` | self-registration, guest checkout, admin create | address the customer; on invoices | `UserResponse` (self + staff), `ReservationResponse.userName`, `NotificationResponse.userName`, export | reservation/invoice/email flows | Keycloak (as `firstName`); email bodies; invoice PDF | `LEGAL/BUSINESS DECISION REQUIRED` (F-5.2) | anonymise on erasure *if* not on an issued invoice — F-5.3 | F-5.2, F-5.3 |
| Email | `User.email` (unique) | same | login id, transactional email, invoice delivery | `UserResponse`, export; **masked in logs** (`LogSanitizer`) | auth, email, newsletter match | Keycloak; SMTP provider (Gmail/Workspace) | `LEGAL/BUSINESS DECISION REQUIRED` (F-5.2) | anonymise on erasure — F-5.3 | F-5.2, F-5.4 |
| Phone | `User.phone` | same | contact about a booking | `UserResponse`, export | reservation ops | Keycloak (attribute); not emailed | `LEGAL/BUSINESS DECISION REQUIRED` | null on erasure | F-5.2 |
| Password | — | self / admin | authentication | **never stored by this app** — held only by Keycloak | — | Keycloak | Keycloak policy | Keycloak account removal | F-5.4 |
| Keycloak subject | `User.userId` (PK == KC `sub`) | Keycloak | join key between app and IdP | `UserResponse.userId`, most responses, export | everywhere | — | life of account | removed with account | — |
| Role | `User.role` | server-assigned | authorization | `UserResponse.role`, export | authz | Keycloak realm role | life of account | — | — |
| Matricule fiscal | `User.matriculeFiscal` | PARTENAIRE onboarding (admin) | B2B invoicing | `UserResponse`, `InvoiceResponse` (mapped), export | invoice | invoice PDF | `LEGAL/BUSINESS DECISION REQUIRED` (accounting) | retain while invoices exist — F-5.3 | F-5.3 |
| Agency address | `User.agencyAddress` | same | invoice "bill to" | `UserResponse`, invoice, export | invoice | invoice PDF | same as above | same | F-5.3 |
| Loyalty points / tier | `User.loyaltyPoints`, `loyaltyTier` | system | loyalty programme | `UserResponse`, export | — | — | `LEGAL/BUSINESS DECISION REQUIRED` | delete on erasure | F-5.2 |
| Special-remise flag + rows | `User.hasSpecialRemise`, `UserProductRemise` | admin | negotiated pricing | `UserResponse.remises`, export | pricing | — | while account active | delete on erasure | — |
| Consent timestamp | `User.termsAcceptedAt` | **server clock at registration** (CLIENT only) | prove ToS/privacy acceptance | `UserResponse`, export | audit | — | as long as the account, as consent proof | keep as long as any processing it justifies persists — F-5.3 | F-5.5 |

## 2. Reservation / booking

| Data | Entity·field | Source | Purpose | API exposure | Retention | Deletion | Decision |
|---|---|---|---|---|---|---|---|
| Group / leader name | `Reservation.groupName`, `groupLeaderName` | booking form | operations | `ReservationResponse` (owner + staff), export | `LEGAL/BUSINESS DECISION REQUIRED` (F-5.2) | anonymise with account — F-5.3 | F-5.2 |
| Dates, party counts | `Reservation.checkInDate/checkOutDate/serviceDate`, `numberOfAdults/Children` | booking | operations, capacity | `ReservationResponse`, export | F-5.2 | retained (operational + financial) | F-5.3 |
| Free text | `Reservation.demandeSpecial`, `rejectionReason`, `promoCode` | booking / staff | fulfil special requests | `ReservationResponse`, export | F-5.2 | anonymise / clear on erasure | F-5.2 |
| Participant names + ages | `Participant.fullName`, `age`, `isAdult` | booking | manifest, guiding | `ParticipantResponse` inside `ReservationResponse`, export | F-5.2 | delete with reservation anonymisation | F-5.2 |
| Payment link | `Reservation.paymentLink` | staff paste | send checkout URL | `ReservationResponse`, export | F-5.2 | — | Q3 |
| Soft-delete marker | `Reservation.deletedAt` | `deleteReservation` | keep FK for invoices | present in responses | — | — | — |
| Guide / chauffeur name + phone | `Guide`, `Chauffeur` | admin assignment | tell the customer who meets them | `ReservationResponse` (**exposed to the customer**) | staff-record lifetime | — | staff PII; see Risks | — |

## 3. Financial (statutory records — not freely deletable)

| Data | Entity·field | Purpose | API exposure | Retention | Deletion | Decision |
|---|---|---|---|---|---|---|
| Invoice header + line items + snapshot | `Invoice.*`, `InvoiceItem.*`, `Invoice.snapshotData` | fiscal document (TVA, timbre) | `InvoiceResponse` (**staff-or-owner**, Phase 4), export | `LEGAL/BUSINESS DECISION REQUIRED` — statutory accounting retention (F-5.3) | **never on request** — retain per accounting law | F-5.3 |
| Recipient name / matricule / address on the invoice | via `Invoice.user` + snapshot | legal "bill to" | `InvoiceResponse`, invoice PDF | as the invoice | retain | F-5.3 |
| Transaction | `Transaction.amount/currency/method/status/date/number` | payment record | `TransactionResponse` (**staff-or-owner**), `ReservationResponse.transactions`, export | as the invoice | retain | F-5.3 |
| Company on invoice | `Invoice.companyType` (nullable) | which entity issued it | `InvoiceResponse` | as the invoice | — | Q1/Q4 |

## 4. Reviews

| Data | Entity·field | Purpose | API exposure | Retention | Deletion | Decision |
|---|---|---|---|---|---|---|
| Review text + rating + author name | `Review.comment`, `rating`, via `Review.user` | public product reviews | `ReviewResponse` (public feed shows `userName`), export | `LEGAL/BUSINESS DECISION REQUIRED` (F-5.2) | delete or detach author name on erasure — F-5.3 | F-5.2 |

## 5. Notifications

| Data | Entity·field | Purpose | API exposure | Retention | Deletion | Decision |
|---|---|---|---|---|---|---|
| Notification title + message (may embed group name, amounts) | `Notification.title`, `message` | in-app bell | `NotificationResponse` — **self-scoped only** (JWT subject), export | `LEGAL/BUSINESS DECISION REQUIRED` | **cascade-deleted today** when the user is admin-deleted (`deleteUser`) | F-5.2 |

## 6. Marketing

| Data | Entity·field | Source | Purpose | API exposure | External | Retention | Deletion | Decision |
|---|---|---|---|---|---|---|---|---|
| Newsletter email + timestamp | `NewsletterSubscriber.email`, `subscribedAt` | `POST /api/public/subscribe` | mailing list | none (admin-queryable directly); export shows the caller's own membership | **none yet** — no mailing provider wired | `LEGAL/BUSINESS DECISION REQUIRED` (F-5.2) | **no unsubscribe endpoint exists** — see Risks | F-5.5 |
| Contact-form message | not persisted | `POST /api/public/contact` | forwarded to staff inbox by email only | none | SMTP provider | n/a (transient) | n/a | F-5.4 |

## 7. Technical / observability

| Data | Where | Purpose | Retention | Notes |
|---|---|---|---|---|
| Correlation id | MDC, `DeadLetterMessage.correlationId`, logs | request tracing HTTP→queue→DLQ | with the log / DLQ row | **not personal data** — a random UUID |
| Client IP | `RateLimitFilter` in-memory map key only | fixed-window rate limiting | transient (in-memory, single instance); **not persisted, not logged** | `LEGAL/BUSINESS DECISION REQUIRED` if ever persisted (F-5.2) |
| Email address in logs | routine INFO/WARN across auth/email/newsletter | operational tracing | log retention (`LEGAL/BUSINESS DECISION REQUIRED`, F-5.2) | **now masked** via `LogSanitizer` (`j***e@example.com`) |
| DLQ raw payload | `DeadLetterMessage.payload` (DB, TEXT) | verbatim replay of a failed notification | with the DLQ row | justified for replay; **never in the API response** (`DeadLetterMessageResponse` is metadata-only); **no longer logged** on persist-failure |
| Analytics id (GA4 `_ga` cookie) | browser only, **behind explicit "accept all" consent**, `anonymize_ip: true`, only if `NEXT_PUBLIC_GA_MEASUREMENT_ID` set | audience measurement | Google's | `LEGAL/BUSINESS DECISION REQUIRED` (F-5.6) — whether GA4 will be used at all, and the cookie-policy text |
| Admin session token | httpOnly + `Secure` (prod) + `SameSite=Strict` cookie, server-side only | staff auth | token TTL (≤5 min default) | never reaches browser JS, never logged, never in a response body |

## 8. External recipients / processors (status only — see F-5.4)

| Service | Data it receives | Agreement status |
|---|---|---|
| Keycloak (self-hosted) | name, email, phone, password | `LEGAL/BUSINESS DECISION REQUIRED` (F-5.4) — hosting location, DPA |
| PostgreSQL (self-hosted, docker-compose) | everything | `LEGAL/BUSINESS DECISION REQUIRED` (F-5.4) |
| SMTP — Gmail / Google Workspace | recipient email, name, booking + invoice details in the body, invoice PDF | `LEGAL/BUSINESS DECISION REQUIRED` (F-5.4) — Workspace DPA, US transfer |
| RabbitMQ (self-hosted) | notification payloads (group name, amounts) | processor = self |
| Google Analytics 4 | pageviews, anonymised IP, `_ga` cookie — **only after consent**, and only if enabled | `LEGAL/BUSINESS DECISION REQUIRED` (F-5.4, F-5.6) |
| Hosting provider (VPS at `79.143.185.33` per `application.yml` default) | all data at rest | `LEGAL/BUSINESS DECISION REQUIRED` (F-5.4) |
| Off-site backup target | full DB dump | `OFFSITE_CMD` unset today; when set → `LEGAL/BUSINESS DECISION REQUIRED` (F-5.4) |
| Payment provider | — | none integrated (Q3) |
