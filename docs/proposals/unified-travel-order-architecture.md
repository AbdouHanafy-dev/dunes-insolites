# Dunes Insolites & Route Insolite
## Unified Travel Order, Booking, Payment and Settlement Architecture

**Status:** Proposed Architecture  
**Purpose:** Create one seamless customer booking flow while preserving operational and financial ownership.

## 1. Executive Summary

A customer must be able to select:

- a Route Insolite circuit;
- a Dunes Insolites stay;
- Dunes Insolites activities;
- extras.

The customer completes:

- **one trip**
- **one checkout**
- **one TravelOrder**
- **one payment**
- **one customer confirmation**

Internally, every purchased service keeps its operational and financial owner.

```text
CUSTOMER
   ↓
ONE TRAVEL ORDER
   ├── Circuit
   ├── Accommodation
   ├── Activities
   └── Extras
   ↓
ONE PAYMENT
   ↓
OPERATIONAL BOOKINGS
   ↓
INTERNAL FINANCIAL SETTLEMENT
```

> One customer order does not mean one service.  
> One payment does not necessarily mean one operational beneficiary.

---

## 2. Business Roles

### Route Insolite

Responsible for:

- multi-day circuits;
- itineraries;
- tours;
- route-specific services.

### Dunes Insolites

Responsible for:

- camp stays;
- bivouac stays;
- activities;
- local experiences;
- relevant extras.

The customer should not need to understand this internal separation.

---

## 3. Recommended Core Aggregate

The central customer-facing object should be:

```text
TravelOrder
```

```text
TravelOrder
   ├── OrderItem: Circuit
   ├── OrderItem: Accommodation
   ├── OrderItem: Activity
   ├── OrderItem: Extra
   ├── Payment
   ├── Customer document / invoice
   └── Settlement
```

---

## 4. TravelOrder

`TravelOrder` represents the complete commercial trip.

Suggested fields:

```text
id
reference
customerId
currency
status
paymentStatus
subtotalAmount
discountAmount
taxAmount
totalAmount
createdAt
updatedAt
```

Example:

```text
TravelOrder #TRIP-2026-001245
Customer: John Smith
Status: CONFIRMED
Payment: PAID
Total: 570 EUR
```

---

## 5. OrderItem

Every selected service becomes an `OrderItem`.

Suggested types:

```text
CIRCUIT
ACCOMMODATION
ACTIVITY
EXTRA
TRANSPORT
TRANSFER
```

Suggested fields:

```text
id
travelOrderId
productId
productType
ownerCompanyId
titleSnapshot
quantity
unitPriceAmount
discountAmount
taxAmount
totalAmount
status
```

### Critical rule

Every item must contain:

```text
ownerCompanyId
```

Example:

```text
Circuit
Owner: ROUTE_INSOLITE
Amount: 300 EUR

Desert Camp
Owner: DUNES_INSOLITES
Amount: 150 EUR

Quad Safari
Owner: DUNES_INSOLITES
Amount: 80 EUR

Camel Trek
Owner: DUNES_INSOLITES
Amount: 40 EUR
```

---

## 6. Order vs Reservation

Do not treat one commercial order as one operational reservation.

```text
TravelOrder
   ├── OrderItem → CircuitBooking
   ├── OrderItem → AccommodationReservation
   ├── OrderItem → ActivityReservation
   └── OrderItem → ActivityReservation
```

The `TravelOrder` is commercial.

Reservations/bookings are operational.

This allows each service to have its own:

- availability;
- status;
- schedule;
- cancellation policy;
- fulfillment process.

---

## 7. Customer Checkout

```text
Choose Circuit
   ↓
Choose Accommodation
   ↓
Choose Activities
   ↓
Choose Extras
   ↓
Review Complete Trip
   ↓
Create TravelOrder
   ↓
Create Payment
   ↓
Payment Success
   ↓
Confirm Services
   ↓
Create Internal Settlement
```

---

## 8. One Payment

The customer pays only once.

```text
Customer
   ↓
Payment
   ↓
570 EUR
```

Suggested `Payment` fields:

```text
id
travelOrderId
provider
providerTransactionId
amount
currency
status
paidAt
```

Statuses:

```text
PENDING
PROCESSING
PAID
FAILED
PARTIALLY_REFUNDED
REFUNDED
```

---

## 9. Internal Settlement

Payment and internal allocation are separate concepts.

Customer payment:

```text
570 EUR
```

Internal ownership:

```text
Route Insolite
300 EUR

Dunes Insolites
270 EUR
```

Model:

```text
Settlement
   ├── SettlementLine → Route Insolite
   └── SettlementLine → Dunes Insolites
```

Suggested fields:

```text
Settlement
id
travelOrderId
currency
status
createdAt
settledAt
```

```text
SettlementLine
id
settlementId
companyId
grossAmount
commissionAmount
netAmount
status
```

The settlement is **not** a second customer reservation.

---

## 10. Recommended Ownership Model

For a complete circuit package, one entity should be clearly defined as the contractual seller/merchant.

Recommended flow:

```text
CUSTOMER
   ↓
ROUTE INSOLITE
   ↓
Complete Travel Package
   ├── Circuit
   ├── Dunes stay
   └── Dunes activities
   ↓
ONE PAYMENT
   ↓
INTERNAL SETTLEMENT
```

For direct Dunes-only bookings:

```text
CUSTOMER
   ↓
DUNES INSOLITES
   ↓
TravelOrder
   ↓
Payment
```

The exact legal invoice and tax model must be validated by the company accountant/legal advisor.

---

## 11. Company as a First-Class Concept

Do not use company ownership only in invoices.

```text
Company
   ├── Products
   ├── OrderItems
   ├── Staff
   ├── SettlementLines
   └── Financial Reporting
```

Suggested company codes:

```text
ROUTE_INSOLITE
DUNES_INSOLITES
```

Long-term:

```text
Company
id
code
name
legalName
taxIdentifier
status
```

Products and financial records reference `companyId`.

---

## 12. Product Ownership

Every sellable product has a clear owner.

```text
Sahara Circuit → ROUTE_INSOLITE
Desert Camp → DUNES_INSOLITES
Bivouac → DUNES_INSOLITES
Quad Safari → DUNES_INSOLITES
Camel Trek → DUNES_INSOLITES
```

---

## 13. Price Snapshots

Each `OrderItem` must preserve the price agreed at purchase time.

Store:

```text
productId
titleSnapshot
descriptionSnapshot
unitPriceAmount
discountAmount
taxAmount
totalAmount
currency
```

Do not recalculate historical orders from the current product price.

---

## 14. Money Rules

Never use:

```text
Double
double
float
```

Use:

```text
BigDecimal
```

or a fixed-point integer model.

For Java:

```java
BigDecimal amount;
```

Database example:

```text
NUMERIC(19, 3)
```

---

## 15. Order Lifecycle

```text
DRAFT
  ↓
PENDING_PAYMENT
  ├── payment failure → PAYMENT_FAILED
  ↓
PAID
  ↓
CONFIRMING
  ├── service issue → PAYMENT_REVIEW
  ↓
CONFIRMED
  ↓
IN_PROGRESS
  ↓
COMPLETED
```

---

## 16. Availability Protection

Prevent two customers from purchasing unavailable capacity.

Recommended concept:

```text
AvailabilityHold
   ├── TravelOrder
   ├── Resource
   ├── Quantity
   └── ExpiresAt
```

Flow:

```text
Select services
   ↓
Create temporary holds
   ↓
Start payment
   ↓
Payment succeeds
   ↓
Confirm bookings
```

---

## 17. Payment Safety

Implement:

- idempotency;
- verified provider webhooks;
- server-side payment confirmation.

```text
Payment Provider
   ↓
Webhook
   ↓
Verify Signature
   ↓
Idempotency Check
   ↓
Update Payment
   ↓
Confirm Order
```

The frontend must never be the source of truth for payment success.

---

## 18. Refunds

Support:

- full order refunds;
- partial refunds;
- item-level refunds.

Example:

```text
TravelOrder
   ├── Circuit         300 EUR
   ├── Accommodation   150 EUR
   ├── Quad             80 EUR
   └── Camel Trek       40 EUR
```

If Quad is cancelled:

```text
Refund
   ├── OrderItem: Quad Safari
   ├── Amount: 80 EUR
   ├── Reason
   └── Status
```

Settlement reporting must also reflect the refund.

---

## 19. Permissions

Use:

```text
User
   ├── Role
   └── Company Scope
```

Example:

```text
ROLE_DUNES_MANAGER
Scope: DUNES_INSOLITES

ROLE_ROUTE_MANAGER
Scope: ROUTE_INSOLITE

ROLE_GROUP_ADMIN
Scope: ALL
```

Enforce authorization server-side.

---

## 20. Backend Modules

Recommended modular-monolith structure:

```text
backend/
├── identity/
├── company/
├── catalog/
├── pricing/
├── availability/
├── travel-order/
├── booking/
├── payment/
├── settlement/
├── invoice/
├── notification/
└── community/
```

Do not introduce microservices prematurely.

---

## 21. Frontend Customer Flow

```text
Choose Circuit
   ↓
Choose Accommodation
   ↓
Choose Activities
   ↓
Choose Extras
   ↓
Trip Summary
   ↓
Checkout
   ↓
Payment
   ↓
Confirmation
```

The frontend displays one complete `TravelOrder`.

It should not expose internal settlement complexity.

---

## 22. Customer View

```text
YOUR SAHARA JOURNEY

Sahara Discovery Circuit
2 Days

Accommodation
Dunes Insolites Camp
1 Night

Activities
Quad Safari
Camel Trek

--------------------
TOTAL
570 EUR

[ PROCEED TO PAYMENT ]
```

---

## 23. Staff View

```text
TRAVEL ORDER #TRIP-2026-001245

Customer
John Smith

STATUS
CONFIRMED

SERVICES

[ROUTE INSOLITE]
Sahara Circuit
CONFIRMED

[DUNES INSOLITES]
Desert Camp
CONFIRMED

[DUNES INSOLITES]
Quad Safari
CONFIRMED

[DUNES INSOLITES]
Camel Trek
CONFIRMED

PAYMENT
570 EUR - PAID

INTERNAL ALLOCATION
Route Insolite: 300 EUR
Dunes Insolites: 270 EUR
```

---

## 24. MVP Roadmap

### Phase 1 — Foundation

1. Introduce `TravelOrder`.
2. Introduce `OrderItem`.
3. Add product company ownership.
4. Replace floating-point money values.
5. Add price snapshots.

### Phase 2 — Checkout

1. Multi-service cart.
2. One checkout.
3. One payment.
4. Payment webhooks.
5. Idempotency.
6. Availability holds.

### Phase 3 — Operations

1. Create operational bookings from confirmed order items.
2. Cancellation flow.
3. Partial refunds.
4. Notifications.

### Phase 4 — Finance

1. `Settlement`.
2. `SettlementLine`.
3. Company reporting.
4. Reconciliation.
5. Accountant-approved invoice model.

---

## 25. Final Architecture

```text
                         CUSTOMER
                            │
                            ▼
                    ┌──────────────┐
                    │ TRAVEL ORDER │
                    └──────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
      CIRCUIT        ACCOMMODATION        ACTIVITIES
          │                 │                 │
          ▼                 ▼                 ▼
   ROUTE INSOLITE     DUNES INSOLITES   DUNES INSOLITES
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                            ▼
                      ONE PAYMENT
                            │
                            ▼
                 OPERATIONAL BOOKINGS
                            │
                            ▼
                    INTERNAL SETTLEMENT
                       ╱           ╲
                      ▼             ▼
             ROUTE INSOLITE   DUNES INSOLITES
```

## Final Recommendation

The recommended architecture is:

> **ONE CUSTOMER JOURNEY + ONE TRAVEL ORDER + MULTIPLE ORDER ITEMS + ONE CHECKOUT + ONE PAYMENT + MULTIPLE OPERATIONAL BOOKINGS + INTERNAL FINANCIAL SETTLEMENT**

Do not create two customer reservations simply because two companies participate in one trip.

The correct model is:

> **One customer order can contain multiple services while each service retains its own operational and financial ownership.**
