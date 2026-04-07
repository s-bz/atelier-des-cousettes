# PRD — Refonte de la page d'accueil pour la clarté et l'ergonomie

## Problème

La page d'accueil actuelle présente tout le contenu dans un seul bloc Markdoc monolithique : introduction, avantages, formules, animatrice et actualités. Les cartes de services (les 3 formules de cours) apparaissent *en bas de page*, après ce mur de texte. Un nouveau visiteur doit défiler longuement avant de comprendre les offres et les tarifs.

## Objectif

Restructurer la page d'accueil en sections distinctes et scannables, ordonnées selon le parcours naturel d'un visiteur :
1. « Qu'est-ce que c'est ? » (introduction)
2. « Que puis-je y faire et à quel prix ? » (services)
3. « Pourquoi leur faire confiance ? » (avantages + animatrice + vidéo)
4. « Quoi de neuf ? » (actualités)

Aucun changement visuel (couleurs, polices, design tokens inchangés).

## User Stories

### US-1 : Découverte rapide des offres
**En tant que** nouveau visiteur, **je veux** voir les 3 formules de couture avec leurs tarifs dès le haut de la page, **afin de** comprendre immédiatement ce que propose l'atelier sans avoir à défiler.

### US-2 : Compréhension des avantages
**En tant que** visiteur intéressé, **je veux** lire les avantages de l'atelier (petits groupes, tous niveaux, deux lieux) dans une section dédiée et structurée, **afin de** me convaincre de la qualité de l'accompagnement.

### US-3 : Rencontre avec l'animatrice
**En tant que** futur élève potentiel, **je veux** voir qui est Isabelle Bultez dans une section mise en avant avec sa photo, **afin de** créer un lien de confiance avant de m'inscrire.

### US-4 : Consultation des actualités
**En tant que** visiteur régulier ou ancien élève, **je veux** voir les dernières actualités de la saison et les articles de blog récents, **afin de** rester informé sans chercher dans les menus.

### US-5 : Gestion du contenu via Keystatic
**En tant qu'** administratrice (Isabelle), **je veux** pouvoir modifier chaque section indépendamment dans Keystatic (introduction, avantages, animatrice, actualités), **afin de** mettre à jour le contenu sans toucher au code.

## Solution

### Nouvelle architecture des sections

| # | Section | Fond | Contenu |
|---|---------|------|---------|
| 1 | Hero Banner | Image de couverture | Titre + sous-titre (inchangé) |
| 2 | Introduction + Image | Par défaut | Paragraphe d'accroche + photo de l'atelier |
| 3 | Cartes services | Accent | 3 cartes avec image, description courte et fourchette de prix |
| 4 | Pourquoi nous choisir | Par défaut | 5 avantages en grille 2 colonnes (desktop) |
| 5 | Votre animatrice | Accent | Photo + bio + lien vers /la-couturiere |
| 6 | Vidéo YouTube | Par défaut | Vidéo de présentation |
| 7 | Actualités | Accent | Actualités saison (Markdoc) + 2 derniers articles de blog |
| 8 | CTA Contact | Par défaut | Bouton vers formulaire Tally |

### Changements Keystatic

Le champ unique `content` (Markdoc) est remplacé par des champs structurés :
- `introduction` — Texte court
- `valuePropositionsTitle` + `valuePropositions[]` — Titre + tableau d'avantages (titre + description)
- `serviceCards[].priceRange` + `serviceCards[].shortDescription` — Nouveaux champs par carte
- `animatriceTitle`, `animatriceText`, `animatriceImage`, `animatriceLinkLabel` — Section dédiée
- `actualitesTitle`, `actualitesContent` (Markdoc), `actualitesBlogLabel` — Actualités

### Nouveaux composants

- **ServiceCard.astro** — Carte service enrichie (image + titre + description + prix)
- **ValueProposition.astro** — Grille d'avantages (2 colonnes desktop, 1 colonne mobile)
- **AnimatriceSection.astro** — Mise en page image + texte côte-à-côte

### Composants réutilisés (sans modification)

- Hero.astro, ContactCTA.astro, YouTubeEmbed.astro, BlogCard.astro, BaseLayout.astro

## Fichiers modifiés/créés

| Fichier | Action |
|---|---|
| `keystatic.config.ts` | Modifié — nouveaux champs homepage |
| `src/content/pages/homepage/index.yaml` | Créé — contenu migré en YAML structuré |
| `src/content/pages/homepage/actualitesContent.mdoc` | Créé — contenu Markdoc actualités |
| `src/content/pages/homepage/index.mdoc` | Supprimé — remplacé par index.yaml |
| `src/pages/index.astro` | Réécrit — nouvelle mise en page par sections |
| `src/components/ServiceCard.astro` | Créé |
| `src/components/ValueProposition.astro` | Créé |
| `src/components/AnimatriceSection.astro` | Créé |

## Vérification

- `pnpm build` — aucune erreur de build
- `pnpm check` — 0 erreurs TypeScript
- Vérification visuelle mobile et desktop via `pnpm dev`
- Vérification que les schémas JSON-LD (LocalBusiness + WebSite) sont toujours présents
- Vérification que tous les champs sont éditables dans `/keystatic`
