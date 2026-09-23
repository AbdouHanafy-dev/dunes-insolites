# Documentation

## Commencer ici

1. [État du projet au 23 septembre 2026](PROJECT-STATE-2026-09-23.md) — ce qui existe, ce qui manque, décisions à prendre. **À lire en premier.**
2. [Audit courant du projet](PROJECT-AUDIT-2026-09-20.md) — notes, risques, sécurité et prochaines étapes.
3. [README racine](../README.md) — démarrage et structure du dépôt.
4. [Architecture](../ARCHITECTURE.md) — conception détaillée ; document historique à confronter à l'audit courant.
5. Décisions métier en attente : section 4 de l'état du projet (l'ancien `OPEN-QUESTIONS.md` a été supprimé, il reste dans l'historique git).

## Documents actifs

- `runbooks/` — déploiement, incidents, sauvegarde, emails, monitoring, sécurité et SEO.
- `adr/` — décisions d'architecture acceptées ou proposées.
- `security/authorization-matrix.md` — matrice d'autorisation.
- `privacy/` — inventaire des données et décisions légales.
- `seo/` et `seo-baseline/` — contrats d'URL et preuves de migration.
- `SPACES-AND-WORKFLOW.md` — description des espaces ; certaines sections antérieures au 20 septembre sont historiques.

## Historique

- `reports/` contient des audits et rapports datés. Ils prouvent ce qui était vrai à leur date, mais ne remplacent pas l'audit courant.
- L'ancien `ROADMAP.md` (supprimé au commit `d73c7e2`) reste lisible dans l'historique git ; ses dates et états ne sont plus une promesse.
- Les PDF sont conservés comme archives de cadrage, pas comme source de vérité exécutable.

## Entretien

Un document non daté qui décrit l'état du produit doit pointer vers l'audit courant. Une nouvelle photographie globale doit être créée sous la forme `PROJECT-AUDIT-AAAA-MM-JJ.md` (audit) ou `PROJECT-STATE-AAAA-MM-JJ.md` (existant / manquant / décisions), puis ajoutée en première position ci-dessus. Après chaque session qui change ce qui existe, mettre à jour le dernier `PROJECT-STATE` plutôt que d'en empiler.
