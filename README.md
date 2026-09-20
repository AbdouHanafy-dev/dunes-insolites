# Dunes Insolites

Plateforme de réservation pour Dunes Insolites et Route Insolite : vitrine
publique, espace client/chauffeur, backoffice et API dans un monorepo.

## État courant

La plateforme fonctionnelle est en phase de hardening. La note, les preuves,
les risques et les prochaines étapes sont dans
[`docs/PROJECT-AUDIT-2026-09-20.md`](docs/PROJECT-AUDIT-2026-09-20.md).

## Démarrage local

```bash
npm install
cd backend
Copy-Item .env.example .env
docker compose up -d
cd ..
npm run backend:run
npm run dev
```

Le frontend est servi sur `localhost:3000`. Le backoffice se lance séparément
avec `npm run dev:admin`. PostgreSQL, Keycloak et RabbitMQ sont nécessaires au
backend.

## Structure

```text
frontend/      Next.js 16 — vitrine, réservation, espace client/chauffeur
admin/         Next.js 16 — backoffice
backend/       Spring Boot 4 / Java 21 — API et règles métier
packages/      contrats TypeScript partagés
scripts/       validation, SEO, release et seeds
nginx/         configuration d'entrée et migration SEO
docs/          audit, décisions, runbooks et rapports historiques
```

## Vérification

```bash
npm run typecheck
npm run lint
npm run test:web
npm run backend:test:unit
npm run backend:test:it
```

`npm run verify:full` regroupe ces contrôles. Les tests d'intégration exigent
Docker.

## Documentation

- [Index de la documentation](docs/README.md)
- [Audit courant](docs/PROJECT-AUDIT-2026-09-20.md)
- [Architecture détaillée](ARCHITECTURE.md)
- [Questions métier ouvertes](docs/OPEN-QUESTIONS.md)
- [Runbooks](docs/runbooks/)

Les anciens PDF, roadmaps et rapports datés sont des archives de décision, pas
la source de vérité sur l'état actuel.
