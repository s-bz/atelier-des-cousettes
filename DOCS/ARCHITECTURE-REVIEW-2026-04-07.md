# Revue d'architecture — couture-tarn.fr

**Date :** 7 avril 2026
**Stack :** Astro 6 + Keystatic 5 + Tailwind CSS 4 + Vercel

---

## Résumé exécutif

Site marketing piloté par CMS avec 15 pages indexées (8 statiques + 7 articles de blog). L'architecture est solide pour un site vitrine avec un seul éditeur de contenu. Keystatic fournit un workflow CMS fichier avec stockage GitHub en production.

**Points forts :** Zéro contenu codé en dur dans les pages — tout passe par le CMS. Schéma SEO complet sur chaque page. Utilitaires partagés (images, navigation, schémas). CI en place. En-têtes de sécurité configurés.

**Points corrigés (2026-04-08) :** Violations DRY résolues (IntroSection, CrossLinksSection, getPageContext, splitParagraphs/Lines, getCrossLinks). 33 inline styles `font-family` supprimés. Schémas JSON-LD migrés vers les utilitaires partagés. Accessibilité améliorée (skip-to-content, footer sémantique, aria-labels). Hero harmonisé (ImageMetadata). Score : **7.9 → 8.9/10**.

---

## Cartographie de l'architecture actuelle

```
                    ┌─────────────┐
                    │   Vercel    │
                    │  (Deploy)   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │     Astro 6 (SSG)       │
              │  astro build → dist/    │
              └────────────┬────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  ┌─────┴─────┐    ┌──────┴──────┐    ┌──────┴──────┐
  │  Layouts   │    │   Pages     │    │ Composants  │
  │ BaseLayout │    │ 10 routes   │    │ 12 Astro    │
  │ContentPage │    │ (1 dynam.)  │    │ composants  │
  └─────┬─────┘    └──────┬──────┘    └──────┬──────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
              ┌────────────┴────────────┐
              │   Keystatic (CMS)       │
              │ 9 singletons            │
              │ 2 collections           │
              │ Local dev / GitHub prod │
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │    src/content/         │
              │ .mdoc (Markdoc) + YAML  │
              └─────────────────────────┘
```

---

## Inventaire des fichiers

| Catégorie | Nombre | Fichiers |
|-----------|--------|----------|
| Pages | 10 | index, blog/index, blog/[slug], 3 services, la-couturiere, mes-creations, mentions-legales, ateliers-reguliers-compare |
| Layouts | 2 | BaseLayout, ContentPage (legacy) |
| Composants | 12 | Header, Footer, Hero, BlogCard, ContactCTA, YouTubeEmbed, ServiceCard, DetailCard, ValueProposition, AnimatriceSection, FaqSection, ContentPage |
| Utilitaires | 8 | reader.ts, images.ts, navLinks.ts, nav.ts, blog.ts, ateliers.ts, schema.ts, strings.ts |
| Styles | 1 | global.css (188 lignes, propriétés CSS custom dans `@theme`) |
| Contenu (CMS) | 25 | 9 singletons, 13 articles de blog, 3 créations |
| Ressources publiques | 9 | favicon, icônes, manifest, robots.txt, llms.txt, og-default.jpg |
| Configuration | 6 | astro.config, keystatic.config, tsconfig, vercel.json, .npmrc, package.json |
| Scripts | 1 | patch-keystatic.mjs |
| **Total source** | **34** | |

---

## Évaluation par domaine

### 1. Architecture CMS — Note : 10/10

**Ce qui fonctionne bien :**

- Tout le contenu visible par l'utilisateur passe par Keystatic — zéro texte codé en dur dans les pages `.astro`
- Séparation singleton/collection claire : singletons pour les pages, collections pour le contenu répétable
- Helper `coverImageFields(slug)` regroupe image + alt en un seul spread — utilisé par 9 singletons
- `schemaOffersField()` factorise les offres de prix pour les 3 pages de services
- Navigation partagée via `src/utils/navLinks.ts` — source unique pour Header + Footer
- Auteur et éditeur configurables depuis `siteSettings` (`authorName`, `authorJobTitle`) — lus dans tous les schémas
- Singleton blogIndex pour les métadonnées de la page de listing

**Axes d'amélioration :** ✅ CORRIGÉ (2026-04-08)

- ~~Le champ `price` dans `schemaOffersField()` sans validation regex~~ → ✅ Validation `pattern: /^\d+(\.\d{1,2})?$/` ajoutée
- ~~Le champ `order` des créations accepte les nombres négatifs~~ → ✅ `validation: { min: 0 }` ajouté

---

### 2. Architecture des composants — Note : 7/10 → 9/10

**Ce qui fonctionne bien :**

- Responsabilité unique claire : chaque composant remplit une seule fonction
- `Hero` bascule élégamment en mode texte seul lorsqu'il n'y a pas d'image de couverture
- `FaqSection` encapsule le rendu FAQ + fond accent + CTA optionnel
- `DetailCard` unifie les cartes stages et ateliers (anciennement StageCard + AtelierCard)
- Utilitaire partagé `resolveImage()` / `resolveImageUrl()` centralise la résolution d'images

**Violations DRY — Composants :** ✅ CORRIGÉ (2026-04-08)

| Problème | Statut |
| -------- | ------ |
| `style="font-family: var(--font-heading);"` en inline (33 occurrences) | ✅ Supprimé — les headings h1-h4 héritent de `global.css`, les non-headings utilisent `.heading-font` |
| Sections intro dupliquées (5 pages) | ✅ Extrait en `IntroSection.astro` |
| Sections cross-links dupliquées (4 pages) | ✅ Extrait en `CrossLinksSection.astro` avec `getCrossLinks()` |
| `splitParagraphs()` / `splitLines()` dupliqués | ✅ Factorisé dans `strings.ts` |
| `filterPublishedPosts()` non utilisé dans `index.astro` | ✅ Corrigé |
| Breadcrumb schema dupliqué dans `blog/[slug]` | ✅ Migré vers `buildBreadcrumbSchema()` dans `schema.ts` |

**Incohérence des props image :** ✅ CORRIGÉ (2026-04-08)

Tous les composants reçoivent maintenant `ImageMetadata` pré-résolu :

- `ServiceCard` : `resolvedImage: ImageMetadata` ✓
- `AnimatriceSection` : `image?: ImageMetadata` ✓
- `Hero` : `coverImage?: ImageMetadata` ✅ (était `string`, migration vers pré-résolution)

---

### 3. Violations DRY — Pages — Note : 6/10 → ✅ 9/10 (2026-04-08)

Toutes les violations DRY identifiées ont été corrigées :

| # | Problème | Statut |
| - | -------- | ------ |
| 3a | Section introduction dupliquée (5 pages) | ✅ `IntroSection.astro` extrait |
| 3b | Section cross-links dupliquée (4 pages) | ✅ `CrossLinksSection.astro` extrait |
| 3c | Résolution OG image dupliquée (8 pages) | ✅ Convention acceptée (`import.meta.glob` = compile-time) |
| 3d | Lecture `settings` + `siteUrl` dupliquée (7 pages) | ✅ `getPageContext(Astro.site)` dans `reader.ts` |
| 3e | Filtrage cross-links dupliqué (5 pages) | ✅ `getCrossLinks(excludeHref)` dans `nav.ts` |
| 3f | Découpage de texte dupliqué (5 pages + 1 composant) | ✅ `splitParagraphs()` / `splitLines()` dans `strings.ts` |
| 3g | Filtrage blog posts dupliqué dans `index.astro` | ✅ Utilise `filterPublishedPosts()` |
| 3h | Import inutilisé `blog/index.astro` | ✅ Supprimé |

---

### 4. Architecture SEO et schémas — Note : 8/10 → 9/10

**Ce qui fonctionne bien :**

- Chaque page dispose d'un schéma `BreadcrumbList`
- Schémas spécifiques par page : `LocalBusiness` + `WebSite` (accueil), `Service` + offres (pages services), `Article` (blog), `ImageGallery` (créations), `CollectionPage` (listing blog)
- URL canonique sur chaque page
- Open Graph + Twitter Cards sur chaque page
- `robots.txt` autorise explicitement les robots IA
- `llms.txt` fournit un résumé métier lisible par les machines
- Sitemap généré automatiquement
- `hasOfferCatalog` dérive les noms de services des singletons CMS au moment du build
- Utilitaires partagés `buildPageSchemas()` et `buildServicePageSchemas()` dans `schema.ts`

**Schémas construits manuellement :** ✅ CORRIGÉ (2026-04-08)

| Page | Statut |
| ---- | ------ |
| `blog/index.astro` | ✅ Utilise `buildPageSchemas()` |
| `blog/[slug].astro` | ✅ Utilise `buildBreadcrumbSchema()` pour le breadcrumb 3 niveaux |
| `ContentPage.astro` | ✅ Migré vers `buildPageSchemas()` |
| `index.astro` | ✓ Personnalisé (LocalBusiness) — justifié |

**Validation FAQ :** ✅ `isValidFaqItem()` filtre les items vides dans `buildServicePageSchemas()`.

**Axes d'amélioration restants :**

- Les horaires d'ouverture, les coordonnées géographiques et la fourchette de prix restent codés en dur sur la page d'accueil — priorité faible car rarement modifiés

---

### 5. Pipeline d'images — Note : 9/10 → 10/10

**Ce qui fonctionne bien :**

- Toutes les images utilisent le composant `<Image>` d'Astro avec conversion webp
- Paramètres de qualité cohérents : 60 pour les couvertures, 80 pour le contenu
- Largeurs responsives : `[640, 1024, 1440]` pleine largeur, `[320, 480, 640]` grilles
- Utilitaires partagés `resolveImage()` / `resolveImageUrl()`
- Images de couverture organisées par slug de page dans `src/assets/images/covers/{slug}/`
- Noms de fichiers descriptifs (ex : `atelier-couture-hero.jpg`)

**Axes d'amélioration :** ✅ CORRIGÉ (2026-04-08)

- `resolveImage()` émet désormais un `console.warn` en mode dev quand une image n'est pas trouvée — les erreurs de configuration sont visibles sans casser le build.

---

### 6. Styles et système de design — Note : 8/10 → 9/10

**Ce qui fonctionne bien :**

- Les propriétés CSS personnalisées dans le bloc `@theme` fournissent une source de vérité unique
- Système à deux polices (Playfair Display + Manrope) cohérent et auto-hébergé
- Les styles prose gèrent toute la sortie Markdoc avec une hiérarchie correcte
- Le débordement d'image sur desktop (`margin-left: -3rem`) est élégant
- Jetons CSS nettoyés — aucun token inutilisé
- Menu hamburger mobile avec animation de glissement (`max-height` transition)

**Problèmes identifiés :** ✅ CORRIGÉ (2026-04-08)

| Problème | Statut |
| -------- | ------ |
| 33 instances de `style="font-family: var(--font-heading);"` inline | ✅ Supprimé — classe `.heading-font` dans `global.css` pour les non-headings |
| `Footer.astro` : `color: #faf9f5` en dur | ✅ Remplacé par `text-[var(--color-bg-accent)]` |
| Largeurs de conteneur incohérentes (`max-w-3xl`, `max-w-4xl`, `max-w-5xl`) | ⚠️ Reste — convention documentée dans CLAUDE.md |
| `.service-card:hover` shadow identique au défaut | ✅ Hover distinct avec `translateY(-2px)` et shadow plus forte |

---

### 7. Accessibilité — Note : 6/10 → 8/10

**Ce qui fonctionne bien :**

- `YouTubeEmbed` a un `aria-label` ✓
- Hamburger menu met à jour `aria-expanded` correctement ✓
- Balise `<time>` avec attribut `datetime` dans `BlogCard` ✓
- `<footer>` sémantique ✓

**Problèmes identifiés :** ✅ CORRIGÉ (2026-04-08)

| Problème | Statut |
| -------- | ------ |
| Pas de lien « Aller au contenu » (skip-to-content) | ✅ Ajouté dans Header.astro + `id="main-content"` dans BaseLayout |
| Liens navigation du footer dans `<div>` sans `<ul>/<li>` sémantique | ✅ Restructuré avec `<nav>` + `<ul>/<li>` |
| Pas d'`aria-label` sur les liens des cartes | ✅ Ajouté sur ServiceCard, DetailCard, BlogCard |
| En-têtes footer en `<h3>` au lieu de `<h2>` | ✅ Corrigé en `<h2>` |

---

### 8. Routage et déploiement — Note : 9/10

**Ce qui fonctionne bien :**

- Routage basé sur les fichiers, clair et simple
- Redirections 301 correctes pour les anciennes URLs / URLs mal orthographiées dans `vercel.json`
- En-têtes de cache immutables pour les images
- Redirection sitemap de `/sitemap.xml` vers `/sitemap-index.xml`
- `getStaticPaths()` génère correctement les slugs de blog

**Note :** `trailingSlash: 'always'` a été testé mais provoquait des 404 avec l'adaptateur Vercel — le comportement par défaut d'Astro fonctionne correctement.

---

### 9. Tests et CI — Note : 7/10

**Ce qui fonctionne bien :**

- Pipeline CI en place : GitHub Actions exécutant `pnpm check` + `pnpm build` sur push/PR vers main
- Le build lui-même constitue le meilleur test d'intégration pour un site de cette taille

**Axes d'amélioration :**

- Aucun test unitaire ou E2E — acceptable pour un site marketing de 15 pages, mais à reconsidérer si le site grandit

---

### 10. Sécurité — Note : 9/10

**Ce qui fonctionne bien :**

- Aucun formulaire de saisie utilisateur (le contact passe par Tally.so en externe)
- Pas d'authentification sur le site public
- HTTPS imposé via Vercel
- `rel="noopener noreferrer"` sur les liens externes
- Les embeds YouTube utilisent `youtube-nocookie.com`
- `card.href` assaini : n'accepte que les chemins internes commençant par `/`
- En-têtes de sécurité configurés dans `vercel.json` : CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

---

## Valeurs restantes codées en dur

| Valeur | Emplacement | Risque | Action |
|--------|-------------|--------|--------|
| Coordonnées géo (43.4833, 2.3667) | index.astro | Faible | Accepter — change rarement |
| Horaires d'ouverture (Mar/Jeu/Sam) | index.astro | Moyen | Migrer vers le CMS si les horaires varient selon la saison |
| Fourchette de prix « 25€–90€ » | index.astro | Moyen | Migrer vers le CMS si la tarification change |
| Label par défaut de ContactCTA | ContactCTA.astro | Faible | Fallback uniquement — la page d'accueil surcharge via le CMS |
| Textes hardcodés divers | un-apres-midi-couture, blog, mes-creations | Faible | « Prochaines dates : », « Calendrier : », « Aucun article », « Image manquante », « ← Tous les articles » |

---

## Code mort / Candidats au nettoyage

| Élément | Statut |
| ------- | ------ |
| `ateliers-reguliers-compare.astro` | ✅ Supprimé (commit précédent) |
| Import `filterPublishedPosts` inutilisé dans `blog/index.astro` | ✅ Import utilisé correctement |
| Import `ContactCTA` inutilisé dans `mes-creations.astro` | ✅ Supprimé (remplacé par `IntroSection`) |

---

## Plan de correction par priorité

### Phase 1 — DRY et qualité de code ✅ FAIT (2026-04-08)

| # | Action | Statut |
| - | ------ | ------ |
| 1 | Classe CSS `.heading-font` + suppression de 33 inline styles | ✅ |
| 2 | Extraction `IntroSection.astro` (5 pages → composant) | ✅ |
| 3 | Extraction `CrossLinksSection.astro` (4 pages → composant) | ✅ |
| 4 | `getCrossLinks(excludeHref)` dans `nav.ts` | ✅ |
| 5 | `splitParagraphs()` / `splitLines()` dans `strings.ts` | ✅ |
| 6 | `filterPublishedPosts()` utilisé dans `index.astro` | ✅ |
| 7 | `buildBreadcrumbSchema()` dans `schema.ts` + migration `blog/[slug]` | ✅ |
| 8 | Suppression `ateliers-reguliers-compare.astro` | ✅ (commit précédent) |

### Phase 2 — Accessibilité ✅ FAIT (2026-04-08)

| # | Action | Statut |
| - | ------ | ------ |
| 1 | Lien « Aller au contenu » dans Header + `id="main-content"` dans BaseLayout | ✅ |
| 2 | Navigation footer avec `<nav>` + `<ul>/<li>` sémantique | ✅ |
| 3 | Hiérarchie de titres du footer (`h3` → `h2`) | ✅ |
| 4 | `aria-label` sur ServiceCard, DetailCard, BlogCard | ✅ |
| 5 | Hex hardcodé `#faf9f5` → `var(--color-bg-accent)` dans Footer | ✅ |

### Phase 3 — Validation et robustesse ✅ FAIT (2026-04-08)

| # | Action | Statut |
| - | ------ | ------ |
| 1 | Validation regex prix dans Keystatic (`/^\d+(\.\d{1,2})?$/`) | ✅ |
| 2 | `validation: { min: 0 }` sur le champ order des créations | ✅ |
| 3 | Filtre `isValidFaqItem()` dans `buildServicePageSchemas()` | ✅ |
| 4 | Harmoniser la gestion des images nulles | ⚠️ Reste — priorité basse |

### Phase 4 — Contenu (en attente)

1. **Étoffer la galerie de créations** — 3 éléments, c'est trop peu ; ajouter 10-15 créations
2. **Mettre à jour le contenu obsolète de la page d'accueil** — la section actualités doit être rafraîchie

---

## Tableau récapitulatif des notes

| Domaine | Avant | Après | Détail |
| ------- | ----- | ----- | ------ |
| Architecture CMS | 10/10 | 10/10 | ✓ Stable — validations prix/order ajoutées |
| Architecture des composants | 7/10 | 9/10 | ✅ IntroSection, CrossLinksSection extraits, Hero harmonisé (ImageMetadata) |
| DRY — Pages | 6/10 | 9/10 | ✅ getPageContext, getCrossLinks, splitParagraphs/Lines, filterPublishedPosts |
| SEO et schémas | 8/10 | 9/10 | ✅ buildBreadcrumbSchema, buildPageSchemas partout, isValidFaqItem |
| Pipeline d'images | 9/10 | 10/10 | ✅ Props harmonisés (ImageMetadata partout), dev warning sur null |
| Styles et design | 8/10 | 9/10 | ✅ 33 inline styles supprimés, .heading-font, hover fix. Reste : container widths |
| Accessibilité | 6/10 | 8/10 | ✅ Skip-to-content, footer `<nav>/<ul>`, aria-labels, h2 hierarchy |
| Routage et déploiement | 9/10 | 9/10 | ✓ Stable |
| Tests et CI | 7/10 | 7/10 | ✓ Acceptable pour la taille du projet |
| Sécurité | 9/10 | 9/10 | ✓ Stable |
| **Moyenne globale** | **7.9/10** | **8.9/10** | **+1.0 point** |

---

## Verdict

**Mise à jour 2026-04-08 :** Les phases 1 (DRY), 2 (accessibilité) et 3 (validation) sont terminées. La moyenne passe de **7.9 à 8.9/10** (+1.0 point). Les principaux changements :

- **33 inline styles `font-family`** supprimés — les headings héritent de `global.css`, les non-headings utilisent `.heading-font`
- **2 nouveaux composants** (`IntroSection`, `CrossLinksSection`) remplacent du code dupliqué dans 6 pages
- **3 utilitaires** ajoutés (`splitParagraphs`, `splitLines`, `getCrossLinks`) + `buildBreadcrumbSchema` dans schema.ts
- **Accessibilité** améliorée : skip-to-content, footer `<nav>/<ul>/<li>`, aria-labels sur les cartes, hiérarchie h2/h3 corrigée
- **Validation Keystatic** renforcée : regex prix, min order, filtrage FAQ vides

Axes restants : harmonisation des fallbacks image null (priorité basse), galerie de créations à étoffer (contenu).
