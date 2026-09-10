# Dunes Insolites — Référence UI/UX & Contenu (Espace Client + Espace Admin)

> Document de référence pour inspiration — Calmatrip
> Basé sur l'implémentation réelle de la plateforme Dunes Insolites (Next.js 16 + Spring Boot), vérifié en direct sur l'application qui tourne, pas juste lu dans le code.

---

## Partie 1 — Espace Client (le "carnet de voyage")

### 1.1 Philosophie produit

Le principe fondateur : l'espace client ne doit **jamais** ressembler à un dashboard admin, une appli bancaire ou un panneau SaaS générique. Il doit se sentir comme **"mon espace de voyage"** — la première question à laquelle répond la page d'accueil est toujours *"c'est quoi ma prochaine aventure ?"*, pas *"voici tes données de compte"*.

Règle non-négociable appliquée partout : **zéro donnée inventée**. Pas de fausses statistiques, pas de faux avis, pas de widgets décoratifs sans vraie donnée derrière. Un état vide honnête ("Aucune réservation") vaut toujours mieux qu'une fausse donnée qui a l'air jolie.

### 1.2 Système de design

| Token | Valeur | Usage |
|---|---|---|
| `--paper` | `#fdf1e1` | Fond des cartes, surfaces principales |
| `--sand` | `#f3e7d3` | Fond de page général |
| `--ink` | `#2a1510` | Texte principal, titres |
| `--accent` | `#c8642f` | Couleur d'accent — terracotta/orange chaud, CTA, liens actifs |
| `--muted` | `rgba(42,21,16,.66)` | Texte secondaire, labels |

**Typographie** : deux familles, un rôle chacune.
- **Alexandria** (Google Fonts, poids 400–800) — la police "display", pour tous les titres. Géométrique, un peu de caractère, jamais une police générique type Inter partout.
- **Inter** — le corps de texte, la lisibilité pure.

**Photographie réelle partout**, jamais d'illustration ou d'icône générique en hero. Les couleurs de statut (pending/confirmed/cancelled) utilisent des teintes dérivées de la palette principale (ambre, vert, rouge) — jamais de bleu/violet "SaaS générique".

**Formes** : coins très arrondis (16–22px sur les cartes), ombres douces et larges (`0 18px 44px rgba(42,16,8,.1)`), bordures fines à 10% d'opacité plutôt que des bordures dures.

### 1.3 Architecture de l'information

```
Sidebar verticale (desktop) :
┌─────────────────────┐
│ [Avatar] Prénom Nom  │  ← identité, pas un item de nav
│ Se déconnecter       │  ← lien discret sous l'identité, JAMAIS
└─────────────────────┘     un item de navigation principal
│ 📅 Mes voyages        │  ← contexte réel : "1 expérience à venir"
│ 💳 Paiements          │  ← contexte réel : "1 action requise"
│ ⭐ Avis                │
│ 💬 Aide                │
│ 👤 Profil              │  ← infos de compte (nom/email/type),
└─────────────────────┘     déplacées ICI, pas sur le dashboard
```

**Décision clé** : "Mes voyages" est la page d'accueil elle-même (`/account`), pas une liste séparée. Le dashboard *est* l'expérience "trips" — une liste détaillée classique reste accessible en un clic via les CTA internes ("Voir votre séjour"), mais n'a pas sa propre entrée dans la nav principale.

Les badges de contexte dans la sidebar (`1 expérience à venir`, `1 action requise`) sont **calculés depuis les vraies données de réservation**, jamais affichés s'il n'y a rien à signaler (pas de badge "0").

### 1.4 Page par page

#### A. Dashboard / Overview (`/account`)

La page la plus travaillée. Structure verticale, chaque section répond à une vraie question client :

1. **En-tête personnalisé** — `"Bon retour, {prénom}"` + un titre contextuel qui change selon l'état réel :
   - A une réservation à venir → *"Votre prochaine aventure au Sahara vous attend."*
   - Aucune réservation → *"Votre prochaine aventure commence ici."*

2. **Carte héro "prochaine expérience"** — l'élément visuel principal, format horizontal (image à gauche, infos à droite) :
   - Vraie photo de l'expérience
   - Référence de réservation lisible, dérivée du vrai UUID (`DI-2026-34388`, pas un UUID brut)
   - Dates réelles, nombre de voyageurs réel
   - **Deux badges de statut séparés** : statut de réservation (Pending/Confirmed/…) ET statut de paiement (Payment pending/Paid/…) — jamais fusionnés en un seul badge ambigu
   - Prix total + un seul CTA clair ("Voir votre séjour")

3. **"Votre séjour en un coup d'œil"** — grille compacte de 4 mini-cartes (icône + valeur + note) : dates, voyageurs, paiement, localisation. Jamais des cartes géantes — l'info doit se scanner en 2 secondes.

4. **"Votre parcours"** — une frise horizontale de progression (5 étapes : reçue → confirmée → préparez-vous → profitez → partagez). **L'étape en cours est dérivée du vrai statut backend**, jamais codée en dur. Une réservation annulée n'a simplement pas de frise (ça n'aurait aucun sens).

5. **"Avant votre voyage"** — 3 cartes cliquables vers de vraies pages utiles (que emporter / contacter le support / voir les détails complets). Zéro lien mort.

6. **"Complétez votre expérience Sahara"** — recommandations d'activités réelles du catalogue, excluant ce qui est déjà réservé. Vraies photos, vrais tarifs.

7. **"Besoin d'aide ?"** — section compacte, délibérément **moins imposante visuellement** que la carte héro (elle ne doit jamais rivaliser avec l'élément principal) : bouton contact + WhatsApp.

#### B. Mes voyages (liste détaillée, `/account/bookings`)

Cartes plus compactes que le dashboard : icône représentative (lune pour une nuitée), titre, sous-titre catégorie, badge de statut coloré, puis une grille 3 colonnes (date / total / réservé le).

#### C. Connexion (`/login`)

Le plus bel écran de tout le site. Composition **split-screen** : photo réelle pleine hauteur à gauche (le portail du campement au coucher du soleil), formulaire à droite sur fond crème. Un détail UX qui compte : *"Vous n'avez pas besoin de compte pour réserver — réservez en tant qu'invité à tout moment"* — désamorce l'anxiété n°1 d'un primo-visiteur.

#### D. Formulaire d'avis — sélecteur d'étoiles

Remplacé un `<select>` texte ("5 / 5") par un vrai picker d'étoiles cliquables avec prévisualisation au survol. Détail simple mais qui change complètement la perception de qualité d'un formulaire.

### 1.5 Principes UX transférables (les vrais enseignements)

1. **Une seule carte héro, tout le reste est secondaire.** Ne jamais laisser une section concurrencer visuellement l'élément principal en poids/couleur/taille.
2. **États dynamiques, jamais statiques.** Statuts, badges, timeline — tout doit dériver de la vraie donnée. Un composant qui affiche un état "en dur" est un bug qui attend de se déclencher.
3. **Les états vides sont un vrai écran, pas une case à cocher.** "Votre prochaine aventure commence ici" + un CTA vers le catalogue — jamais une page blanche.
4. **La sidebar raconte une histoire à elle seule** (badges contextuels) sans avoir besoin d'ouvrir chaque section.
5. **Séparer identité/déconnexion de la navigation fonctionnelle.** Le logout n'est jamais un item de nav — c'est une action liée à l'identité.
6. **Chaque lien doit mener quelque part de réel.** Zéro CTA décoratif.
7. **Le mobile n'est pas une contraction du desktop** — la sidebar devient une rangée d'icônes horizontale, la carte héro reste dominante, tout le reste s'empile en pleine largeur.

---

## Partie 2 — Espace Admin (le backoffice)

### 2.1 Philosophie produit

Contrairement au site public, le backoffice **assume** son identité "outil de travail" — mais avec une vraie identité de marque, pas un thème Bootstrap générique. Décision clé du projet : le backoffice utilise une palette **différente** du site public (marine + or, au lieu du terracotta/orange), pour que le staff ne confonde jamais les deux contextes — mais garde le même langage visuel (cartes papier, coins arrondis, ombres douces) pour rester cohérent avec l'identité globale.

### 2.2 Système de design

| Token | Valeur |
|---|---|
| `--color-navy-800` | `#0d2645` — texte principal, headers |
| `--color-navy-700` | `#1a3a5c` — texte secondaire |
| `--color-gold` | `#c59b3d` — accent, CTA |
| `--color-emerald` | `#1a8a5a` — succès, statuts positifs |
| `--color-rose` | `#c0392b` — erreurs, suppression |
| `--color-paper` / `--color-surface` | `#faf8f4` / `#ffffff` |

**Typographie** : Montserrat (display) + Inter (corps) — Montserrat apporte une touche "corporate mais chaleureuse", cohérente avec le marine+or.

### 2.3 Architecture de l'information

```
Sidebar verticale, groupée par domaine métier (pas par type d'écran) :

OPÉRATIONS          CATALOGUE            CONTENU              SEO
├ Réservations       ├ Hébergements       ├ Pages              ├ Pages SEO
├ Clients            ├ Tours/Circuits     ├ Blocs de contenu   ├ Redirections
├ Paiements          ├ Extras             ├ Navigation         ├ Sitemap
├ Factures           ├ Disponibilités     ├ Médiathèque        ├ Analytics
└ Proformas                               └ Avis clients
```

Grouper par **domaine métier réel** (ce que fait l'équipe), pas par type technique d'écran — c'est ce qui rend un backoffice avec 20+ écrans navigable sans se perdre.

### 2.4 Page par page

#### A. Tableau de bord

Cartes de stats en haut, chacune avec une **barre d'accent colorée en haut** (pas juste un fond plat) — un détail simple qui donne une hiérarchie visuelle immédiate même à un simple chiffre. Le point le plus important observé : **les états vides sont honnêtes**. `0 TND`, `0 réservations`, "Aucune réservation active" — jamais de fausse donnée de démo qui donnerait un faux sentiment de traction.

#### B. Tables de données (Réservations, Extras, Pages CMS…)

Pattern cohérent partout : recherche en haut, colonnes claires avec labels en petites majuscules espacées, statuts en **pastilles colorées** (vert = actif/publié), bouton "Supprimer" toujours avec **une vraie modale de confirmation** nommant l'élément ("Supprimer *Randonnée à dos de chameau* ? Cette action...") — jamais une suppression en un clic.

#### C. Connexion admin

Volontairement plus sobre que le site public/client — une carte centrée, pas de photographie. C'est cohérent avec la philosophie "outil de travail", mais c'est aussi l'écran le moins abouti de toute la plateforme : mérite une vraie identité visuelle (logo réel au lieu d'un pictogramme générique) avant d'être considéré fini.

### 2.5 Principes UX transférables

1. **Deux identités de marque cohérentes mais distinctes** (client chaleureux/terracotta vs staff professionnel/marine-or) — évite la confusion de contexte sans casser la continuité de marque.
2. **Grouper par métier, jamais par type d'écran technique.**
3. **Honnêteté des données à zéro** — un dashboard vide doit le rester visuellement, jamais de placeholder qui ressemble à une vraie donnée.
4. **Confirmation nommée avant toute action destructive.**

---

## Partie 3 — Pour Calmatrip : ce qui vaut la peine d'être réutilisé

- Le principe **"une carte héro, tout le reste en support"** est le plus gros gain visuel pour n'importe quel dashboard voyage.
- Les **badges de statut doubles séparés** (réservation vs paiement) évitent l'ambiguïté qu'un badge unique crée toujours.
- La **frise de progression dynamique** est un excellent moyen de transformer une simple réservation en "parcours" émotionnel — mais elle doit être dérivée du vrai statut, jamais codée en dur par écran.
- **Palette double mais cohérente** entre espace client et espace staff, si Calmatrip a aussi un backoffice.
- Le réflexe **"zéro donnée inventée"** doit être une règle écrite dès le départ, pas une réparation après coup — c'est ce qui a coûté le plus cher à corriger sur Dunes Insolites (avis fabriqués, statistiques inventées trouvés et corrigés en cours de session).
