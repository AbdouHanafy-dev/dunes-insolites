# Dunes Insolites

Booking platform for two Tunisian desert businesses sharing one system:
**Dunes Insolites** (camp stays and activities at Sabria) and **Route Insolite**
(multi-day Sahara circuits from Djerba).

---

## Quick start

```bash
npm install          # once, at the root — installs every workspace

npm run dev          # frontend at localhost:3000
npm run backend:run  # API at localhost:8080

npm run verify       # typecheck + lint + backend compile
```

The backend needs Postgres, Keycloak and RabbitMQ:

```bash
cd backend && docker compose up -d
```

Copy `backend/.env.example` to `backend/.env` and fill it in. **`.env` is
gitignored and must stay that way.**

---

## Layout

```
frontend/      Next.js 16 — the public site (espace client)
backend/       Spring Boot 4 — the API, plus docker-compose
packages/
  api-types/   the wire contract, imported by every frontend
scripts/       cross-platform tooling
design/        design handoff + brand assets
docs/          roadmap, ADRs, open questions, plans
```

---

## Documentation

| | |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | **Start here.** Working agreement, conventions, rules |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How the system is built, and its known debt |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | What ships when |
| [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md) | Decisions still needed, and who owns each |
| [`docs/adr/`](docs/adr/) | Architecture decision records |
| [`docs/proposals/`](docs/proposals/) | Proposals under consideration |

---

## Stack

**Frontend** — Next.js 16.3.1 · React 19 · Tailwind v4 · TypeScript strict

**Backend** — Spring Boot 4.0.3 · Java 21 · PostgreSQL 16 · Keycloak 26 ·
RabbitMQ 3 · MapStruct

---

## Status

Pre-launch. Target: **15 September 2026**.

Replaces a live WordPress site with 53 indexed URLs and real French search
rankings, so the URL migration is the one irreversible step — see
`docs/ROADMAP.md` before touching routing or slugs.
