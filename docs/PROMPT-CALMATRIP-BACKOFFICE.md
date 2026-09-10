Je veux que tu construises (ou refasses) le backoffice de Calma Trip pour
qu'il atteigne le même niveau que le backoffice de Dunes Insolites : un
vrai outil "Payload-like" — pas un CRUD basique, pas un thème
admin-dashboard générique. Voici la spec complète, détaillée, avec les
principes ET l'architecture concrète.

==================================================
PRINCIPE FONDATEUR
==================================================

Le backoffice n'est PAS le site public. Il assume son identité "outil de
travail professionnel" — mais avec une vraie identité de marque, jamais un
thème Bootstrap/Tailwind générique bleu-blanc-gris.

Décision à prendre dès le départ : **une palette différente du site
public, mais cohérente** — même langage visuel (cartes papier, coins
arrondis, ombres douces, badges de statut colorés), couleurs différentes,
pour que le staff ne confonde jamais "je regarde le site" et "je gère le
site". Chez Dunes Insolites c'est marine (#0d2645) + or (#c59b3d) contre
le terracotta du site public — choisis l'équivalent pour Calma Trip (par
exemple : la couleur du site public assourdie/désaturée + un accent
complémentaire).

Règle non-négociable, partout dans le backoffice : **zéro donnée
inventée**. Un dashboard vide doit rester visuellement vide — jamais de
placeholder qui ressemble à une vraie donnée de démo. "0 réservations",
"Aucune donnée pour le moment" — jamais une fausse ligne d'exemple qui
traîne en prod.

==================================================
ARCHITECTURE TECHNIQUE — BFF, PAS UNE SPA PURE
==================================================

Le navigateur ne doit JAMAIS détenir le token d'authentification brut.

- Login → POST vers une route serveur (`/api/auth/login`) qui appelle le
  vrai backend, reçoit le token, et le stocke dans un **cookie de session
  httpOnly** — invisible au JS côté client. Une faille XSS dans
  l'admin ne peut donc jamais exfiltrer un token avec des droits admin.
- Toute lecture/écriture authentifiée passe par UNE SEULE route proxy
  générique côté serveur : `app/api/proxy/[...path]/route.ts`. Elle lit
  le cookie de session, ajoute `Authorization: Bearer <token>`, et relaie
  la requête (GET/POST/PUT/PATCH/DELETE) vers l'API réelle. Les
  composants client ne fetchent jamais l'API directement — ils appellent
  `/api/proxy/reservations`, jamais l'URL du backend.
- Les composants serveur (Server Components) peuvent sauter le proxy et
  appeler l'API directement avec le token lu côté serveur — ils tournent
  déjà sur un serveur de confiance.

Schéma du flux de login :
```
Navigateur → POST /api/auth/login (email, password)
           → [serveur admin] → grant password → Keycloak/backend
           ← access + refresh token
[serveur admin] → Set-Cookie (httpOnly)
Navigateur → fetch("/api/proxy/reservations")
[serveur admin] → lit le cookie → GET /api/reservations (Bearer ...)
           ← 200 JSON
Navigateur ← 200 JSON
```

==================================================
ARCHITECTURE DE L'INFORMATION
==================================================

Grouper la sidebar par **domaine métier réel**, jamais par type technique
d'écran. Exemple Dunes Insolites, à adapter à Calma Trip :

```
OPÉRATIONS           CATALOGUE             CONTENU              SEO
├ Réservations        ├ Excursions/Séjours  ├ Pages              ├ Pages SEO
├ Clients              ├ Circuits            ├ Blocs de contenu   ├ Redirections
├ Paiements            ├ Extras/Options      ├ Navigation         ├ Sitemap
├ Factures             ├ Disponibilités      ├ Médiathèque        ├ Analytics
└ Proformas                                  └ Avis clients
```

C'est ce qui rend un backoffice de 20+ écrans navigable sans se perdre —
le staff pense "je vais gérer un client", pas "je vais chercher dans la
liste des composants CRUD".

==================================================
LE PATTERN "PAYLOAD" — DEUX BRIQUES RÉUTILISABLES
==================================================

Construis (si ça n'existe pas déjà) DEUX composants génériques que
CHAQUE collection (réservations, excursions, clients, avis...) réutilise :

**A. `CollectionList`** — la vue liste
- Une vraie page (pas une modale).
- Barre de recherche filtrant en direct sur le titre/nom.
- Bouton "+ Créer" qui mène vers une vraie route `/nouveau`, pas une
  modale de création.
- Chaque ligne cliquable mène vers sa propre page d'édition (pas un tiroir
  latéral).
- Colonnes avec labels en petites majuscules espacées, statuts affichés
  en **pastilles colorées** (vert = actif/publié, ambre = en attente,
  rouge = annulé/erreur).
- Bouton "Supprimer" sur chaque ligne, MAIS toujours avec une vraie
  **modale de confirmation nommant l'élément** ("Supprimer *[nom réel de
  l'excursion]* ? Cette action est irréversible.") — jamais une
  suppression en un clic direct.
- Si la suppression échoue côté backend (élément référencé ailleurs),
  affiche un message clair, jamais une erreur technique brute.

**B. `CollectionEditor`** — la vue édition, en PAGE COMPLÈTE
- C'est le détail qui distingue vraiment "Payload" d'un simple
  admin-avec-tiroir : l'édition occupe TOUTE la page, pas une modale ni
  un panneau qui pousse le contenu.
- Barre latérale droite fixe avec : bouton Enregistrer, statut
  (Brouillon/Publié), bouton Supprimer — toujours visible pendant le
  scroll du formulaire principal.
- Le contenu principal (à gauche) contient les vrais champs du document.

Chaque collection (Clients, Excursions, Circuits, Extras, Avis) doit être
une paire liste+éditeur construite sur ces deux briques génériques contre
de VRAIES données backend — jamais de données mockées, même en
développement.

==================================================
LE SYSTÈME DE CONTENU/CMS — SI CALMA TRIP A DES PAGES ÉDITABLES
==================================================

Si Calma Trip a des pages de contenu (à propos, sécurité, FAQ, mentions
légales...), construis un vrai système de blocs, pas un simple champ
"contenu HTML libre" :

- **Modèle de données** : une Page a un titre, un slug, une locale (si
  multilingue), un statut (Brouillon/Publié), des champs SEO (title, meta
  description, canonical, noindex/nofollow), et une liste ORDONNÉE de
  blocs typés (`type` + données JSON).
- **Types de blocs à couvrir au minimum** : hero (titre/sous-titre/image),
  texte riche (avec listes), CTA, FAQ (des blocs FAQ consécutifs se
  regroupent automatiquement en un seul accordéon), équipe/repeater
  (liste dynamique d'éléments répétables — nom/rôle/photo/bio — avec
  ajout/suppression/réordonnancement).
- **Un champ "repeater" générique** est le bon investissement : plutôt que
  d'inventer un composant par type de liste répétable (galerie, étapes
  d'itinéraire, équipe...), construis UN composant `RepeaterField`
  réutilisable pour toute liste d'objets répétables.
- **Un bloc de relation catalogue réel** (ex: "mettre en avant ces 3
  excursions") doit stocker de vrais identifiants du catalogue, jamais du
  contenu dupliqué à la main — sinon le contenu affiché diverge
  silencieusement du vrai catalogue avec le temps.
- **Vérificateur SEO honnête** : une liste concrète de ✓/⚠/✗ (longueur du
  titre, meta description manquante, etc.) — JAMAIS un score numérique
  fabriqué du style "87/100 SEO Score" qui n'a aucune méthodologie réelle
  derrière.
- **Live preview réel** : un panneau latéral qui affiche le vrai site
  public dans une iframe, mis à jour en direct à chaque changement de
  champ via `postMessage` — PAS un bouton "Aperçu" qui ouvre un nouvel
  onglet sur la version déjà publiée. L'iframe ne doit jamais parler
  directement au backend dans ce mode — elle reçoit juste les messages
  postés par l'éditeur.
- Si une route n'a pas encore de live preview câblée, affiche un message
  honnête ("Pas d'aperçu disponible pour ce type de page") plutôt qu'une
  iframe vide ou cassée.

==================================================
GARDE-FOUS MÉTIER — À NE JAMAIS OUBLIER
==================================================

Ces règles ont été apprises à la dure sur Dunes Insolites — applique-les
dès la conception, pas en correctif après coup :

1. **Paiements/Factures ne doivent jamais permettre de créer un document
   fiscal de toutes pièces depuis un formulaire admin vide.** Un
   formulaire de paiement doit toujours s'attacher à une réservation
   existante déjà correctement calculée par le vrai flux de réservation —
   jamais de saisie manuelle de lignes de facture inventées, qui risque
   un document malformé sans garde-fou.
2. **Toute action qui réécrit l'identité légale d'un document déjà émis
   (numéro de facture, entité qui facture) doit avoir une vérification de
   statut AVANT d'être exposée dans l'UI.** Ne construis jamais un simple
   bouton "changer" sur un champ qui a une valeur légale/fiscale figée
   une fois le document envoyé.
3. **La modération d'avis clients (lecture + suppression) n'est pas de
   l'authoring.** Si un membre du staff "saisit" un vrai avis venu d'une
   autre plateforme (Google, TripAdvisor...) à travers un formulaire qui
   attribue automatiquement l'avis à SON propre compte connecté, l'avis
   affiché ment sur qui l'a écrit — c'est aussi grave que d'inventer
   l'avis. Un champ "auteur externe réel" + "plateforme source réelle"
   est nécessaire avant qu'un formulaire de saisie manuelle ait sa place
   ici.
4. **Ne jamais fabriquer une note moyenne ou un compteur d'avis** tant
   qu'il n'y a pas de vrais avis en base — ni sur le dashboard admin, ni
   sur le site public.

==================================================
TABLEAU DE BORD
==================================================

- Cartes de statistiques en haut, chacune avec une **barre d'accent
  colorée en haut de la carte** (pas juste un fond plat) — hiérarchie
  visuelle immédiate même pour un simple chiffre.
- Les vrais chiffres, jamais de démo : `0 TND`, `0 réservations`,
  "Aucune réservation active" tant que c'est vrai. Un dashboard qui a
  l'air "vivant" avec de fausses données donne une fausse impression de
  traction à quiconque le regarde — mauvais signal en interne comme en
  externe.
- Liste "réservations récentes" avec un vrai état vide honnête plutôt
  qu'un tableau à lignes fantômes.

==================================================
ÉCRAN DE CONNEXION ADMIN
==================================================

Volontairement plus sobre que le site public — pas besoin de
photographie ni de mise en scène. MAIS ça reste un écran de marque :
- Un vrai logo/mark de la marque, jamais une icône générique
  photo/image par défaut.
- La palette propre au backoffice (voir plus haut), pas les couleurs du
  site public copiées-collées.

==================================================
RÈGLES TECHNIQUES GÉNÉRALES
==================================================

- Réutilise les endpoints backend existants — ne duplique jamais de
  logique métier côté frontend admin.
- N'invente aucun endpoint ni aucune donnée si le backend ne le fournit
  pas encore — dis-le clairement plutôt que de mocker silencieusement.
- Chaque action destructrice (suppression, dépublication, changement de
  statut irréversible) a sa confirmation nommée.
- Vérifie chaque écran en le faisant vraiment tourner (capture d'écran ou
  test manuel réel) après implémentation — ne te contente jamais de dire
  "c'est fait" sans avoir regardé le rendu réel.
- Si Calma Trip est multilingue, chaque nouveau texte de l'admin passe
  par le système de traduction existant, jamais du texte en dur.

Avant de commencer : analyse d'abord le backend existant de Calma Trip
(quels endpoints existent déjà pour réservations/clients/catalogue/
contenu), et dis-moi précisément ce qui est réutilisable tel quel, ce qui
manque côté backend avant de pouvoir construire l'écran correspondant, et
dans quel ordre tu recommandes de construire les collections (commence
par celle qui a le plus de valeur immédiate pour l'équipe, pas
nécessairement la plus simple à coder).
