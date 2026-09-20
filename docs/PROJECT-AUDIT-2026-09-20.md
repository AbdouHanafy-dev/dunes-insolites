# Audit du projet Dunes Insolites

**Date de référence :** 20 septembre 2026

**Périmètre :** vitrine publique, espace client/chauffeur, backoffice, API, base de données, sécurité, tests, CI/CD et documentation.
**Source de vérité :** état du dépôt local au moment de l'audit, y compris les changements non encore commités.

## Verdict exécutif

Le projet n'est plus un prototype. C'est une plateforme métier cohérente, avec une vraie API, une base versionnée, des prix calculés côté serveur, des protections de concurrence, un backoffice riche et des espaces séparés pour les clients et les chauffeurs.

La qualité d'ingénierie est bonne. Le principal risque n'est plus la structure technique, mais la finition opérationnelle : vérifier la production, automatiser un vrai parcours navigateur, finaliser le prix du transport, faire valider les décisions comptables/légales et remplacer les données métier encore provisoires.

| Axe | Note | Lecture |
|---|---:|---|
| Architecture | **8,5/10** | Découpage clair, BFF Next.js, API Spring, Flyway, Keycloak et RabbitMQ |
| Réservation et règles métier | **9/10** | Prix serveur, snapshots, idempotence, disponibilité et verrous de concurrence |
| Backend | **8,5/10** | Domaine riche et bien testé ; quelques dettes de configuration et de périmètre société |
| Vitrine et UX | **7,5/10** | Parcours complet et multilingue ; redesign encore récent, couverture UI faible |
| Backoffice | **8/10** | Très complet ; tarification transport après demande encore incomplète |
| Sécurité et confidentialité | **8/10** | Autorisations, IDOR, secrets et erreurs traités ; décisions GDPR encore ouvertes |
| Tests | **8/10** | Bonne couverture réelle ; fixtures réparées, validation CI complète attendue après push, E2E navigateur encore absent |
| Exploitation / production | **6,5/10** | CI/CD et runbooks présents ; disponibilité, restauration et alertes à prouver régulièrement |
| Documentation avant cet audit | **5/10** | Beaucoup de contenu utile, mais plusieurs documents décrivaient un ancien état |
| **État global** | **7,9/10** | Solide techniquement ; le push doit confirmer la dernière correction d'intégration en CI |

**Préparation production : 7,0/10.** Le site peut fonctionner, mais je ne considérerais pas le périmètre totalement terminé tant que les éléments P0 ci-dessous ne sont pas fermés.

## Éléments vérifiés

- 488 fichiers Java dans le backend.
- 23 migrations Flyway, de V1 à V23.
- 34 pages publiques/espace utilisateur et 62 pages admin détectées.
- 131 tests backend unitaires : **131 réussis** le 20 septembre 2026.
- 42 tests frontend : **42 réussis**.
- 15 tests admin : **15 réussis**.
- 15 classes d'intégration backend utilisant PostgreSQL/RabbitMQ via Testcontainers.
- Première exécution complète du 20 septembre : **106 scénarios, 14 erreurs, 0 échec d'assertion**. Les fixtures ont ensuite été réparées pour nettoyer les nouveaux `account_action_tokens`.
- Deuxième exécution complète : **105/106 réussis**, avec un seul helper de facturation gardant une fausse session admin pendant un checkout public. Le helper a été corrigé puis la classe `ReservationInvoiceIT` a réussi **5/5** en ciblé. La CI du push doit confirmer une troisième exécution complète verte.
- TypeScript strict et lint : **réussis** pour frontend, admin et types partagés.
- CI GitHub : scan de secrets, audit npm, tests unitaires, tests d'intégration, contrôle de configuration production, déploiement puis smoke check.
- La migration V23 et le champ `arrivalMode` ont été validés contre PostgreSQL pendant les tests d'intégration.

Le contrôle HTTP externe effectué pendant l'audit n'a pas permis de certifier la disponibilité de la production : la sonde web a reçu un `503` sur le domaine public et le réseau du terminal local ne pouvait pas joindre les domaines. Ce résultat peut provenir de l'environnement de contrôle ; il impose un smoke test depuis un réseau normal et depuis le VPS, mais ne suffit pas à déclarer seul une panne de production.

## Ce qui fonctionne aujourd'hui

### Réservation publique

- Séjours, circuits et activités sont servis par l'API réelle.
- Le client choisit ses dates, voyageurs, langue préférée, mode d'arrivée, activités et notes.
- Les prix soumis par le navigateur ne sont pas fiables : le backend recalcule les montants.
- Les réservations publiques sont idempotentes et créées en `PENDING`.
- Un compte client invité est créé automatiquement si nécessaire.
- Le client reçoit un lien à usage unique pour définir son mot de passe.
- Une fois connecté, il retrouve ses réservations et leurs statuts dans l'espace client.

### Guide et transport

- Le client ne choisit pas une personne précise comme guide ; il choisit une langue préférée.
- Le client déclare `OWN_VEHICLE` ou `TRANSPORT`.
- L'admin voit la demande de transport et affecte un chauffeur depuis un annuaire permanent.
- Le backend protège contre une double affectation du chauffeur à la même date.
- Le chauffeur se connecte avec le compte créé par l'admin et consulte ses courses dans son calendrier/espace.
- Le client peut voir l'équipe affectée à sa réservation.

### Catalogue et contenu

- Tours, hébergements, activités/extras, options, langues, règles tarifaires et capacités sont administrables.
- Pages CMS, articles, FAQ, navigation, médias, galerie et avis disposent d'écrans admin.
- Six langues sont routées : français, anglais, allemand, italien, danois et arabe.
- Sitemap, robots, JSON-LD, redirections et écrans SEO existent.

### Sécurité et robustesse

- Keycloak gère les identités et rôles.
- Les vérifications de propriété empêchent un client de lire ou modifier la réservation d'un autre.
- Les montants utilisent `BigDecimal` et une politique d'arrondi centralisée.
- Les réservations concurrentes utilisent des verrous PostgreSQL sur les inventaires critiques.
- Flyway est l'autorité du schéma et Hibernate valide le résultat.
- Les messages email/notification utilisent RabbitMQ avec retry et dead-letter queue.
- Les logs masquent les principales données personnelles.
- Le démarrage production échoue si les secrets ou endpoints critiques manquent.

## Manques prioritaires

### P0 — avant de considérer le flux commercial terminé

#### 1. Confirmer la suite d'intégration en CI

**Constat :** les 14 erreurs initiales ont été corrigées ; la seconde suite complète a réussi 105/106 et le dernier cas a ensuite réussi dans sa classe ciblée.

**À faire :**

- laisser la CI GitHub exécuter la suite complète sur un runner propre ;
- si nécessaire, empêcher les anciens contextes Spring de garder des consommateurs RabbitMQ sur des containers déjà arrêtés ;
- réduire le bruit de logs produit pendant les transitions Testcontainers.

**Critère de fin :** le job GitHub `integration` du commit est vert, puis une seconde exécution consécutive reste verte.

#### 2. Finaliser le tarif transport côté admin

**Constat :** l'admin peut voir la demande et affecter un chauffeur, mais le panneau actuel n'a pas de champ métier permettant de chiffrer le transport et d'ajouter ce montant de façon auditée au total. Le message « confirmez le tarif » est donc en avance sur l'implémentation.

**À faire :**

- créer une ligne tarifaire transport avec libellé, quantité, prix unitaire, devise et snapshot ;
- recalculer le total uniquement côté serveur ;
- garder l'historique de l'auteur et de la date de modification ;
- afficher le montant au client avant paiement ;
- inclure la ligne dans proforma/facture ;
- tester changement, annulation et concurrence.

**Critère de fin :** une demande `TRANSPORT` peut passer de « à chiffrer » à « chiffrée + chauffeur affecté », sans édition manuelle opaque du total.

#### 3. Ajouter un vrai E2E navigateur reproductible

Les tests backend sont excellents, mais aucune suite Playwright/Cypress propre au projet ne couvre encore le parcours complet.

Scénario minimal automatisé :

1. réserver un circuit comme invité ;
2. choisir langue, transport et extras ;
3. vérifier la réservation `PENDING` et l'email d'activation ;
4. activer le compte et se connecter ;
5. vérifier la réservation dans l'espace client ;
6. se connecter comme admin, chiffrer le transport et affecter un chauffeur ;
7. se connecter comme chauffeur et voir la course dans le calendrier ;
8. confirmer que le client voit le statut, le montant et l'affectation.

#### 4. Faire un smoke test production complet

- homepage, pages catalogue et article ;
- réservation réelle contrôlée puis supprimée ;
- email reçu dans une vraie boîte ;
- login client, admin et chauffeur ;
- affectation chauffeur ;
- santé backend, RabbitMQ, PostgreSQL et espace disque ;
- crawl des anciennes URL et vérification des redirections.

#### 5. Valider les données métier publiées

- vrais tarifs adulte/enfant/partenaire ;
- capacités et nombres d'unités ;
- tarifs transport ;
- téléphone, WhatsApp, emails et réseaux sociaux ;
- photos avec droits d'utilisation ;
- avis réellement publiés et traçables ;
- conditions d'annulation et textes légaux validés.

### P1 — prochain cycle

#### Paiement

Le paiement reste fondé sur un lien saisi par l'admin. Il manque le choix du prestataire, les webhooks signés, l'idempotence fournisseur, les remboursements et la réconciliation automatique.

#### Comptabilité

La séquence documentaire partagée entre deux entités reste une décision comptable bloquante. Aucun changement historique ne doit être improvisé avant avis de l'expert-comptable.

#### Isolation des sociétés

La protection par utilisateur est en place, mais l'isolation complète Dunes Insolites / Route Insolite n'est pas appliquée partout au niveau des repositories et des claims. À terminer avant un vrai usage simultané par les deux sociétés.

#### Exploitation

- prouver une restauration depuis une sauvegarde hors serveur ;
- activer des alertes externes et vérifier leur réception ;
- documenter et répéter un rollback ;
- ajouter un environnement staging stable avant le déploiement direct sur `main` ;
- distribuer le rate limiting si plusieurs instances backend sont lancées.

#### Juridique et contenu

- valider GDPR, conservation, suppression/anonymisation et sous-traitants ;
- faire relire les traductions commerciales par des locuteurs natifs ;
- faire valider les traductions juridiques par une personne qualifiée ;
- terminer la politique cookies/analytics selon les décisions légales.

#### Frontend

- ajouter des tests de composants sur les formulaires de réservation ;
- faire un audit clavier, lecteur d'écran, contraste et mobile réel ;
- vérifier toutes les branches vides/erreur/chargement ;
- réduire progressivement les très gros fichiers CSS et composants de formulaire.

### P2 — dette maîtrisable

- partager davantage les types API avec l'admin au lieu de maintenir certains types en double ;
- désactiver explicitement `spring.jpa.open-in-view` après vérification des requêtes ;
- corriger l'avertissement Node lié à `shell: true` dans le lanceur Maven ;
- préparer Mockito comme agent avant que les futurs JDK bloquent l'attachement dynamique ;
- améliorer les tests de performance et de charge sur les disponibilités ;
- archiver périodiquement les rapports datés pour éviter qu'ils redeviennent des sources de vérité.

## Feuille de route recommandée

| Ordre | Lot | Estimation indicative | Sortie attendue |
|---:|---|---:|---|
| 1 | Stabiliser les tests d'intégration | 0,5–1,5 jour | deux suites complètes vertes consécutives |
| 2 | Tarif transport administrable | 2–4 jours | montant transport audité, visible et facturable |
| 3 | E2E Playwright du parcours principal | 2–3 jours | test automatique client → admin → chauffeur |
| 4 | Audit production + email réel | 1 jour | rapport horodaté avec preuves |
| 5 | Données métier et juridique | dépend du métier | catalogue publiable sans placeholders |
| 6 | Sauvegarde, alertes et rollback | 2–3 jours | restauration et alerte réellement testées |
| 7 | Paiement fournisseur | 5–10 jours | paiement et webhooks sûrs |
| 8 | Isolation complète des sociétés | 5–8 jours | périmètre Dunes/Route garanti côté serveur |
| 9 | Accessibilité, composants et performance | continu | UX durable et régressions mieux couvertes |

## Décision go/no-go

**Go pour une bêta contrôlée avec confirmation manuelle : après remise au vert de la suite d'intégration**, avec un opérateur qui surveille les demandes et des données métier vérifiées.

**Go pour une exploitation autonome complète : pas encore.** Les cinq P0 doivent être fermés, en particulier la CI, la tarification transport et le test réel de production.

## Règle documentaire à partir de maintenant

- Ce document est la photographie de l'état au 20 septembre 2026.
- `docs/ROADMAP.md` conserve l'historique détaillé des phases, mais ne doit plus être lu comme l'état courant.
- `docs/reports/` contient des preuves historiques datées.
- Les décisions non techniques restent dans `docs/OPEN-QUESTIONS.md`.
- Les procédures d'exploitation restent dans `docs/runbooks/`.
- Après chaque lot majeur, mettre à jour ce document ou créer un nouvel audit daté, puis relier le plus récent depuis `docs/README.md`.
