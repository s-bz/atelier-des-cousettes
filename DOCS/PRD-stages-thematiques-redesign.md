# PRD — Refonte de la page Stages thématiques pour la clarté et l'ergonomie

## Problème

La page « Stages thématiques » présente tout son contenu dans un seul bloc Markdoc monolithique : introduction, description de chaque stage, dates, FAQ et liens croisés. Un visiteur doit défiler un long mur de texte pour trouver le stage qui l'intéresse, comparer les prix ou comprendre les pré-requis. Le format est peu scannable et ne permet pas une gestion indépendante de chaque stage dans Keystatic.

La page d'accueil a déjà été restructurée avec succès en sections distinctes et scannables (PRD-homepage-redesign.md). L'objectif est d'appliquer la même approche à la page stages.

## Objectif

Restructurer la page en sections visuellement distinctes, ordonnées selon le parcours naturel d'un visiteur :

1. « De quoi s'agit-il ? » (introduction)
2. « Quels stages sont proposés et à quel prix ? » (cartes stages)
3. « Questions pratiques » (FAQ)
4. « Comment s'inscrire ? » (CTA + liens croisés)

Aucun changement visuel (couleurs, polices, design tokens inchangés). Réutilisation maximale des composants existants.

## User Stories

### US-1 : Aperçu rapide des stages disponibles

**En tant que** nouveau visiteur, **je veux** voir tous les stages avec leur nom, prix et durée dans un format visuel scannable (cartes), **afin de** identifier rapidement le stage qui m'intéresse sans lire tout le texte.

### US-2 : Détail d'un stage

**En tant que** visiteur intéressé par un stage précis, **je veux** voir la description complète et les prochaines dates d'un stage en un clic, **afin de** décider si ce stage me convient et quand m'inscrire.

### US-3 : Réponses aux questions pratiques

**En tant que** futur participant, **je veux** trouver rapidement les réponses aux questions fréquentes (matériel, pré-requis, taille des groupes, inscription), **afin de** me préparer sans avoir à contacter l'atelier.

### US-4 : Navigation vers d'autres formules

**En tant que** visiteur qui ne trouve pas son bonheur dans les stages, **je veux** voir des liens vers les ateliers réguliers et les après-midi couture, **afin de** découvrir les autres formules proposées.

### US-5 : Gestion indépendante de chaque stage via Keystatic

**En tant qu'** administratrice (Isabelle), **je veux** pouvoir modifier chaque stage individuellement (description, prix, durée, dates) et les questions FAQ dans Keystatic, **afin de** mettre à jour le contenu sans toucher au code.

## Solution

### Nouvelle architecture des sections

| #   | Section              | Fond              | Contenu                                                                                       |
| --- | -------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| 1   | Hero Banner          | Image de couverture | Titre + sous-titre (inchangé)                                                                |
| 2   | Introduction + CTA   | Par défaut        | Paragraphe d'accroche + note adhésion + CTA contact                                          |
| 3   | Cartes stages        | Accent            | Grille de cartes : nom, prix, durée, description courte                                      |
| 4   | Détails stages + CTA | Par défaut        | Sections dépliables ou blocs : description complète + dates par stage + CTA contact           |
| 5   | FAQ + CTA            | Accent            | Questions/réponses structurées (pré-requis, matériel, groupes, inscription) + CTA contact     |
| 6   | Liens croisés        | Par défaut        | Liens vers ateliers réguliers et après-midi couture                                           |

Chaque section majeure inclut un `ContactCTA` pour maximiser les conversions, comme sur la page d'accueil.

### Changements Keystatic

Le champ unique `content` (Markdoc) est remplacé par des champs structurés dans le singleton `stagesThematiques` :

- `introduction` — Texte court d'accroche
- `stages[]` — Tableau de stages, chacun avec :
  - `name` — Nom du stage (ex : « Initiation machine à coudre »)
  - `price` — Prix (ex : « 40 »)
  - `duration` — Durée (ex : « 3h »)
  - `shortDescription` — Description courte pour la carte
  - `fullDescription` — Description complète (Markdoc)
  - `dates` — Texte des prochaines dates (Markdoc ou texte multiligne)
  - `prerequisite` — Texte optionnel sur les pré-requis
- `faqItems[]` — Tableau de questions/réponses :
  - `question` — La question
  - `answer` — La réponse (texte multiligne)
- `crossLinks` — Texte de fin avec liens vers les autres formules (Markdoc)
- `schemaOffers` — Conservé tel quel (déjà structuré pour le SEO)
- `ctaLabel` — Libellé du bouton CTA

### Nouveau composant

- **StageCard.astro** — Carte de stage (nom + prix + durée + description courte). Style cohérent avec ServiceCard.astro (même ombres, radius, typographie), mais sans image (les stages n'ont pas de visuels individuels). Inclut un lien d'ancre vers la section détail correspondante.

### Composants réutilisés (sans modification)

- Hero.astro — Bandeau titre + image de couverture
- ContactCTA.astro — Bouton vers formulaire de contact Tally
- BaseLayout.astro — Mise en page globale avec méta-tags

### Composant abandonné

- ContentPage.astro — N'est plus utilisé pour cette page car on construit la mise en page par sections directement dans `stages-thematiques.astro`, comme fait pour `index.astro`.

### Schema.org

Le schéma `Service` avec `Offer` items est conservé et continue d'être généré depuis `schemaOffers`. Le `BreadcrumbList` est reproduit directement dans la page (comme il l'était via ContentPage). Le schéma `FAQPage` est ajouté, généré depuis les `faqItems[]`.

## Contenu migré

Les 6 stages actuels sont migrés depuis le Markdoc vers les champs structurés :

| Stage                          | Prix       | Durée |
| ------------------------------ | ---------- | ----- |
| Initiation machine à coudre    | 40 €       | 3h    |
| Stage découverte de la couture | 40 €–90 €  | 3h–7h |
| Stage surjeteuse               | 65 €       | 5h    |
| Stage patronage                | 40 €       | 3h    |
| Stage banane                   | 50 €       | 4h    |
| Stage sac et tote bag          | 40 €       | 3h    |

Les 4 questions FAQ sont migrées depuis le Markdoc :

1. Faut-il avoir de l'expérience pour participer ?
2. Quel matériel faut-il apporter ?
3. Quelle est la taille des groupes ?
4. Comment s'inscrire à un stage ?

## Fichiers modifiés/créés

| Fichier                                             | Action                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| `keystatic.config.ts`                               | Modifié — nouveaux champs structurés pour `stagesThematiques`        |
| `src/content/pages/stages-thematiques/index.yaml`   | Créé — contenu migré en YAML structuré                               |
| `src/content/pages/stages-thematiques/index.mdoc`   | Supprimé — remplacé par index.yaml + champs Markdoc intégrés        |
| `src/pages/stages-thematiques.astro`                | Réécrit — nouvelle mise en page par sections                         |
| `src/components/StageCard.astro`                    | Créé — carte de stage (nom, prix, durée, description)               |

## Vérification

- `pnpm build` — aucune erreur de build
- `pnpm check` — 0 erreurs TypeScript
- Vérification visuelle mobile et desktop via `pnpm dev`
- Vérification que les schémas JSON-LD (Service + FAQPage + BreadcrumbList) sont présents
- Vérification que tous les champs sont éditables dans `/keystatic`
- Vérification que les liens croisés (ateliers réguliers, après-midi couture) fonctionnent
