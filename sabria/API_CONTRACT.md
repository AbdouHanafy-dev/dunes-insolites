# API contract — what the frontend expects from Spring Boot

The frontend talks to the backend through exactly one file:
[`lib/api.ts`](lib/api.ts). To switch from the built-in Next.js routes to your
Spring Boot API, set one variable and nothing else changes:

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.dunes-insolites.tn
```

With it unset, the site uses the local seed data and the routes under
`app/api/*`, so it stays fully clickable with no backend running.

**Two things Spring Boot must do:**

1. **CORS** — allow the site's origin, methods `GET, POST`, header
   `Content-Type`.
2. **Paths** — the frontend calls `${NEXT_PUBLIC_API_URL}/activities`, etc.
   If your controllers sit under `/api/v1`, just include that in the variable:
   `NEXT_PUBLIC_API_URL=https://api.dunes-insolites.tn/api/v1`.

---

## Types

These are the exact JSON shapes the frontend deserializes. The TypeScript
source of truth is [`lib/types.ts`](lib/types.ts).

### Activity

```json
{
  "slug": "camel-trek",
  "title": "Camel Trek",
  "kicker": "01 — RIDE",
  "tagline": "A guided caravan to a Bedouin camp for tea and sunset.",
  "description": "A guided caravan over the dunes to a Bedouin camp for tea and sunset.",
  "longDescription": ["First paragraph.", "Second paragraph."],
  "heroImage": "/images/camel.jpg",
  "cardImage": "/images/camel.jpg",
  "gallery": ["/images/camel.jpg", "/images/gate.jpg"],
  "priceFrom": 45,
  "durationMins": 120,
  "difficulty": "Easy",
  "groupSize": "2–10 riders",
  "included": ["Licensed local guide", "Mint tea at the camp"],
  "notIncluded": ["Gratuities"],
  "meetingPoint": "The Sabria gate, 10 minutes south of Douz",
  "slots": ["morning", "golden-hour"]
}
```

| Field | Java type | Notes |
|---|---|---|
| `slug` | `String` | URL identifier, must be unique — it's the route `/activities/{slug}` |
| `priceFrom` | `int` | Euros, per person |
| `durationMins` | `int` | Minutes |
| `difficulty` | `enum` | `Easy` \| `Moderate` \| `Adventurous` — **exact casing** |
| `slots` | `List<enum>` | `morning` \| `golden-hour` — **exact casing, hyphenated** |
| `heroImage` etc. | `String` | Either a path served by Next (`/images/x.jpg`) or a full URL to your CDN |

### Review

```json
{
  "id": "r1",
  "name": "Marta K.",
  "country": "Poland",
  "rating": 5,
  "date": "2026-05-12",
  "title": "The camp at sunset was the whole trip",
  "body": "We booked the camel trek for the late slot…",
  "activitySlug": "camel-trek",
  "source": "tripadvisor"
}
```

`rating` is an integer 1–5. `source` is one of `direct` | `tripadvisor` |
`getyourguide` | `google`.

### Booking

```json
{
  "id": "DI-MSYHFD",
  "activitySlug": "camel-trek",
  "date": "2026-08-26",
  "timeSlot": "morning",
  "partySize": 2,
  "name": "Abdou Hanafi",
  "email": "abdou@example.com",
  "phone": "+216 20 000 000",
  "notes": "Hotel Sahara, Douz",
  "status": "pending",
  "total": 90,
  "createdAt": "2026-08-16T12:05:35.785Z"
}
```

| Field | Java type | Notes |
|---|---|---|
| `id` | `String` | Human-readable reference the guest quotes at the gate |
| `date` | `String` | **`yyyy-MM-dd`**, not a timestamp |
| `timeSlot` | `enum` | `morning` \| `golden-hour` |
| `status` | `enum` | `pending` \| `confirmed` \| `cancelled` |
| `total` | `int` | Euros. Backend calculates it — never trust a client-sent total |
| `createdAt` | `String` | ISO-8601 |

---

## Endpoints

### `GET /activities`
```json
{ "activities": [ Activity, … ] }
```

### `GET /stats`
```json
{ "guestsGuided": "12k+", "avgRating": "4.9★", "yearsRunning": "8 yrs" }
```
Strings, not numbers — they render verbatim in the experience band.

### `GET /gallery`
```json
{ "items": [ { "src": "/images/camel.jpg", "alt": "Camel at sunset", "tag": "Camel Trek", "tall": true } ] }
```
`tag` must match one of the filter labels; `tall` makes the tile span two rows.

### `GET /reviews` · `GET /reviews?activity={slug}`
```json
{ "reviews": [ Review, … ] }
```

### `GET /availability?activity={slug}&date=yyyy-MM-dd`
```json
{
  "activity": "camel-trek",
  "date": "2026-08-26",
  "slots": [
    { "slot": "morning", "seatsLeft": 8, "available": true },
    { "slot": "golden-hour", "seatsLeft": 0, "available": false }
  ]
}
```
Called on every date change in the booking flow, so keep it fast. Return
`400` with `{"slots": []}` for a past date.

### `POST /bookings`

Request:
```json
{
  "activitySlug": "camel-trek",
  "date": "2026-08-26",
  "timeSlot": "morning",
  "partySize": 2,
  "name": "Abdou Hanafi",
  "email": "abdou@example.com",
  "phone": "+216 20 000 000",
  "notes": "Hotel Sahara, Douz"
}
```

- **`201`** → the full `Booking` object (with `id`, `status`, `total`).
- **`422`** → field errors, keyed by the **exact request field name**:

```json
{ "errors": { "partySize": "Only 1 seat left in that slot.", "email": "That email looks off." } }
```

The frontend paints each message next to its input, so the keys must match:
`activitySlug`, `date`, `timeSlot`, `partySize`, `name`, `email`, `phone`.

**Server-side validation is mandatory** — the client checks the same rules for
UX, but the client can be bypassed:

- `date` is today or later
- `partySize` between 1 and 12
- `timeSlot` is offered by that activity
- the slot still has `partySize` seats free (check inside the transaction —
  two people booking the last seat simultaneously is the real failure mode)

### `GET /bookings/{id}`
`200` → `Booking`, `404` → `{ "error": "Booking not found" }`.

Currently unauthenticated, which means anyone who guesses a reference can read
a booking. Before launch either add a token to the confirmation URL
(`/bookings/{id}?t=…`) or require the email as a second factor.

### `POST /auth/login` · `POST /auth/register`

**Not implemented in this frontend, and deliberately so.** The local
placeholder routes return `501` and the UI says accounts aren't connected yet,
so nothing pretends to sign anyone in. Spring Boot owns all of it.

Request — `/auth/register`:
```json
{ "name": "Abdou Hanafi", "email": "abdou@example.com", "password": "…" }
```
Request — `/auth/login`:
```json
{ "email": "abdou@example.com", "password": "…" }
```

- **`200`/`201`** → `{ "id": "…", "name": "…", "email": "…" }` **and a
  `Set-Cookie` header** carrying the session.
- **`401`** → `{ "error": "Email or password is wrong." }`
- **`422`** → `{ "errors": { "email": "…", "password": "…" } }`

Requirements on the Spring Boot side:

- **Session in an `HttpOnly; Secure; SameSite=Lax` cookie.** Do not return a
  JWT in the JSON body for the frontend to store — anything in `localStorage`
  is readable by any injected script, which turns one XSS into full account
  takeover. The frontend is written to expect a cookie and stores nothing.
- **CORS must send `Access-Control-Allow-Credentials: true`** and name the
  site's exact origin (a wildcard is rejected by browsers alongside
  credentials). I'll add `credentials: "include"` on these two calls once your
  origin is known.
- **Hash with bcrypt/argon2**, never store or log the plaintext.
- **Rate-limit login by IP and by account**, with backoff — without it the
  endpoint is a free password-guessing oracle.
- **Return the same `401` for unknown email and wrong password**, so the
  endpoint can't be used to enumerate who has an account.
- Password reset is currently a link to `/contact`. If you add a real
  reset flow, tell me the endpoints and I'll wire the pages.

### `POST /contact`
Request `{ name, email, subject?, message }` → `201 { "ok": true }` or `422
{ "errors": { … } }`.

### `POST /subscribe`
Request `{ email }` → `201 { "ok": true }` or `422 { "errors": { "email": "…" } }`.

---

## Notes for the Spring Boot side

- **Enum casing.** Jackson will serialize a Java enum `GOLDEN_HOUR` as
  `"GOLDEN_HOUR"`, but the frontend expects `"golden-hour"`. Use
  `@JsonProperty` on the constants or a custom serializer.
- **Dates.** `date` is a `LocalDate` formatted `yyyy-MM-dd`. Don't send a
  full timestamp — the frontend parses it as a plain date and a timezone
  offset will shift trips to the wrong day.
- **Money.** `priceFrom` and `total` are whole euros. If you move to decimals,
  tell me and I'll adjust the formatting.
- **Availability concurrency.** The seat check and the insert must be in one
  transaction with a row lock, or you will oversell golden-hour slots.
- **Errors.** Any non-2xx without an `errors` object shows a generic message.
  Return the `errors` map wherever you want a field-level message shown.

## When you send me the backend

Give me the base URL and either the OpenAPI/Swagger JSON or the controller
classes, and I'll reconcile the two — including adapting the frontend if your
existing DTOs differ from the shapes above. Nothing here is load-bearing on
your side; it's just what the UI reads today, and it's all in one file to
change.
