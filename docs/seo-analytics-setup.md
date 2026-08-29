# Connecter Google Analytics 4 et Search Console au backoffice

Ce document est le seul endroit à suivre pour activer le tableau de bord
**Analytics & Search Console** (`/seo/analytics` dans le backoffice — déjà
construit, actuellement en état "non connecté").

**Rien de tout ça ne peut être fait à ta place** — ce sont tes comptes
Google réels, ta propriété GA4 réelle, ta propriété Search Console réelle.
Ce que Claude a déjà préparé : le code qui attend ces identifiants, câblé
et testé, prêt à afficher de vraies données dès que ce guide est terminé.

---

## Ce qui existe déjà côté code (rien à faire ici)

- `backend/.../config/GoogleSeoProperties.java` — lit 3 variables
  d'environnement, toutes vides par défaut.
- `backend/.../controller/SeoAnalyticsController.java` —
  `GET /api/admin/seo/analytics/status`, réservé ADMIN, répond
  honnêtement `{analyticsConfigured: false, searchConsoleConfigured: false}`
  tant que rien n'est configuré.
- `admin/app/(app)/seo/analytics/page.tsx` — la page backoffice, déjà dans
  le menu (SEO → Analytics & Search Console), affiche l'état réel de
  chaque connexion.

Ce qui n'existe **pas encore** : les vrais appels aux API Google
(`analyticsdata.googleapis.com`, `searchconsole.googleapis.com`) et les
graphiques eux-mêmes — ça, c'est la prochaine étape, une fois ce guide
terminé, et Claude sait déjà exactement où les brancher.

---

## Étape 1 — Créer un projet Google Cloud (5 min)

1. Va sur [console.cloud.google.com](https://console.cloud.google.com).
2. Crée un nouveau projet (ex. "dunes-insolites-seo") — ou réutilise un
   projet existant si tu en as déjà un.
3. Note le nom du projet, tu en auras besoin.

## Étape 2 — Activer les deux API nécessaires (2 min)

Dans ce même projet, va dans **APIs & Services → Library**, cherche et
active :

- **Google Analytics Data API**
- **Google Search Console API**

## Étape 3 — Créer un compte de service (5 min)

1. **APIs & Services → Credentials → Create Credentials → Service account**.
2. Donne-lui un nom (ex. "dunes-insolites-seo-reader").
3. Rôle : pas besoin d'un rôle IAM particulier au niveau du projet — l'accès
   se donne directement dans GA4 et Search Console (étapes 5 et 6).
4. Une fois créé, ouvre le compte de service → onglet **Keys** → **Add Key
   → Create new key → JSON**. Un fichier `.json` se télécharge — c'est ta
   seule clé, garde-la précieusement, **ne la mets jamais sur GitHub**.
5. Note l'adresse email du compte de service, elle ressemble à :
   `dunes-insolites-seo-reader@ton-projet.iam.gserviceaccount.com`

## Étape 4 — Trouver ton vrai Property ID GA4 (2 min)

1. Va sur [analytics.google.com](https://analytics.google.com), ouvre la
   propriété du site Dunes Insolites.
2. **Admin (roue crantée) → Property Settings**.
3. Le **Property ID** est un nombre (ex. `123456789`) — pas le "Measurement
   ID" (`G-XXXXXXXXXX`, celui déjà utilisé côté vitrine pour le tracking).
   C'est bien le Property ID qu'il faut ici.

> Si aucune propriété GA4 n'existe encore : le tracking sur le site public
> est déjà en place (`frontend/components/Analytics.tsx`), il suffit de
> créer une propriété GA4 sur ton compte Google et de lui donner le
> Measurement ID via `NEXT_PUBLIC_GA_MEASUREMENT_ID` (voir
> `frontend/README.md`) — indépendant de ce document, mais nécessaire pour
> qu'il y ait de vraies données à afficher ici une fois connecté.

## Étape 5 — Donner accès au compte de service sur GA4 (2 min)

1. Toujours dans **Admin** de la propriété GA4 → **Property Access
   Management**.
2. **+ → Add users**.
3. Colle l'adresse email du compte de service (étape 3.5).
4. Rôle : **Viewer** suffit — le backoffice ne fait que lire, jamais écrire.

## Étape 6 — Donner accès au compte de service sur Search Console (2 min)

1. Va sur [search.google.com/search-console](https://search.google.com/search-console),
   ouvre la propriété `www.dunes-insolites.com`.
2. **Settings → Users and permissions → Add user**.
3. Colle la même adresse email du compte de service.
4. Rôle : **Restricted** (lecture seule) suffit.
5. Note l'URL exacte de la propriété telle qu'affichée dans Search Console
   (généralement `https://www.dunes-insolites.com/` ou
   `sc-domain:dunes-insolites.com` selon comment la propriété a été
   vérifiée).

## Étape 7 — Mettre les identifiants dans `backend/.env` (2 min)

Trois nouvelles variables, jamais commitées (même règle que le reste de
`backend/.env`) :

```bash
GA4_PROPERTY_ID=123456789
SEARCH_CONSOLE_SITE_URL=https://www.dunes-insolites.com/
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/chemin/absolu/vers/le/fichier-telecharge.json
```

Place le fichier JSON téléchargé à l'étape 3 quelque part **hors du dépôt
git** (par exemple à côté de `backend/.env`, qui est déjà dans
`.gitignore`), et fais pointer `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` vers son
chemin absolu réel sur ta machine (ou sur le serveur de production, le
moment venu — chemin différent là-bas, même variable).

---

## Une fois ce guide terminé

Redémarre le backend, ouvre `/seo/analytics` dans le backoffice — les deux
cartes doivent passer de "Non connecté" à "Connecté". Dis-le à Claude :
il ajoutera les vrais appels aux API Google (trafic réel, requêtes de
recherche réelles, positions réelles) directement dans
`SeoAnalyticsController`/`GoogleSeoProperties`, sans rien changer côté
Google — tout le travail de ce document n'a besoin d'être fait qu'une
seule fois.
