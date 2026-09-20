# Frontend public Dunes Insolites

Application Next.js 16 pour la vitrine, la réservation, l'espace client et
l'espace chauffeur. Le contenu public est multilingue (`fr`, `en`, `de`, `it`,
`da`, `ar`) et provient normalement de l'API Spring Boot.

## Commandes

```bash
npm run dev --workspace frontend
npm run typecheck --workspace frontend
npm run lint --workspace frontend
npm run test --workspace frontend
npm run build --workspace frontend
```

## Configuration

`NEXT_PUBLIC_API_URL` doit pointer vers le backend. Les seeds locaux ne sont
servis que si `ALLOW_SEED_FALLBACK=true` est explicitement activé ; un build de
production sans backend échoue volontairement.

Les routes `app/api/*` jouent le rôle de BFF/proxy. Les anciens chemins de
fallback local peuvent encore contenir une implémentation en mémoire, mais ils
ne sont pas utilisés lorsque l'API réelle est configurée.

## Principaux espaces

- vitrine : camp, hébergements, activités, circuits, articles, FAQ, galerie ;
- réservation : séjour, circuit et activité ;
- client : réservations, paiements, profil, avis et support ;
- chauffeur : courses et calendrier affectés par l'admin.

## Références

- état courant : [`../docs/PROJECT-AUDIT-2026-09-20.md`](../docs/PROJECT-AUDIT-2026-09-20.md)
- contrat API : [`API_CONTRACT.md`](API_CONTRACT.md)
- règles Next.js locales : [`AGENTS.md`](AGENTS.md)
