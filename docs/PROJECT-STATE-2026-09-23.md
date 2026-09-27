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

### Journal d’activité (25 sept.)
- **Qui a fait quoi** : `audit_log` (V55), alimentée par `AuditLogFilter` pour toute
  écriture authentifiée (POST/PUT/PATCH/DELETE) sur l’API. On y lit la personne (jeton),
  l’action, le type et l’identifiant de l’objet, son **nom avant modification** (un circuit
  supprimé reste identifiable), le statut HTTP, l’IP et l’appareil. Aucun corps de requête.
- **Consultation** : `/administration/journal` (ADMIN seulement, volontairement hors matrice de
  permissions). Le proxy du backoffice transmet `X-Real-IP` et `User-Agent` ; sans cela le
  backend ne verrait que l’adresse du conteneur.
- **Limites** : les 401 et les refus par règle d’URL (avant les contrôleurs) ne sont pas
  journalisés ; l’identifiant d’un objet créé n’est pas relevé (POST) ; l’IP vient du proxy,
  fiable seulement derrière nginx. **Durée de conservation non décidée** (e-mail et IP du
  personnel = données personnelles). Tests d’intégration non exécutés (Docker arrêté).

### Réservation d’un circuit : parcours simplifié (26 sept.)
- Étapes : date et voyageurs → langue → ville de départ et de retour → (améliorations) → activités → récap.
  Plus de question « véhicule » ni de choix d’hébergement : la nuit au camp est incluse dans le prix du circuit.
- Une ville de retour hors liste s’écrit librement (`reservations.return_city_other`, V57) et est facturée par l’option
  « Autre ville de retour » (`TOUR_OPTION`, `serviceType RETURN_CITY`, ajoutée côté serveur).
- Passer en tente individuelle / en suite : extras de catégorie `TOUR_OPTION`, unité `PER_PERSON_NIGHT`
  (prix × voyageurs × nuits du circuit = jours − 1), avec un **minimum de voyageurs réglable par option**
  (`extras.min_party_size`, contrôlé aussi par le serveur). Créés **inactifs à 0 €** par le seeder : prix, minimum
  et activation dans Catalogue › Véhicules & options circuits.
- La page générale `/book` n’a plus sa propre copie du parcours circuit : après Type et Choix elle affiche le même `TourBookingFlow`
  que la page du circuit (`embedded`), pour que les deux ne divergent plus.
- Backoffice : rubrique **Catalogue › Améliorations circuits** (`/catalogue/ameliorations`) pour ajouter, renommer, tarifer, masquer les
  améliorations et l’option « Autre ville de retour » (avec tarifs par date). Sur le site l’étape est toujours affichée ; une option dont
  le minimum de voyageurs n’est pas atteint est grisée avec la raison (le serveur refuse quand même).
- **À confirmer** : la règle des nuits (jours − 1) ; l’hébergement inclus n’est plus réservé par le formulaire, donc
  le camp ne compte plus les tentes des circuits (affectation par l’équipe). Modification de la logique de prix
  (`ReservationServiceImpl`, un cas de plus) testée côté public seulement, pas de bout en bout.

### Devise d’affichage : EUR / USD / TND (26 sept.)
- Sélecteur dans l’en-tête à côté de la langue (`CurrencySwitcher`), choix mémorisé dans le navigateur. Les pages restent
  statiques et rendues en euros ; `<Price>` / `<PriceText>` (client) convertissent l’affichage après chargement.
  Les phrases traduites reçoivent le montant en jeton (`priceToken`) au lieu de « €{price} ».
- **Affichage seulement** : les réservations, prix serveur, e-mails, factures et pages de compte restent en euros ; le sélecteur le dit.
- Taux : réglables dans Administration › Paramètres › **Taux de change**, dits comme on les dit (« 10 € = 12 $ = 30 TND » ;
  `currency_rates`, V58, défauts 10 = 13,6 = 34 soit les anciennes valeurs). Ils alimentent `GET /api/currency/rates` **et** `CurrencyConfig`,
  donc aussi la conversion des paiements et des factures. Le serveur les applique tout de suite (cache 30 s), le site public sous 5 minutes.
  **À confirmer par le propriétaire** : cours réel et marge éventuelle ; aucune marge n’est appliquée.
- Les prix écrits en dur dans les traductions (« 80 TND » des options d’activité) suivent aussi la devise choisie.

### Hébergement : ville de retour libre et tableau enrichi (26 sept.)
- Le formulaire d’hébergement a la même case « Ma ville de retour n’est pas dans la liste » que les circuits : même option
  « Autre ville de retour » (un seul prix pour circuits et hébergements ; les améliorations par nuit restent réservées aux circuits).
- Page « Réservations hébergement » : voyageurs (adultes + enfants, bébés à part), hébergement réservé (« Tente × 1 »,
  « Suite × 2 ») et nuits, lus sur la réservation (`ReservationTourTypeResponse.accommodations`). Une réservation ancienne sans
  catégorie enregistrée affiche « — ».

### Notifications de réservation (25 sept.)
- **Cloche du backoffice** (`NotificationBell`, en-tête) : compteur de non lues, 20 dernières, lien vers la
  réservation, « tout marquer comme lu », relevé toutes les 30 s et au retour sur l’onglet (un toast
  signale une hausse). Alimentation existante : `RESERVATION_CREATED` vers les comptes ADMIN.
- **E-mail « Vous avez reçu une réservation »** (`StaffBookingNotifier` + `StaffBookingMailer`, en français) :
  produit, référence, date, participants, client (e-mail, téléphone, langue), prix, bouton vers
  `/reservations/{id}`. Une seule fois par réservation (`email_dispatch`), uniquement pour la source
  « Site web », jamais bloquant. Destinataire en production : `insoliteroute@gmail.com` seulement (`APP_STAFF_BOOKING_EMAILS`,
  défaut de `docker-compose.vps.yml`, modifiable dans `.env.vps`) ; si la variable est vide, tous les ADMIN.
- Limites : pas de temps réel (relevé toutes les 30 s), pas de son ; un échec d’envoi n’est pas rejoué si
  l’e-mail du client réussit (visible dans `email_dispatch`). Non testé avec un vrai SMTP.

### Suppression d’un compte, d’un guide, d’un chauffeur (25 sept.)
- Une réservation ne peut pas exister sans utilisateur (`user_id` obligatoire, aucun nom client propre) :
  supprimer un compte **rattache ses réservations au compte « Client supprimé »** (`DeletedAccount`, V56,
  sans identité Keycloak, masqué des listes, courriels ignorés) au lieu de refuser. Avis, remises,
  notifications, favoris et jetons sont supprimés (`AccountDeletion`).
- **Factures et paiements bloquent toujours** la suppression (409 explicite) : ce sont les pièces
  comptables. Décision **à confirmer par le comptable** (F-5) : voir si l’on anonymise aussi les factures.
- Boutons « Supprimer » ajoutés aux pages Guides et Chauffeurs (le chauffeur supprime aussi son compte) ;
  les affectations sur réservation gardent le nom, elles perdent seulement le lien vers le profil.
- Non testé contre une vraie base (tests unitaires seulement ; Docker arrêché en local).

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

### Backoffice : réservations, textes et devise des e-mails (26 sept 2026)

- **Nouvelle réservation (circuit)** : villes de départ/retour du circuit, ville de retour
  hors liste (la ligne « autre ville de retour » du catalogue est ajoutée) et améliorations
  (grisées sous le minimum de voyageurs, nuits du circuit). Les prix restent calculés par le serveur.
- **Fiche réservation** : panneau « Ville de retour & améliorations » (`PUT
  /api/reservations/{id}/circuit-options`, ADMIN/CAMPING, pas sur une réservation terminée) ;
  il ne remplace que les lignes `TOUR_OPTION`, le total est recalculé par le serveur.
- **Textes des formulaires** (Contenu → Textes des formulaires) : surcharges par langue
  stockées dans `site_text_override` (V60). Le site les fusionne dans ses messages
  (`i18n/request.ts`, cache 5 min) ; seules les sections `tourBookingForm`, `stayReservationForm`,
  `bookingFlow`, `currencySwitcher` et des textes existants sont surchargeables, et un texte
  avec accolades déséquilibrées ou un `{champ}` inconnu est ignoré. La liste vient du site
  (`/api/site-texts`), qui garde les textes d'origine.
- **E-mails client dans la devise choisie** : `reservation.display_currency` (V59) reçoit la devise
  vue sur le site ; `CustomerCurrency` convertit montants et total des e-mails client
  (confirmation, demande de paiement, paiement reçu). L'e-mail de l'équipe, la
  réservation, les paiements et les factures restent en euros. **À trancher avec le comptable :**
  un lien de paiement reste en euros alors que l'e-mail affiche des dollars ou des dinars.
- Non essayé contre une vraie base ni un vrai SMTP ; tests unitaires seulement.

### Codes promo des hôtels partenaires (26 sept 2026)

- Table `promo_codes` (V61) : code, hôtel, remise %, commission % (vide tant que le propriétaire ne la fixe pas),
  période de validité, actif. Deux codes semés : `BADIRA10` (10 %) et `MOURADI2026` (15 %), sans commission.
- **Décisions du propriétaire :** la remise s'applique au prix du **circuit seulement** (pas aux options ni aux
  activités) ; seules les réservations **confirmées, arrivées ou terminées** comptent pour la commission ;
  la commission se calcule sur le prix du circuit après remise, au taux fixé **par code**.
- Le serveur décide : `PromoCodeService.resolveForBooking` refuse un code inconnu, désactivé, hors dates ou utilisé
  sur un hébergement. La remise est gelée sur la réservation (`promo_discount_percent`, `promo_commission_percent`) et
  `Reservation.calculateTotalToursAmount()` la réapplique à chaque recalcul. Le site n'affiche qu'un estimé
  (`GET /api/public/promo-codes/check`).
- Backoffice : Opérations → Codes promo hôtels (cartes avec réservations, CA, remises, commission à payer,
  lien vers la liste filtrée) ; le code figure sur la fiche, la carte et la vue rapide des réservations.
- **À trancher :** le taux de commission de chaque hôtel ; la commission n'est pas versée par le système, elle est
  seulement calculée.

### E-mails d'équipe : nouvelle réservation, confirmation, annulation (27 sept 2026)

- `StaffBookingMailer` gère maintenant trois évènements (`Kind.NEW/CONFIRMED/CANCELLED`), même
  sujet de base — seul « Re: » change — pour que Gmail (et les autres clients qui threadent par
  sujet) regroupe les trois e-mails d'une même réservation dans une seule conversation.
- Déclenchés uniquement pour les réservations venues du site (`Source = "Site web"`), comme
  l'e-mail de nouvelle réservation existant ; une réservation saisie à la main dans le backoffice
  n'en déclenche pas, y compris pour confirmation/annulation.
- **Deux boîtes séparées, une par entité légale** (`StaffBookingNotifier.recipients(ReservationType)`) :
  un circuit (Route Insolite, `ReservationType.TOURS`) part vers
  `app.mail.staff-booking-recipients-circuits` (`APP_STAFF_BOOKING_EMAILS_CIRCUITS`, défaut
  `insoliteroute@gmail.com`) ; un séjour ou une activité (Dunes Insolites) part vers
  `app.mail.staff-booking-recipients` (`APP_STAFF_BOOKING_EMAILS`, défaut `Dunesinsolites@gmail.com`).
  Chacune retombe sur tous les comptes ADMIN si elle est vide, indépendamment de l'autre.
- `onConfirmed`/`onCancelled` de `ReservationServiceImpl` appellent `StaffBookingNotifier`. Deux
  nouveaux types dans `EmailType` (`STAFF_RESERVATION_CONFIRMED`, `STAFF_RESERVATION_CANCELLED`),
  dédupliqués comme le reste via `email_dispatch` — pas de migration (colonne texte, pas de contrainte).
- Défauts serveur dans `docker-compose.vps.yml`. **Ce ne sont que des fallbacks** : si
  `APP_STAFF_BOOKING_EMAILS` est déjà défini explicitement sur le VPS (probable), il faut aussi y
  ajouter `APP_STAFF_BOOKING_EMAILS_CIRCUITS` — non fait depuis ici (accès serveur restreint dans
  cette session).
- Bug trouvé et corrigé en même temps, sans rapport avec la demande : `StaffBookingMailer.money()`
  utilise deux espaces spéciaux (U+202F, U+00A0) que NumberFormat insère avant l'unité monétaire en
  français ; une réécriture précédente du fichier les avait aplatis en espaces ASCII normaux,
  rendant le remplacement inopérant et cassant `StaffBookingMailerTest`.
- **Rattrapage (27 sept 2026)** : `POST /api/reservations/backfill-staff-confirmation-emails`
  (ADMIN, `ReservationController`) envoie l'e-mail « confirmée » pour toute réservation du site déjà
  CONFIRMED/CHECKED_IN/COMPLETED — pour les réservations confirmées avant que cet e-mail existe.
  Réutilise `notifyConfirmed` donc respecte les mêmes règles (site uniquement, boîte par entité,
  jamais deux fois — `email_dispatch`). Bouton dans le backoffice, Administration → Journal
  d'activité (`StaffEmailBackfillCard`) ; retourne `{considered, sent}`. Sans risque à relancer.

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
