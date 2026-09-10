# Dunes Insolites — Header & Page "Services" (liste avec photos)

> Document de référence pour inspiration — Calmatrip
> Détails réels extraits de l'implémentation (composants + CSS), pas une description approximative.

---

## Partie 1 — Le Header ("pill" flottant en verre)

### 1.1 Le concept

Ce n'est pas une barre classique collée en haut de page. C'est une **pilule flottante** (`border-radius: 20px`), centrée horizontalement, détachée du bord de l'écran par 20px, avec un effet verre dépoli (`backdrop-filter: blur(18px)`). Elle **flotte au-dessus du contenu** en `position: fixed`, jamais dans le flux normal.

```css
.site-header {
  position: fixed;
  top: calc(20px + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 44px);
  max-width: 1180px;
  border-radius: 20px;
  background: rgba(18, 22, 30, .34);      /* translucide sur le hero */
  border: 1px solid rgba(255,255,255,.11);
  backdrop-filter: blur(18px) saturate(1.15);
  box-shadow: 0 16px 40px rgba(8,12,20,.3),
              inset 0 1px 0 rgba(255,255,255,.08); /* liseré haut = lecture "verre" */
}
```

### 1.2 Trois états, un seul composant

| État | Déclencheur | Changement |
|---|---|---|
| **Par défaut** | Page d'accueil, tout en haut | Fond très translucide (34% opacité) — le hero se voit à travers |
| **`.scrolled`** | Dès qu'on scrolle (ou sur toute page non-accueil) | Fond plus opaque (72%) — lisibilité garantie une fois qu'on quitte le hero |
| **`.condensed`** | Scroll > 60px | La rangée utilitaire (WhatsApp/email/langue/login) se réduit, la largeur max passe de 1180px à 1040px — **un seul mouvement perçu**, pas deux transitions séparées |

Détail clé : ces deux booléens (`scrolled`, `condensed`) sont **indépendants**. `scrolled` gère le contraste, `condensed` gère la densité. Les découpler évite un `if/else` fragile à chaque nouvel état.

### 1.3 Structure à deux rangées

```
┌──────────────────────────────────────────────────────────┐
│ 📞 +216...  ✉️ email        🌐 FR ▾  |  🔔  Compte  Déconnexion │  ← rangée utilitaire
├──────────────────────────────────────────────────────────┤
│ [Logo] MARQUE          Menu1  Menu2▾  Menu3   [RÉSERVER]  │  ← rangée principale
└──────────────────────────────────────────────────────────┘
```

La rangée utilitaire **se réduit progressivement au scroll** (pas de disparition brutale) — elle porte les infos de contact + connexion, jamais critiques pour la navigation immédiate.

### 1.4 Le mega-menu — la vraie pièce à copier

Quand on survole (`hoverOpen`, avec un délai de fermeture de 160ms pour laisser le curseur traverser l'espace vide), un panneau sombre en verre s'ouvre sous l'item de nav :

```css
.mega {
  position: absolute;
  width: 440px;
  border-radius: 16px;
  background: rgba(18,14,11,.97);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(253,241,225,.14);
  animation: megaIn .22s ease-out both;
}
```

Chaque item du menu est une **vraie mini-carte cliquable avec photo** :

```css
.mega-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px;
  border-radius: 12px;
}
.mega-card .thumb {          /* la photo, 76×54, coins arrondis */
  width: 76px; height: 54px;
  border-radius: 9px;
  overflow: hidden;
}
.mega-card:hover {
  background: rgba(255,255,255,.08);
}
```

Structure de chaque item : **photo (76×54) + titre (police display, 14px) + tagline courte (12px, atténuée)**. En bas du panneau, un lien "Voir toutes les expériences →" distinct visuellement (pas juste un item de plus dans la liste).

**Pourquoi ça marche** : un menu déroulant textuel classique ("Expériences ▾ : Chameau, Quad, Surf des dunes...") demande au visiteur de deviner ce que chaque mot recouvre. Une vraie photo à côté du nom élimine l'ambiguïté en une fraction de seconde — c'est littéralement plus rapide à scanner qu'à lire.

### 1.5 État "menu mobile ouvert" — un détail d'orchestration rare

Quand le tiroir mobile s'ouvre, le header **ne reste pas une pilule flottante par-dessus le tiroir** — il se transforme en bordure supérieure du tiroir lui-même : `border-radius: 0`, largeur 100%, même fond sombre que le panneau en dessous. Le header et le menu deviennent visuellement **un seul objet**, pas deux calques superposés.

```css
.site-header.menu-open {
  top: 0; left: 0; transform: none;
  width: 100%; max-width: none;
  border-radius: 0; border: 0;
  border-bottom: 1px solid rgba(253,241,225,.1);
  background: #16100c;   /* même fond que le panneau du tiroir */
}
```

### 1.6 Ce qui change sur les pages "formulaire" (login/signup)

Ces pages n'ont pas de bande sombre en haut (juste une colonne photo + une colonne crème claire) — le header en verre sombre y perdrait tout son sens de lecture ("verre sur quoi ?"). Ces pages désactivent le header flottant standard et gèrent leur propre navigation minimale.

---

## Partie 2 — La page "Services" / liste d'expériences avec photos

### 2.1 La bande d'en-tête (`PageHead`, réutilisée sur toutes les pages internes)

Un composant unique, réutilisé partout (FAQ, Activités, Sécurité, Contact...) — **jamais réinventé page par page** :

```tsx
<PageHead
  eyebrow="Choisissez votre balade"
  title={<>Trois façons<br/>de traverser le sable.</>}
  lead="Chaque expérience tourne deux fois par jour..."
  image="/images/hero-combined.jpg"
/>
```

```css
.page-head {
  padding: 200px 0 96px;   /* énorme padding-top : dégage le header flottant */
  background: var(--maroon);
}
.page-head .bg img { opacity: .55; }
.page-head .bg::after {
  background: linear-gradient(180deg,
    rgba(20,8,4,.82) 0%,     /* sombre en haut, sous le header */
    rgba(20,8,4,.55) 55%,    /* zone de lecture du titre */
    rgba(42,16,8,1) 100%);   /* se fond dans le fond de page en bas */
}
```

Le dégradé n'est **pas uniforme** — il est calibré pour que le titre reste toujours lisible peu importe où la photo est claire ou sombre, et qu'il se fonde en douceur avec la section suivante (pas de ligne de coupe nette).

### 2.2 La grille de cartes-photos

```css
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
  margin-top: 64px;
}
.card {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  aspect-ratio: 3/4;         /* portrait, pas paysage */
  box-shadow: 0 24px 60px rgba(42,16,8,.18);
}
.card img {
  transition: transform .8s cubic-bezier(...);  /* zoom lent et doux */
}
.card:hover img {
  transform: scale(1.07);
}
.card::after {
  background: linear-gradient(180deg,
    rgba(20,8,4,0) 40%,       /* transparent en haut : la photo respire */
    rgba(20,8,4,.72) 100%);   /* sombre en bas : texte toujours lisible */
}
```

**Texte en surimpression, pas en dessous** — le titre/description sont posés directement sur la photo (`.cap`, positionné en absolu en bas de la carte), jamais dans un bloc blanc séparé sous l'image :

```tsx
<Link className="card" href={`/activities/${activity.slug}`}>
  <Image src={activity.cardImage} fill sizes="(max-width: 900px) 100vw, 33vw" />
  <div className="cap">
    <span className="num">{activity.kicker}</span>   {/* ex: "Sabria" — petit label */}
    <h3>{activity.title}</h3>
    <p>{activity.description}</p>
  </div>
</Link>
```

### 2.3 Les trois ingrédients qui font la différence

1. **Ratio portrait fixe (3/4)**, pas une hauteur qui varie selon le texte — la grille reste parfaitement alignée peu importe la longueur des titres.
2. **Le zoom au survol est lent** (0.8s) — un zoom rapide a l'air "gadget", un zoom lent a l'air premium.
3. **Le dégradé est asymétrique** (40% transparent en haut, 72% opaque en bas) — jamais un voile uniforme sur toute la photo, qui tue la photo elle-même.

### 2.4 Ce qu'il faut retenir pour Calmatrip

| Élément Dunes Insolites | Principe transférable |
|---|---|
| Mega-menu avec photo | Un menu de navigation vers des "produits" (activités, destinations, catégories) doit **toujours montrer une image**, jamais juste un mot |
| Header qui se réduit au scroll | Densité progressive, pas de saut brutal — 2 états indépendants (contraste / taille) valent mieux qu'un seul état combiné |
| Header ↔ tiroir mobile = un seul objet | Ne jamais laisser deux calques UI se chevaucher visuellement sans lien — fusionner ou clarifier la hiérarchie |
| `PageHead` unique et réutilisé | Une seule bande d'en-tête pour toutes les pages internes, jamais réinventée — cohérence garantie, maintenance facile |
| Cartes portrait + texte en surimpression | Format ratio fixe + dégradé asymétrique = la donnée réelle du "menu visuel" |
| Zoom lent au survol | La vitesse d'une micro-interaction communique le niveau de gamme autant que sa présence |
