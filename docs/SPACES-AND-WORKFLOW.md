# Espaces, workflow et architecture

Vue d'ensemble pratique : qui utilise quoi, comment une réservation circule
entre les espaces, et comment c'est câblé techniquement. Pour le détail
complet de l'architecture (couches, décisions, dette), voir
[`ARCHITECTURE.md`](../ARCHITECTURE.md) à la racine — ce document-ci est plus
court et organisé par **espace utilisateur**, pas par couche technique.

**Dernière vérification :** 18 septembre 2026, en conditions réelles (backend
lancé depuis les sources, vraies requêtes HTTP, pas de suite de tests).

---

## 1. Deux applications, quatre espaces

Il n'y a que **deux applications réelles** dans ce repo. Les « quatre
espaces » dont on parle sont des expériences différentes à l'intérieur de ces
deux applications, pas quatre projets séparés à déployer.

| Application (dossier) | Espaces qu'elle contient | Déployée où |
|---|---|---|
| `frontend/` | Vitrine publique + Espace client + Espace chauffeur | site public (`www.dunes-insolites.com`) |
| `admin/` | Espace admin (backoffice) | `admin.dunesinsolites.com` |

Le rôle du compte connecté (`CLIENT`, `CHAUFFEUR`, `STAFF`, `CAMPING`,
`ADMIN`, `PARTENAIRE`) décide ce que `frontend/` affiche sous `/account/*`.
Un compte non-`CLIENT`/non-`CHAUFFEUR` qui se connecte sur `frontend/` est
renvoyé vers `admin/` (`AuthForm.tsx`) — il n'a pas d'écran ici.

> Note honnête : `AuthForm.tsx` fait référence à d'anciennes applications
> Angular séparées (admin/partenaire/camping) comme consommatrices du même
> contrat JSON backend. Elles n'ont pas été explorées dans le cadre de ce
> document — seul `admin/` (ce repo) a été vérifié.

---

## 2. Vitrine publique (`frontend/`, non connecté)

Le site marketing — celui qui porte le référencement Google historique (53
URLs migrées depuis WordPress, slugs conservés à l'identique,
`trailingSlash: true`).

**Pages principales** (`app/[locale]/(site)/`) :
- `/` — accueil
- `/activities`, `/activities/[slug]` — les activités (camel-trek, quad,
  sandboarding...)
- `/camp`, `/camp/[slug]`, `/camp/[slug]/[accommodation]` — les nuitées
  (`nuitee-campement-desert`, `bivouac-desert-tunisie`) et leurs
  hébergements (Tente/Chambre/Suite)
- `/guides`, `/guides/[slug]` — contenu éditorial
- `/about`, `/contact`, `/faq`, `/gallery`, `/safety` — pages statiques
- `/circuits` — **stub volontaire "bientôt disponible"**, pas de vrai
  contenu (voir §6, Tours)
- `/book`, `/bookings/[id]` — flux de réservation invité et confirmation

**Source des données** : `lib/api.ts` appelle le backend réel
(`/api/public/activities`, `/api/public/stays`, avec un paramètre
`?locale=` pour l'anglais/arabe/etc.) — **pas des fichiers statiques**. Les
fichiers `lib/data/*-i18n/*.ts` ne servent plus que pour (a) la liste des
slugs pré-générés au build (`generateStaticParams`) et (b) un repli
dev-only si `NEXT_PUBLIC_API_URL` est absent. Un contenu créé depuis
l'admin apparaît en direct sur la page détail, et sous 5 min sur les pages
de liste (cache ISR `revalidate: 300`) — vérifié en conditions réelles
avec un vrai build de production.

**Traductions** : le backend résout déjà `?locale=EN/DE/IT/DA/AR` avec repli
au français champ par champ (`PublicCatalogTranslation`). L'admin peut
saisir ces traductions (voir §5) et elles s'affichent immédiatement, sans
redéploiement.

---

## 3. Espace client (`frontend/account/*`, rôle `CLIENT`)

**Connexion** : email + mot de passe → `POST /api/auth/login` (backend) →
cookie `di_session` httpOnly posé par la route BFF Next.js
(`app/api/auth/login/route.ts`). Le token n'atteint jamais le JS client.

**Pages** (`app/[locale]/(site)/account/`) :
- `/account` — tableau de bord (prochain séjour, statut, recommandations)
- `/account/bookings`, `/account/bookings/[id]` — historique et détail
  d'une réservation, **incluant "Votre équipe pour ce voyage"** (guide et
  chauffeur affectés par l'admin, lecture seule)
- `/account/payments` — suivi des paiements
- `/account/reviews` — avis laissés par le client
- `/account/profile`, `/account/support` — infos compte, aide

**Source des données** : toujours le vrai backend
(`GET /reservations/my-reservations`, `GET /reservations/{id}`, protégé
par propriétaire — un client ne voit jamais la réservation d'un autre).

---

## 4. Espace chauffeur (`frontend/account/trips`, rôle `CHAUFFEUR`)

Le plus récent des quatre espaces (18 septembre 2026). Même application,
même mécanisme de connexion que l'espace client — seul le rôle change ce
qui s'affiche.

- Nav réduite à un seul onglet **"Mes courses"** (`AccountNav.tsx`,
  `driverMode`)
- `/account/trips` liste les réservations où ce chauffeur est affecté
  (`GET /api/chauffeurs/my-trips`) : nom du tour, date, nombre de
  voyageurs, statut — jamais les prix ni les coordonnées complètes du
  client
- Un compte chauffeur est **créé uniquement par l'admin**
  (`/administration/utilisateurs`, rôle "Chauffeur") — pas d'inscription
  publique
- Le lien entre un compte chauffeur et une affectation sur une réservation
  est **optionnel** : l'admin peut affecter "Karim, +216 20 111 222" sans
  aucun compte (comme avant), ou en plus taper l'email d'un vrai compte
  chauffeur pour qu'il voie la course

**Limite connue** : la redirection automatique `/account` → `/account/trips`
pour un chauffeur ne se déclenche pas de façon fiable en développement — un
souci de cache Next.js repéré en testant en direct, atténué
(`export const dynamic = "force-dynamic"`) mais pas totalement résolu.
Sans impact sur les données (chaque page vérifie sa propre session), et la
navigation directe vers `/account/trips` fonctionne parfaitement.

---

## 5. Espace admin (`admin/`, backoffice)

**Connexion** : OIDC hébergé par Keycloak (page de connexion Keycloak, pas
un formulaire dans l'admin) — rôles autorisés : `ADMIN`, `CAMPING`,
`PARTENAIRE`, `STAFF` (rôle personnalisé). `CHAUFFEUR` n'a **pas** accès à
cette application.

**Opérations** :
- Nouvelle réservation, Réservations (liste + détail), Clients, Paiements,
  Factures, Proformas
- **Détail d'une réservation** (`/reservations/[id]`) : infos générales +
  panneau **"Équipe affectée"** (ajout/retrait de guides et chauffeurs,
  avec le lien de compte chauffeur optionnel décrit au §4) — uniquement
  pour les réservations de type `TOURS`, non annulées/terminées

**Catalogue** :
- **Hébergements** — les nuitées (TourType), formulaire classique + section
  Traductions
- **Tours / Circuits** — assistant en 7 étapes façon GetYourGuide/Airbnb
  (Infos de base → Photos → Itinéraire → Points forts & inclusions →
  Logistique → Tarifs → Traductions → Aperçu). Aucun tour n'est visible sur
  la vitrine Dunes (voir §6) ; ils servent aux réservations créées
  manuellement par l'admin (téléphone, agence)
- **Extras** — activités (quad, chameau...), et **Guides & transport** (la
  même entité `Extra`, filtrée par catégorie), avec la même section
  Traductions
- **Disponibilités** — calendrier de capacité

**Contenu** : Pages, Blocs de contenu, Navigation, Médiathèque, Galerie
photos, Avis clients
**SEO** : Pages SEO, Redirections, Sitemap, Audit SEO, Analytics
**Administration** : Utilisateurs (comptes ADMIN/CAMPING/STAFF/**Chauffeur**),
Rôles & permissions (matrice fixe), Rôles personnalisés (rôles `STAFF` à la
carte), Maintenance, Newsletter, Paramètres

---

## 6. Le workflow bout-en-bout

### Réservation d'une nuitée (le produit réel, aujourd'hui)
1. Client réserve une nuitée sur la vitrine (`/camp/[slug]`) → réservation
   réelle créée en base, statut `PENDING`.
2. Le client suit sa réservation dans son espace (`/account/bookings`).
3. Aucune affectation de personnel possible ici — réservé aux réservations
   `TOURS` (voir plus bas).

### Réservation d'un circuit (Route Insolite, créée par l'admin)
1. **Pas de page publique** pour réserver un tour — le circuit vitrine
   (`/circuits`) est un stub volontaire, en attendant le lancement de
   Route Insolite (bloqué, voir `docs/OPEN-QUESTIONS.md` Q6).
2. L'admin crée la réservation manuellement (téléphone/agence) via
   "Nouvelle réservation", type `TOURS`, en référençant un tour du
   catalogue (créé au préalable via l'assistant Tours).
3. L'admin affecte un guide et/ou un chauffeur depuis le détail de la
   réservation — en tapant juste un nom, ou en liant un vrai compte
   chauffeur par email.
4. Le client voit l'équipe affectée dans son espace ("Votre équipe pour ce
   voyage").
5. Si un compte chauffeur est lié, ce chauffeur voit la course dans
   `/account/trips`.

### Traduire une fiche (activité, nuitée, tour)
1. L'admin ouvre la fiche (Extras, Hébergements ou Tours), remplit l'étape
   Traductions (onglets EN/AR/DE/IT/DA).
2. Pour Extras et Hébergements : **effet immédiat** sur la vitrine
   (`?locale=EN` etc.), champ par champ, repli au français si non traduit.
3. Pour Tours : sauvegardé, mais **aucun effet visible** — pas de page
   publique qui les lit (cohérent avec le point précédent : Route Insolite
   n'est pas lancé).

---

## 7. Ce qui reste à faire / limites connues honnêtes

- **Tours sur la vitrine Dunes** : volontairement absent — c'est le
  produit de Route Insolite, pas de Dunes Insolites (règle du projet,
  déjà corrigée deux fois par le passé). Ne pas construire sans
  confirmation explicite.
- **Chauffeur/Guide ne sont pas un roster partagé** : chaque affectation
  est une fiche nom+téléphone indépendante, pas une liste de chauffeurs
  réutilisables avec fiche unique. Un même chauffeur affecté à 10
  réservations = 10 fiches distinctes (liées ou non au même compte).
- **Photos des tours** : à uploader par le métier — aucune photo tierce
  (GetYourGuide, Booking.com) copiée sans droits.
- **Tarifs enfant/partenaire des tours** : le seul tour réel créé
  (« Circuit Sahara & Djerba ») n'a que le prix adulte confirmé
  (route-insolite.com ne détaille pas les autres tarifs) — les autres
  champs sont des placeholders à corriger avant publication réelle.
- **Redirection `/account` → `/account/trips`** : peu fiable en dev (§4),
  jamais un problème de sécurité, juste un confort de navigation à revoir.
- **Accès production** : ce document et tout le travail de cette session
  ont été vérifiés sur l'environnement **local** (Docker). Rien n'a été
  écrit en production — l'accès (URL admin + identifiants) n'a jamais été
  fourni.

---

## 8. Repères techniques rapides

- **Contrat partagé** : `packages/api-types` — types wire-only, importés
  par le frontend ; l'admin a ses propres types dérivés dans `lib/api.ts`.
- **Argent** : `BigDecimal`, jamais `Double`/`float`, arrondi explicite.
- **Autorisation** : jamais côté client — chaque endpoint backend porte son
  propre `@PreAuthorize`/`@perm.can(...)`.
- **Vérifier avant de considérer fini** : `npm run verify` (typecheck +
  lint + tests backend). Pour un changement visible, le faire tourner en
  vrai (backend depuis les sources + navigateur réel) — la majorité des
  bugs réels trouvés cette session (contrainte NOT NULL manquante, CORS,
  fil d'Ariane caché sous le header, redirection cassée...) ne l'auraient
  jamais été par les tests seuls.
