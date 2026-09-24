# État du projet — 23 septembre 2026

Photographie de ce qui existe, de ce qui manque et de ce qui attend une décision,
après la session « backoffice + paiements + emails ». Elle complète
[`PROJECT-AUDIT-2026-09-20.md`](PROJECT-AUDIT-2026-09-20.md) (notes, risques,
sécurité) sans le remplacer. Si un fait ici contredit le code, **le code a raison** :
corrigez ce document.

`docs/ROADMAP.md` et `docs/OPEN-QUESTIONS.md` ont été supprimés au commit
`d73c7e2` (nettoyage de l'environnement local). Ils restent lisibles dans
l'historique (`git show d73c7e2^:docs/OPEN-QUESTIONS.md`) mais ne sont plus la
source de vérité ; les décisions en attente sont listées plus bas.

---

## 1. Ce qui existe

### Backoffice (`admin/`, Next.js 16, port 3100)

- **Coquille** : barre latérale sombre (navy-950), icônes **Bootstrap Icons**
  (paquet `bootstrap-icons`, classes `bi bi-…`, feuille importée dans
  `app/layout.tsx`). Aucun SVG dessiné à la main, plus d'emojis.
- **Tableau de bord** (`/`) : stats + les 10 réservations les plus proches
  (`ReservationsTable` avec `limit={10}`, 5 par page).
- **Réservations** (`/reservations`) : `components/reservations/ReservationsTable.tsx`
  — recherche instantanée, tri par colonne, pagination par 5, statuts colorés,
  colonne Paiement, actions œil (aperçu) / crayon / corbeille (admin seulement,
  confirmation). Charge 200 lignes max et filtre côté client.
- **Nouvelle réservation** (`/reservations/new`) : formulaire en deux colonnes,
  nuitée ou circuit, choix de la **langue des emails** du client.
- **Fiche réservation** (`/reservations/[id]`) :
  - *Statut* : boutons limités aux transitions permises par
    `ReservationStateMachine` (miroir dans `ReservationStatusPanel`). **Confirmer**
    ouvre une fenêtre : montant à demander maintenant + lien de paiement, puis
    `PUT …/payment-terms` et `PATCH …/status`.
  - *Paiement* (`ReservationPaymentPanel`) : total / reçu / reste, envoi ou renvoi
    de la demande de paiement, enregistrement d'un paiement reçu (avec case
    « prévenir le client »), liste des paiements.
  - *Modifier* (`ReservationEditForm`) : dates, effectif, groupe, demande spéciale,
    langues, langue des emails — **statuts En attente et Confirmée seulement**.
  - *Équipe* (guides / chauffeurs) : inchangé.
- **Paramètres → Règles de paiement** (`PaymentPolicyForm`) : acompte aucun /
  pourcentage / intégral, délai, moyens acceptés, note ajoutée aux emails.
- Couleurs de statut et de paiement : un seul fichier,
  `components/reservations/reservationStatus.ts` (ajoute aussi `isEditable`).

### Backend (Spring Boot)

- **Migrations à appliquer (redémarrer le backend)** :
  - `V39__payment_policy.sql` — table `payment_policy` (une ligne, `id = 1`),
    valeurs par défaut = comportement d'avant (acompte 10 %).
  - `V40__reservation_locale_and_deposit.sql` — `reservations.locale` (défaut
    `fr`) et `reservations.deposit_amount` (null = suivre la politique ; 0 =
    aucun acompte pour cette réservation).
- **Règles de paiement** : `PaymentPolicy` / `PaymentPolicyController`
  (`/api/payment-policy`, lecture ADMIN+CAMPING, écriture ADMIN).
- **Demande de paiement** : `PaymentRequestService` +
  `PaymentRequestController` — `POST /api/reservations/{id}/payment-request`
  (enregistre lien/montant et envoie), `PUT …/payment-terms` (enregistre sans
  envoyer). Montant demandé = montant fixé sur la réservation, sinon la politique,
  moins ce qui est déjà encaissé. Toujours calculé côté serveur.
- **Emails de réservation localisés** : paquet `mail/` — `ReservationMailer`,
  `MailMessages`, textes dans `resources/mail/messages_{fr,en,de,it,da,ar}.properties`
  (l'arabe est rendu de droite à gauche). Trois emails : *demande reçue*,
  *confirmation / demande de paiement*, *paiement reçu*. Un test échoue si une
  langue manque une clé. Les anciens emails réservation de `EmailService` ont
  été supprimés (il n'y a plus d'email « accepté » séparé).
- **Langue du client** : `Reservation.locale`, alimentée par le site public
  (`frontend/lib/publicBookingProxy.ts` lit le préfixe de langue de la page
  d'où part le formulaire) ou par le formulaire du backoffice.
- **Paiement reçu** : `TransactionRequest.notifyClient` (absent = on prévient).
  Déclenché aussi depuis la page Paiements.

### Tarification par type de voyageur et activités chronométrées (24 sept.)

- **Trois types de voyageurs** partout : adultes (18 ans et +), enfants (3 à 18 ans),
  **bébés (0 à 3 ans)**. Les bébés ont leur propre prix (0 = gratuit, valeur par défaut) mais ne
  comptent ni dans la limite de groupe (`MAX_PARTY_SIZE`) ni dans la capacité d'un hébergement.
  Ils sont plafonnés à `MAX_INFANTS` (6), constante du contrat `packages/api-types`.
- **Prix saisis dans le backoffice** : circuits (`TourWizard`) et séjours (`HebergementsCrud`)
  ont prix adulte / enfant / bébé ; les **types d'hébergement** (tente, chambre, suite) sont
  désormais tarifés **par personne et par nuit**, un prix par type de voyageur, au lieu d'un prix
  par unité. Enfant vide = prix adulte, bébé vide = gratuit. Les tarifs partenaires ne changent pas.
- **Qui dort où** : une seule catégorie choisie = tout le groupe y dort ; plusieurs (formulaire
  `/camp` uniquement) = le voyageur répartit adultes / enfants / bébés, et la somme doit égaler le
  groupe (`AccommodationPricingService#splitGuests`, revérifié côté serveur).
- **Règles de prix (dates / périodes)** : une règle fixe le prix adulte ; enfant et bébé suivent
  dans le même rapport.
- **Activités chronométrées** : `Extra` a `baseDurationMinutes` (30 par défaut), `durationStepMinutes`
  et `maxDurationMinutes`, saisis en minutes dans le backoffice. Le prix unitaire est le prix de la durée
  de base ; le prix d'une séance = prix × minutes ÷ base (`ExtraDurationPricing`). Max = base : le client
  ne peut pas allonger. Le site affiche un − / + (30 min, 1 Hour, 1:30H, 2H…) sur `/book`, `/camp` et les
  circuits. Les activités gardent **un seul prix** (pas de prix par âge) ; les bébés n'y comptent pas.
- **Migrations à appliquer** : `V49__activity_timing.sql` (durées, reprise du texte libre `duration`
  quand il est lisible) et `V50__infants_and_per_person_tiers.sql` (bébés, prix par personne des
  hébergements). `V50` reprend l'ancien prix unitaire comme **prix unitaire ÷ capacité** pour l'adulte
  (un logement plein coûte pareil qu'avant), enfant = adulte, bébé = 0. Les anciennes lignes de réservation
  gardent leur total par unité.

### Site public (`frontend/`)

- Page d'accueil allégée (23 sept.) : chiffres clés uniquement dans le hero,
  coordonnées et adresse uniquement dans *Location*, bandeau *Experience*
  réduit à la photo et à sa phrase, CTA final = note d'heure d'arrivée seulement.
  Ordre des sections **inchangé** (les circuits en premier est une décision du
  propriétaire).
- Bouton **retour en haut** (`ScrollToTop`, toutes les pages, traduit en 6 langues).
- `suppressHydrationWarning` sur `<html>` (le module LanguageTool ajoute
  `data-lt-installed` et déclenchait un avertissement d'hydratation).

---

## 2. Modèle à retenir

- **Deux statuts indépendants.** Statut de réservation (`PENDING`, `CONFIRMED`,
  `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `REJECTED`, `EXPIRED`) régi par
  `ReservationStateMachine` ; statut de paiement (`UNPAID`, `PARTIALLY_PAID`,
  `PAID`…) **dérivé** des transactions par `PaymentServiceImpl.computePaymentSummary`,
  jamais saisi à la main.
- **Aucun paiement en ligne intégré.** `Reservation.paymentLink` est une URL collée
  par le personnel ; le paiement se fait hors application puis se saisit à la main.
- La liste « active » du backend contient tout sauf `COMPLETED` (donc aussi annulées,
  refusées, expirées), triée par date à venir, pas par date de création.

---

- **Un hébergement est tarifé par personne.** Total d'une catégorie =
  (adultes × prix adulte + enfants × prix enfant + bébés × prix bébé) × nuits, prix copiés sur la
  réservation (`ReservationAccommodation`) : un changement de catalogue ne bouge jamais une réservation
  existante. Modifier le groupe d'une réservation à une seule catégorie la suit (avec contrôle de
  capacité) ; à plusieurs catégories, le serveur refuse et demande de re-choisir la répartition.

## 3. Ce qui manque ou reste imparfait

| Sujet | Détail |
|---|---|
| Emails de compte en français seulement | bienvenue, vérification, réinitialisation, invitation chauffeur, invitation « compte créé » d'un invité. Les utilisateurs n'ont pas de langue enregistrée. |
| Traductions à faire relire | de / it / da / ar rédigées sans relecture native. |
| Réservations closes non modifiables | le backend refuse la modification en `CHECKED_IN` / `COMPLETED` / `CANCELLED` ; la machine d'états interdit de sortir d'un état terminal. Le formulaire n'apparaît que pour En attente / Confirmée. |
| Modifier une réservation confirmée la repasse en attente | comportement historique du backend, valable aussi pour le personnel. L'interface l'annonce. |
| Envoi d'email invisible en cas d'échec | les envois pilotés par le personnel sont asynchrones et ne font que journaliser. Le mot de passe SMTP local est vide : rien ne part depuis un poste de dev. |
| Modification réservée à l'admin | `PUT /api/reservations/{id}` : ADMIN, CLIENT, PARTENAIRE. Le rôle CAMPING ne peut pas modifier. |
| Enregistrer un paiement | exige la permission TRANSACTIONS « full » ; certains rôles reçoivent un refus. |
| Pas de relance ni d'annulation automatique | rien ne se passe si l'acompte n'arrive pas avant l'échéance. |
| Pas de remboursement | le statut `REFUNDED` existe mais aucun parcours. |
| Liste des réservations | 200 lignes max, recherche et tri côté client. Au-delà : passer côté serveur. |
| Tableau de bord « récentes » | ce sont les 10 plus proches par date de séjour, pas les 10 dernières créées. |
| Clés de traduction orphelines | espace `experience` (`guestsGuided`, `averageRating`, `newRating`, `onTheDunes`, `yearsUnit`) dans les 6 fichiers `frontend/messages/*.json`. |
| Documentation | `README.md` racine et `docs/README.md` pointaient vers des fichiers supprimés ; corrigé ici, mais `ARCHITECTURE.md` §10 (backoffice) décrit encore l'état d'avant cette session. |
| Tarifs par voyageur et durées non testés de bout en bout | les tests unitaires couvrent les montants (serveur et site) ; les tests d'intégration `accommodation/*IT` ont été adaptés mais **pas exécutés** (ils exigent Postgres, Keycloak, RabbitMQ), et l'interface n'a pas été vérifiée dans un navigateur. |
| Répartition des voyageurs entre catégories | seule la page `/camp` la propose ; le formulaire admin d'édition ne permet pas de re-répartir, il faut re-sélectionner les hébergements. |
| Brouillon `/camp` | il mémorise les bébés mais pas les durées d'activité ni la répartition par catégorie. |
| Formulaire admin « Nouvelle réservation » | il réserve la durée de base des activités et une seule catégorie (tout le groupe). |
| Secrets | mot de passe d'application Gmail non révoqué, hôte distant `79.143.185.33` non vérifié — voir `CLAUDE.md`, « Current state ». |

## 4. Décisions à prendre (propriétaire / comptable)

1. **Réservations closes** : autoriser la correction des champs anodins seulement
   (nom du groupe, notes, langues) ou tout, y compris rouvrir une annulée ?
   Recommandation : le premier pour annulée/terminée ; refusée/expirée peuvent tout
   accepter (elles n'occupent aucun stock).
2. **Modifier une réservation confirmée** : garder le retour en attente, ou laisser
   le personnel corriger sans changer le statut ?
3. **Rôle CAMPING** : peut-il modifier une réservation ?
4. **Acompte par défaut** : 10 % est-il la bonne valeur de départ ? Délai avant
   arrivée ? Moyens cochés par défaut ?
5. **Impayé à l'échéance** : relance automatique, annulation automatique, ou rien ?
6. **Langues des emails de compte** : mémoriser la langue de l'utilisateur à
   l'inscription et à la réservation invité, puis traduire les cinq emails ?
7. **Passerelle de paiement** (Paymee / Konnect / Flouci / Stripe) : toujours en
   suspens ; conditionne remboursements, relances et rapprochement automatique.

## 5. Vérifier

```bash
npm run verify          # typecheck + lint + tests web + tests unitaires backend + config prod
npm run dev:admin       # backoffice sur http://localhost:3100
npm run dev             # site public sur http://localhost:3000
```

Le backend doit tourner avec le profil local (voir `CLAUDE.md`) et avoir appliqué
V39 à V50 (V49 et V50 : durées d'activité, bébés et prix par personne). Rien de cette session n'a été essayé contre une vraie base ni un vrai
serveur SMTP : les tests unitaires couvrent les montants, les traductions et le rendu
des emails, pas le parcours complet.
