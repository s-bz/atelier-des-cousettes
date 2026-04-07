# L'Atelier des Cousettes

Site web de L'Atelier des Cousettes, un atelier de couture situé dans le Tarn, France. Construit avec Astro et déployé sur Vercel.

**Site en ligne :** [couture-tarn.fr](https://couture-tarn.fr)

## Stack technique

- **Framework :** [Astro](https://astro.build/) 6
- **CMS :** [Keystatic](https://keystatic.com/) (CMS headless basé sur fichiers)
- **Styles :** [Tailwind CSS](https://tailwindcss.com/) 4
- **Tests :** [Vitest](https://vitest.dev/) 4
- **Hébergement :** [Vercel](https://vercel.com/)
- **CI :** GitHub Actions (tests → vérification des types → build)

## Démarrage

### Prérequis

- Node.js 24.x
- pnpm

### Installation

```bash
pnpm install
```

### Développement

```bash
pnpm dev
```

Le site tourne sur `http://localhost:4321`. L'interface d'administration Keystatic est accessible sur `/keystatic`.

### Build

```bash
pnpm build
pnpm preview
```

### Tests

```bash
pnpm test          # exécution unique
pnpm test:watch    # mode watch
```

### Vérification des types

```bash
pnpm check
```

## Structure du projet

```text
src/
├── assets/images/       # Images optimisées (covers, blog, créations, accueil, couturière)
├── components/          # Composants Astro
│   ├── BaseLayout       # → layouts/BaseLayout.astro (meta, header, footer, analytics)
│   ├── Hero             # Image de couverture avec overlay + titre/sous-titre
│   ├── IntroSection     # Texte d'introduction centré + CTA
│   ├── CrossLinksSection # Liens vers les pages de services connexes
│   ├── FaqSection       # Accordéon FAQ (questions/réponses)
│   ├── ContactCTA       # Lien vers le formulaire de contact Tally.so
│   ├── ServiceCard      # Carte service sur l'accueil avec image + tarif
│   ├── DetailCard       # Carte détail avec ancre (stages, ateliers)
│   ├── BlogCard         # Carte pour la liste du blog
│   ├── AnimatriceSection # Bio de l'animatrice avec photo
│   ├── ValueProposition # Éléments de proposition de valeur
│   ├── YouTubeEmbed     # Intégration YouTube en chargement différé
│   ├── ContentPage      # Wrapper Markdoc legacy pour pages prose
│   ├── Header           # Navigation sticky + menu hamburger + aller au contenu
│   └── Footer           # Contact, navigation, copyright
├── content/             # Contenu géré par Keystatic
│   ├── blog/            # Articles de blog (Markdoc .mdoc)
│   ├── creations/       # Éléments de galerie (YAML)
│   ├── pages/           # Singletons de pages (YAML + Markdoc)
│   └── site-settings.yaml
├── layouts/
│   └── BaseLayout.astro # Shell HTML, balises meta, OG, analytics
├── pages/               # Routage basé sur les fichiers
├── styles/
│   └── global.css       # Tokens du thème, polices, styles prose
└── utils/
    ├── ateliers.ts      # Définitions des groupes d'ateliers (source unique de vérité)
    ├── blog.ts          # filterPublishedPosts (filtrage par date)
    ├── images.ts        # resolveImage, resolveImageUrl (résolution par glob)
    ├── nav.ts           # SERVICE_LINKS, getCrossLinks (liens croisés)
    ├── navLinks.ts      # Liens du menu de navigation principal
    ├── reader.ts        # Lecteur Keystatic + helper getPageContext
    ├── schema.ts        # Constructeurs JSON-LD (breadcrumb, page, service, FAQ)
    ├── strings.ts       # toSlug, formatFrenchDate, splitParagraphs, splitLines
    └── __tests__/       # Tests unitaires (58 tests répartis sur 6 fichiers)
```

## Pages du site

| Page | Route | Description |
| ---- | ----- | ----------- |
| Accueil | `/` | Page d'accueil avec services, valeurs, blog, YouTube |
| Ateliers réguliers | `/ateliers-reguliers` | Ateliers couture hebdomadaires/bimensuels |
| Stages thématiques | `/stages-thematiques` | Stages de découverte à thème |
| Un après-midi couture | `/un-apres-midi-couture` | Sessions couture mensuelles l'après-midi |
| La couturière | `/la-couturiere` | À propos de l'animatrice (sections biographiques) |
| Mes créations | `/mes-creations` | Portfolio / galerie avec lightbox |
| Blog | `/blog` | Liste des articles + `/blog/[slug]` pour chaque article |
| Mentions légales | `/mentions-legales` | Mentions légales (noIndex) |

## Gestion de contenu (Keystatic)

Le contenu est géré via [Keystatic](https://keystatic.com/), un CMS headless basé sur fichiers qui stocke le contenu directement dans le dépôt.

### Accès à l'interface d'administration

- **En local :** Lancer `pnpm dev` et naviguer vers `http://localhost:4321/keystatic`
- **En production :** Aller sur `https://couture-tarn.fr/keystatic` (authentification via GitHub)

### Modes de stockage

- **Développement local :** Le contenu est lu/écrit directement sur le disque (`storage: local`)
- **Production :** Le contenu est commité dans le dépôt GitHub (`storage: github`)

### Types de contenu

**Singletons** (pages uniques) :

| Singleton | Chemin | Description |
| --------- | ------ | ----------- |
| Paramètres du site | `src/content/site-settings.yaml` | Nom du site, email, téléphones, réseaux sociaux, adresse |
| Accueil | `src/content/pages/homepage/` | Page d'accueil avec vidéo YouTube |
| Ateliers réguliers | `src/content/pages/ateliers-reguliers/` | Ateliers réguliers avec créneaux groupés |
| Stages thématiques | `src/content/pages/stages-thematiques/` | Stages à thème avec cartes détaillées |
| Un après-midi couture | `src/content/pages/un-apres-midi-couture/` | Sessions couture mensuelles |
| La couturière | `src/content/pages/la-couturiere/` | Sections biographiques avec images |
| Mes créations | `src/content/pages/mes-creations/` | Paramètres de la page portfolio |
| Index blog | `src/content/pages/blog-index/` | Paramètres de la page liste du blog |
| Mentions légales | `src/content/pages/mentions-legales/` | Mentions légales (Markdoc) |

**Collections :**

| Collection | Chemin | Description |
| ---------- | ------ | ----------- |
| Blog | `src/content/blog/*/index.mdoc` | Articles avec image de couverture, date de publication, SEO |
| Créations | `src/content/creations/*` | Éléments de galerie avec image, catégorie, ordre d'affichage |

### Images de couverture

Les images de couverture sont stockées par page dans `src/assets/images/covers/<slug-page>/` et référencées dans le schéma de chaque singleton. Elles sont optimisées par le pipeline d'images d'Astro au moment du build.

## Architecture

### Patron de page

Toutes les pages suivent une structure par sections cohérente :

1. **Hero** — image de couverture avec overlay + titre/sous-titre
2. **Introduction** — texte centré + CTA (via `IntroSection`)
3. **Sections de contenu** — contenu structuré spécifique à la page
4. **FAQ** — paires question/réponse optionnelles (via `FaqSection`)
5. **Liens croisés** — liens vers les services connexes (via `CrossLinksSection`)

Les sections alternent entre fond accent (`bg-[var(--color-bg-accent)]`) et fond neutre.

### SEO

- Schémas JSON-LD sur chaque page (BreadcrumbList, WebPage, Service, FAQPage, Article, Person, LocalBusiness)
- Constructeurs de schémas dans `src/utils/schema.ts` — `buildPageSchemas()`, `buildServicePageSchemas()`, `buildBreadcrumbSchema()`
- Balises meta Open Graph + Twitter Card via `BaseLayout`
- Sitemap via `@astrojs/sitemap`, `robots.txt` autorise les crawlers IA, `llms.txt` pour un résumé lisible par les machines

### Pipeline d'images

- Toutes les images dans `src/assets/images/` (jamais `public/`) pour l'optimisation Astro
- `resolveImage()` / `resolveImageUrl()` résolvent les chemins Keystatic via `import.meta.glob`
- Les composants reçoivent des `ImageMetadata` pré-résolus (pas des chemins bruts)
- Format : WebP, qualité 60 (couvertures) / 80 (contenu), largeurs responsives

### Styles

- Tailwind CSS mobile-first avec propriétés CSS personnalisées depuis `global.css`
- Polices : Playfair Display Variable (titres), Manrope Variable (corps)
- Classe utilitaire `.heading-font` pour les éléments non-titre nécessitant la police de titre
