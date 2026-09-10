# Payment integration — security requirements

**Status:** no online payment exists yet (OPEN-QUESTIONS **Q3** — provider
undecided). Today `Reservation.paymentLink` is a string an admin pastes, and
`POST /api/reservations/{id}/payments` is a **staff-only** manual ledger entry
(fixed 10 Sep 2026 — finding P-1). This document is the security bar the online
integration must clear **before** it ships.

## 1. Stay out of PCI scope — use hosted checkout

**Card data must never touch a Dunes server, container, log or database.**
Use the provider's **hosted checkout / redirect** flow (Stripe Checkout, Stripe
Payment Links, PayPal, or a Tunisian gateway — Paymee / Konnect / Flouci — all
support redirect). The customer enters their card on the *provider's* page.

- This keeps PCI-DSS scope at **SAQ-A** (the lightest self-assessment).
- **Do not** build a custom card form, even with the provider's JS SDK doing the
  tokenisation, unless there's a hard business reason — that pulls you into SAQ-A-EP.
- Never store PAN, CVV, expiry, or the cardholder name from the card.

## 2. The browser is never the source of truth

The current rule (`CLAUDE.md`) stands and gets stricter:

- A success redirect back to the site (`?status=success`) is a **hint**, not proof.
  Show a "confirming your payment…" state; do not mark anything paid.
- Payment is recorded **only** from a **provider webhook**, verified server-side:
  1. **Verify the signature** — Stripe `Stripe-Signature` (HMAC-SHA256 with the
     endpoint's signing secret), or the provider's equivalent. Reject on mismatch.
     The signing secret lives in the environment / secret manager, never in code.
  2. **Idempotency** — providers retry webhooks. Key on the provider's event id;
     a repeat event is a no-op. (Same pattern as `Notification.dedupe_key` V6 /
     `Reservation.idempotency_key` V7 — add `payment_events(provider_event_id UNIQUE)`.)
  3. **Amount + currency check** — the webhook's `amount_paid` must equal the
     reservation's **server-computed** total (`Money`, the reservation currency).
     A mismatch is an alert, not a silent accept.
  4. **Reservation state check** — only accept a payment for a reservation that is
     in a payable state; ignore/park payments for CANCELLED/EXPIRED and alert.
  5. Only after all of the above → write the `COMPLETED` transaction (reuse the
     existing `PaymentServiceImpl` ledger path) and let the state machine react.
- The webhook endpoint is `permitAll` (the provider is unauthenticated) but:
  signature-gated, rate-limited at nginx, and **must not** trust any field for
  authorization — derive the reservation from your own metadata you passed to the
  provider at checkout-session creation, cross-checked against the amount.

## 3. Checkout session creation

- Created **server-side** from the reservation's authoritative total. The client
  sends only the reservation id; the server builds the line items + amount.
- Pass your own `reservationId` (and `idempotencyKey`) as provider metadata so the
  webhook can be tied back without trusting client input.
- Set a session expiry; a stale/abandoned session must not later succeed against
  a reservation whose hold has expired.
- One open session per reservation at a time (or handle concurrent sessions in the
  webhook by amount reconciliation).

## 4. Refunds & partial payments

- Refund rules are a **business decision** (cancellation policy, F-3 hold window) —
  do not hard-code. Model a `REFUND` transaction type; the refund is issued via the
  provider API server-side and recorded from the refund webhook, same verification.
- Deposits / partial payments: `computePaymentSummary` already handles
  `PARTIALLY_PAID` — keep that; each webhook adds to the ledger.

## 5. Two legal entities

`CompanyType.{DUNES_INSOLITES, ROUTE_INSOLITE}` may mean **two provider accounts**
(separate settlement, separate invoice sequences). This is coupled to Q1/Q2/Q4
(mixed-trip invoicing, `DocumentSequence` per company) — **do not** wire payment
routing until those are decided. Fail closed: a reservation whose company can't be
determined does not get a checkout session.

## 6. Secrets & config

- Provider **secret key** + **webhook signing secret** → environment / secret
  manager. Add both to `docs/runbooks/secret-rotation.md`.
- Separate **test** and **live** keys; never a live key in a non-prod env
  (`ProductionConfigGuard` should require the live key when `DEPLOY_ENV=production`
  and reject a `sk_test_` / sandbox key there).
- `scan:secrets` must catch `sk_live_`, `sk_test_`, `whsec_`, `rk_live_` etc.
  (the scanner already has Stripe patterns — verify before go-live).

## 7. Logging & observability

- **Never log** the raw webhook body if it can contain card metadata; log the
  event id, type, amount, reservation id, and verification result.
- Metrics: `payment_webhook_total{result}`, `payment_amount_mismatch_total`,
  `payment_signature_invalid_total` → alerts (add to `observability.md`).
- **Daily reconciliation job**: provider settlement report vs recorded
  `COMPLETED` transactions. A gap = a missed webhook or fraud → alert.

## 8. Abuse / fraud

- Rate-limit checkout-session creation per user + per reservation (nginx + app).
- The provider handles 3-D Secure / SCA in the hosted flow — do not disable it.
- Card-testing defence: mostly the provider's radar/risk rules; on your side,
  cap failed-payment attempts per reservation before requiring staff review.

## Definition of done (payment ships only when all true)

- [ ] Hosted checkout — no card data server-side; PCI SAQ-A confirmed
- [ ] Webhook signature verification + idempotency + amount/currency/state checks
- [ ] `payment_events` unique constraint (idempotency at the DB)
- [ ] Server-side session creation from the authoritative total
- [ ] `ProductionConfigGuard` rejects a test/sandbox key in production
- [ ] `scan:secrets` catches the provider key formats
- [ ] Refund path modelled (rules from the business, not guessed)
- [ ] Reconciliation job + the 3 payment alerts wired
- [ ] Integration tests: valid webhook → paid; bad signature → 401; replay → no-op;
      amount mismatch → rejected + alert; payment for a CANCELLED reservation → parked
- [ ] Company routing deferred until Q1/Q2/Q4 (fail closed meanwhile)
