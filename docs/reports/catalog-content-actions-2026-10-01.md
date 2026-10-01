# Corrections de contenu à faire dans le back-office

Les éléments ci-dessous proviennent de l’API publique française contrôlée le
1er octobre 2026. Ils ne sont pas corrigés automatiquement, car leur rédaction
ou leur sens métier doit être validé par l’équipe.

## Circuit encore en anglais

Dans **Catalogue → Circuits**, ouvrir le circuit dont le slug est
`from-tunis-3-day-sahara-desert-and-berber-villages-tour`, puis rédiger en
français les champs de base suivants :

- Titre : `From Tunis: 3-Day Sahara Desert and Berber Villages Tour`
- Description : `Discover the beauty of southern Tunisia on this 3-day adventure from Tunis. Explore ancient Roman monuments, traditional Berber villages, and the Sahara Desert.`
- Inclus :
  - `Accommodation in a troglodyte guesthouse`
  - `Accommodation in a Sahara desert camp`
  - `Traditional meals`
  - `Guided tours of El Jem, Matmata, Toujane, Chenini, Tataouine, Douz, Chott El Jerid, Chebika, Tamerza, and Kairouan`
  - `Traditional folklore entertainment`
  - `Sand bread preparation demonstration`
  - `Sunset viewing over the dunes`
  - `Mint tea welcome`
- Non inclus :
  - `Personal expenses`
  - `Optional activities like camel riding, quad biking, 4x4 desert excursion, and sandboarding`
  - `Travel insurance`

Ne pas remplir la traduction française dans l’onglet anglais : le français est
porté par les champs principaux du circuit, les autres langues par leurs
traductions dédiées.

## Restrictions à valider

- Circuit `from-tunis-sousse-2-day-sahara-desert-camp-oases-tour` : vérifier
  avec l’équipe opérationnelle si `épilepsie` constitue réellement une
  contre-indication. La retirer de **Non adapté pour** si elle n’est pas une
  règle de sécurité validée.
- Circuit `tunisie-excursion-de-3-jours-dans-le-desert-du-sahara-avec-camp-et-bivouac` :
  `créme solaires`, `lunettes solaires` et `chapeau` sont actuellement rangés
  dans **Non adapté pour**. Les déplacer vers **À apporter** et corriger le
  premier libellé en `Crème solaire`.
- Circuit `from-tunis-3-day-sahara-desert-and-berber-villages-tour` : retirer le
  tiret parasite devant `Personnes à mobilité réduite` et devant `Jeter des
  déchets dans la nature`.

## Corrections automatisées par la migration V65

La migration corrige les contenus explicitement fournis : titre et description
du bivouac, `Tente de camping simple`, `Balade à dos de dromadaire`, ainsi que
le titre et la description de `Quad`. Il ne faut pas les ressaisir manuellement
après le déploiement.

## Fiches référencées par le site mais absentes de l’API

Le build avec l’API de production reçoit une réponse 404 pour les activités
suivantes, dans plusieurs langues :

- `soirees-sous-les-etoiles`
- `bedouin-diner-sahara-tunisien`
- `le-pain-de-sabel`

Ces slugs existent encore dans les données de repli et dans le contrat des URL
historiques. Vérifier dans **Catalogue → Activités** si ces fiches doivent être
réactivées/publiées. Si elles ne sont plus proposées, il faudra choisir une
redirection vers une fiche réellement équivalente ; ne pas les rediriger vers
la page d’accueil.
