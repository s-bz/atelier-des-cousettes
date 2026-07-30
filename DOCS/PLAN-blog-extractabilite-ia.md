# Plan d'extractabilité du blog par les moteurs de réponse

**Date** : 30 juillet 2026
**Portée** : les 22 articles de `src/content/blog/`
**Statut** : plan à arbitrer. Rien n'a été rédigé — seuls les champs qui accueilleront ce travail existent.

---

## Pourquoi ce plan

Les trois pages de formules portent une FAQ depuis longtemps, et c'est elle qui les fait
citer : une question posée comme un visiteur la pose, une réponse qui tient seule, hors
du paragraphe qui l'entoure. Le blog, qui représente pourtant l'essentiel du site,
n'avait rien à extraire qu'un texte suivi.

État constaté au 30 juillet 2026 :

| Mesure | Blog | Pages de formules |
|---|---|---|
| Sections FAQ | 0 sur 22 | 3 sur 3 (5 à 7 questions) |
| Schéma `FAQPage` | aucun | présent |
| Schéma `HowTo` | aucun | sans objet |
| Tableaux comparatifs | 1 sur 22 | — |
| Sources citées / statistiques | 0 | — |
| Longueur médiane | ~830 mots | — |

Trois leviers, mesurés par l'étude GEO de Princeton (KDD 2024, sur Perplexity) :
citer des sources +40 %, ajouter des statistiques +37 %, citer un expert +30 %.
Le tableau comparatif est par ailleurs le format le plus cité, tous sujets confondus.

**Ce qui est déjà en place** (branche `seo/ia-fichiers-machine-et-faq-blog`) : les champs
`faqItems`, `howToSteps`, `howToDuree` et `howToFournitures` existent dans Keystatic pour
chaque article, le rendu et les schémas `FAQPage` / `HowTo` suivent automatiquement.
Un article sans question ne porte pas de FAQ, un article sans étape ne porte pas de
`HowTo` : **le balisage ne paraît que rempli**, jamais à vide.

---

## Règles à tenir

1. **Ce qui est balisé est affiché.** La FAQ apparaît sous l'article. Une question
   présente dans le JSON-LD mais absente de la page est un balisage trompeur, que Google
   sanctionne — et de toute façon des questions que personne ne lit ne valent pas d'être
   écrites.
2. **Une réponse tient seule.** 40 à 60 mots, compréhensibles sans le paragraphe
   au-dessus. C'est la longueur qu'un moteur extrait tel quel.
3. **Les étapes reprennent le texte, elles ne le remplacent pas.** `howToSteps` résume
   des étapes déjà présentes dans l'article. Un article qui n'explique pas un geste ne
   reçoit pas d'étapes, même s'il est long.
4. **Pas de rédaction séparée « pour l'IA ».** Écrire une variante destinée aux moteurs
   tombe sous la politique de contenu à grande échelle de Google. Le même texte sert les
   deux publics.
5. **Une source par affirmation chiffrée.** Un prix, une durée de vie, une température de
   lavage : soit c'est l'expérience d'Isabelle et on le dit (« sur les dizaines d'élèves
   accompagnées à l'atelier »), soit c'est une source extérieure et on la lie.

---

## Priorité 1 — les six articles à traiter d'abord

Ceux dont la requête est déjà posée à un assistant, et où un tableau ou une FAQ change
directement la réponse rendue.

### 1. `choisir-machine-a-coudre` — 541 mots, le plus court du blog

- **Tableau** (manque le plus criant) : mécanique vs électronique, sur 5 lignes — prix,
  entretien, points disponibles, public, durée de vie. C'est exactement la comparaison
  que les assistants reformulent aujourd'hui sans source.
- **FAQ** : « Quel budget pour une première machine à coudre ? » / « Faut-il une machine
  mécanique ou électronique pour débuter ? » / « Quelles marques sont fiables en entrée
  de gamme ? » / « Peut-on acheter une machine à coudre d'occasion ? »
- **Source** : la fourchette 150–350 € et les trois marques citées sont des affirmations
  chiffrées sans attribution. Les rattacher explicitement à l'expérience d'atelier.
- **Longueur** : viser 900 mots. C'est le plus court du blog sur un sujet très demandé.

### 2. `surjeteuse-a-quoi-ca-sert` — 828 mots

- **Tableau** : surjeteuse vs machine à coudre — fonction, nombre de fils, coupe du bord,
  peut-elle assembler, prix, pour qui. L'article pose déjà la question en titre de
  section mais y répond en prose.
- **FAQ** : « Peut-on coudre sans surjeteuse ? » / « Combien coûte une surjeteuse ? » /
  « Une surjeteuse remplace-t-elle une machine à coudre ? » / « Est-ce difficile à
  enfiler ? »
- **Lien interne** : vers `/stages-thematiques/` — le stage surjeteuse existe (70 €) et
  l'article est sa meilleure porte d'entrée.

### 3. `tissus-debutants` — 658 mots, 5 sections seulement

- **Tableau** : tissu / facilité / usage / prix au mètre / à éviter si. Six à huit lignes
  (coton, popeline, lin, viscose, jersey, satin, mousseline).
- **FAQ** : « Quel tissu pour un premier projet de couture ? » / « Faut-il laver le tissu
  avant de coudre ? » / « Combien de tissu acheter pour une jupe ? » / « Où acheter du
  tissu quand on débute ? »
- **Longueur** : viser 1 000 mots.

### 4. `choisir-fil-aiguille` — 1 095 mots

- **Déjà le seul article avec un tableau** — c'est le modèle à suivre pour les autres.
- **FAQ** seulement : « Quelle aiguille pour du jersey ? » / « À quelle fréquence changer
  l'aiguille de sa machine ? » / « Pourquoi mon fil casse-t-il en cousant ? » /
  « Faut-il le même fil dans la canette et sur le dessus ? »
- Les symptômes déjà listés (points sautés, fil qui casse) sont d'excellentes réponses
  courtes : les remonter en FAQ sans les retirer du corps.

### 5. `prendre-ses-mesures` — 647 mots

- **Tableau** : mesure / où la prendre / erreur fréquente. Sept à huit lignes.
- **FAQ** : « Comment prendre son tour de poitrine ? » / « Faut-il prendre ses mesures
  par-dessus les vêtements ? » / « Quelle taille de patron choisir entre deux tailles ? »
  / « Pourquoi ma taille de patron ne correspond-elle pas à ma taille du commerce ? »
- **Note** : la dernière question est la plus recherchée du sujet et l'article ne la
  traite pas frontalement.

### 6. `erreurs-debutant-couture` — 806 mots, 8 erreurs numérotées

- **FAQ** : reprendre les 4 erreurs les plus consultées sous forme de question
  (« Faut-il laver le tissu avant de coudre ? », « Pourquoi repasser entre chaque
  étape ? », « Qu'est-ce qu'un point d'arrêt et pourquoi le faire ? »).
- **Structure** : les 8 sections sont déjà de bons blocs autonomes. Ajouter une phrase de
  réponse directe en tête de chacune, avant l'explication.

---

## Priorité 2 — les huit tutoriels : étapes + FAQ

Ceux-ci reçoivent en plus le schéma `HowTo`. Les étapes existent déjà dans le texte ; il
s'agit de les recopier dans le champ `howToSteps`, avec `howToDuree` et
`howToFournitures`.

| Article | Étapes déjà dans le texte | Durée à renseigner | FAQ suggérées |
|---|---|---|---|
| `coudre-tote-bag` | 5 (« Étape 1 » à « Étape 5 ») | ~2 h | Combien de tissu pour un tote bag ? Quel tissu choisir ? Faut-il doubler ? |
| `coudre-trousse-fermeture-eclair` | 4 + conseils | 1 à 2 h | Comment poser une fermeture éclair sans plis ? Quelle longueur de fermeture ? |
| `coudre-jupe-elastiquee-premier-vetement` | montage pas à pas | ~3 h | Quelle largeur d'élastique ? Combien de tissu pour une jupe ? Sans patron, vraiment ? |
| `coudre-ourlet-invisible` | 2 méthodes (main / machine) | ~45 min | Comment faire un ourlet invisible à la main ? Quel pied pour ourlet invisible ? |
| `points-couture-main-essentiels` | 6 points numérotés | — | Quel point pour un ourlet à la main ? Quel point est le plus solide ? |
| `retouches-simples-ourlet-bouton-fermeture` | 3 retouches | ~30 min chacune | Comment recoudre un bouton solidement ? Peut-on réparer une fermeture éclair cassée ? |
| `coutures-de-base` | 7 coutures | — | Qu'est-ce qu'une couture anglaise ? Quelle couture pour quel tissu ? (→ **tableau**) |
| `entretenir-machine-a-coudre` | 5 gestes | ~20 min | À quelle fréquence huiler sa machine ? Quelle huile utiliser ? Quand voir un réparateur ? |

**Deux réserves à tenir** :

- `points-couture-main-essentiels` et `coutures-de-base` décrivent des techniques, pas
  une réalisation. Le `HowTo` y est discutable — un `HowTo` sans objet fabriqué promet
  un résultat que l'article ne livre pas. **Recommandation : leur donner une FAQ et un
  tableau, pas d'étapes.**
- `retouches-simples` décrit trois gestes indépendants. Un seul `HowTo` mélangerait trois
  procédures. **Recommandation : FAQ seule.**

Restent donc **cinq articles** réellement candidats au `HowTo` : tote bag, trousse, jupe
élastiquée, ourlet invisible, entretien de la machine.

---

## Priorité 3 — les listicles : FAQ courte, pas d'étapes

Ces articles sont déjà bien structurés et longs. Ils gagnent une FAQ de 3 questions et
rien d'autre.

| Article | Mots | FAQ suggérées |
|---|---|---|
| `couture-zero-dechet-projets-pratiques` | 1 801 | Quels tissus pour des lingettes lavables ? Combien de fois se lavent-elles ? Par quel projet commencer ? |
| `couture-enfants-projets-faciles` | 1 724 | À partir de quel âge coudre avec un enfant ? Quels tissus pour les vêtements de bébé ? Quel projet pour un premier essai ? |
| `idees-cadeaux-couture-faits-main` | 1 429 | Quel cadeau cousu main pour une naissance ? Combien de temps prévoir avant Noël ? |
| `couture-ete-accessoires-vacances` | 1 039 | Quel tissu pour un sac de plage ? Quel tissu imperméable pour une pochette de maillot ? |
| `organiser-espace-couture` | 977 | Quelle surface pour un coin couture ? Comment coudre dans un petit appartement ? Quelle hauteur de table ? |
| `trousse-couture-indispensables` | 805 | Que faut-il pour débuter la couture ? Quel budget pour s'équiper ? Quels ciseaux choisir ? |
| `comprendre-patrons-couture` | 870 | Que signifie le droit-fil ? Marges comprises ou non ? Comment choisir sa taille sur un patron ? |
| `debuter-couture-conseils` | 616 | Par quel projet commencer la couture ? Faut-il prendre des cours ? Combien de temps pour savoir coudre ? |

`debuter-couture-conseils` est court (616 mots) sur une requête très large : il mérite
aussi d'être étoffé à ~900 mots.

---

## Récapitulatif du travail

| Chantier | Articles concernés | Effort |
|---|---|---|
| FAQ (3 à 4 questions, 40–60 mots par réponse) | **22** | ~20 min par article |
| Tableau comparatif à créer | **6** (machine, surjeteuse, tissus, mesures, coutures de base, patrons) | ~30 min par tableau |
| Étapes `HowTo` à recopier | **5** | ~15 min par article |
| Allongement | **3** (machine à coudre, tissus, débuter) | ~1 h par article |
| Sources / attribution d'expertise | **22**, une passe légère | ~5 min par article |

Soit environ **13 à 15 heures** pour l'ensemble, réparties sur autant de semaines que
souhaité. La boucle SEO hebdomadaire (`/seo-improver`) est le véhicule naturel : un ou
deux articles par passage, en commençant par la priorité 1.

---

## Ce qu'il ne faut pas faire

- **Découper les articles en fragments courts « pour l'IA ».** Google le déconseille
  explicitement : titres et paragraphes normaux suffisent.
- **Remplir `howToSteps` sur un article comparatif** pour « avoir le schéma ». Le
  balisage doit décrire ce que la page contient.
- **Écrire des questions que personne ne pose** pour atteindre un compte. Trois vraies
  questions valent mieux que six inventées.
- **Ajouter des statistiques sans source.** Un chiffre non attribué est un risque, pas un
  gain — et l'expérience d'Isabelle est une source légitime dès lors qu'elle est nommée.
