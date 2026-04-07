# Revue d'architecture — couture-tarn.fr

**Date :** 7 avril 2026
**Stack :** Astro 6 + Keystatic 5 + Tailwind CSS 4 + Vercel

---

## Résumé exécutif

Site marketing piloté par CMS avec 15 pages indexées (8 statiques + 7 articles de blog). L'architecture est solide pour un site vitrine avec un seul éditeur de contenu. Keystatic fournit un workflow CMS fichier avec stockage GitHub en production.

**Points forts :** Zéro contenu codé en dur dans les pages — tout passe par le CMS. Schéma SEO complet sur chaque page. Utilitaires partagés (images, navigation, schémas). CI en place. En-têtes de sécurité configurés.

**Points à corriger :** Violations DRY significatives dans les pages (sections intro, cross-links, résolution d'images dupliquées dans 5-8 pages). Styles inline `font-family` répétés 13 fois au lieu d'une classe CSS. Schémas JSON-LD construits manuellement dans les pages blog au lieu d'utiliser les utilitaires existants. Problèmes d'accessibilité dans le footer et les composants carte.

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

**Axes d'amélioration :**

- Le champ `price` dans `schemaOffersField()` est un `fields.text` sans validation regex — une saisie comme `"abc"` passe Keystatic et devient `0` dans le schéma via `parseFloat()`. Ajouter une validation `pattern: /^\d+(\.\d{1,2})?$/`
- Le champ `order` des créations accepte les nombres négatifs — ajouter `validation: { min: 0 }`

---

### 2. Architecture des composants — Note : 7/10

**Ce qui fonctionne bien :**

- Responsabilité unique claire : chaque composant remplit une seule fonction
- `Hero` bascule élégamment en mode texte seul lorsqu'il n'y a pas d'image de couverture
- `FaqSection` encapsule le rendu FAQ + fond accent + CTA optionnel
- `DetailCard` unifie les cartes stages et ateliers (anciennement StageCard + AtelierCard)
- Utilitaire partagé `resolveImage()` / `resolveImageUrl()` centralise la résolution d'images

**Violations DRY — Composants :**

| Problème | Occurrences | Fichiers concernés |
|----------|-------------|-------------------|
| `style="font-family: var(--font-heading);"` en inline | 13+ fois | Header, Footer, Hero, ValueProposition, AnimatriceSection, ServiceCard, DetailCard, BlogCard, FaqSection |
| Classes shadow identiques (`var(--shadow-ring), var(--shadow-whisper)`) | 7 fois | ServiceCard, DetailCard, BlogCard, ValueProposition |
| Pattern heading identique `text-2xl md:text-3xl font-bold text-[var(--color-heading)]` | 8+ fois | Toutes les pages et composants section |
| Pattern container `max-w-3xl mx-auto px-4 text-center` | 5+ fois | Toutes les pages |

**Action recommandée :** Créer des classes CSS utilitaires dans `global.css` :

```css
.heading-font { font-family: var(--font-heading); }
.section-heading { /* text-2xl md:text-3xl font-bold color heading + heading font */ }
```

**Incohérence des props image :**

- `ServiceCard` reçoit `resolvedImage: ImageMetadata` (pré-résolu)
- `AnimatriceSection` reçoit `image?: ImageMetadata` (pré-résolu)
- `Hero` reçoit `coverImage?: string` (nom de fichier, résolution interne)

Il faudrait harmoniser : soit toujours pré-résoudre, soit toujours passer le chemin.

---

### 3. Violations DRY — Pages — Note : 6/10

C'est le domaine le plus critique. Les 10 pages contiennent des blocs de code quasi-identiques qui devraient être extraits en composants ou utilitaires.

#### 3a. Section introduction dupliquée (5 pages)

**Fichiers :** ateliers-reguliers, stages-thematiques, un-apres-midi-couture, la-couturiere, mes-creations

Structure HTML identique :

```astro
{page.introduction && (
  <section class="py-16 md:py-20">
    <div class="max-w-3xl mx-auto px-4 text-center">
      <p class="...">{page.introduction}</p>
      <ContactCTA label={page.ctaLabel || undefined} />
    </div>
  </section>
)}
```

**Action :** Extraire un composant `IntroSection.astro` avec props `text` + `ctaLabel`.

#### 3b. Section cross-links dupliquée (4 pages)

**Fichiers :** ateliers-reguliers, stages-thematiques, la-couturiere, mes-creations

Structure HTML quasi-identique : texte + liste de liens filtrés depuis `SERVICE_LINKS`.

**Action :** Extraire un composant `CrossLinksSection.astro` avec props `text` + `excludeHref`.

#### 3c. Résolution OG image dupliquée (8 pages)

**Toutes les pages** répètent :

```typescript
const coverGlob = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/covers/**/*.{jpg,jpeg,png,webp}'
);
const ogImage = await resolveImageUrl(page.coverImage, coverGlob, Astro.site);
```

**Note :** `import.meta.glob` est évalué à la compilation — impossible de l'extraire dans un utilitaire. Pattern accepté mais à documenter comme convention.

#### 3d. Lecture settings + siteUrl dupliquée (7 pages)

```typescript
const settings = await reader.singletons.siteSettings.read();
const siteUrl = Astro.site?.origin ?? '';
```

**Action :** Créer un utilitaire `getPageContext()` retournant `{ settings, siteUrl }`.

#### 3e. Filtrage cross-links dupliqué (5 pages)

```typescript
const crossLinks = SERVICE_LINKS.filter((l) => l.href !== '/ateliers-reguliers');
```

**Action :** Ajouter `getCrossLinks(excludeHref: string)` dans `src/utils/nav.ts`.

#### 3f. Logique de découpage de texte dupliquée (5 pages + 1 composant)

Trois variantes du même pattern :

- `text.split('\n\n').map(para => ...)` — découpage en paragraphes
- `dates.split('\n').map(line => ...)` — découpage en lignes
- `text.split(/\n\s*\n/).map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean)` — variante AnimatriceSection

**Action :** Ajouter `splitParagraphs()` et `splitLines()` dans `src/utils/strings.ts`.

#### 3g. Filtrage des articles de blog dupliqué (2 pages)

- `index.astro` (lignes 50-56) : filtre et trie manuellement les posts par date
- `blog/index.astro` : logique similaire inline

L'utilitaire `filterPublishedPosts()` existe dans `src/utils/blog.ts` mais n'est pas utilisé partout.

**Action :** Utiliser `filterPublishedPosts()` dans `index.astro` et `blog/index.astro`.

#### 3h. Import inutilisé

- `blog/index.astro` importe `filterPublishedPosts` mais ne l'utilise pas — le filtrage est fait inline.

---

### 4. Architecture SEO et schémas — Note : 8/10

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

**Schémas construits manuellement au lieu d'utiliser les utilitaires :**

| Page | Lignes | Utilitaire disponible |
|------|--------|----------------------|
| `blog/index.astro` | 26-49 | `buildPageSchemas()` |
| `blog/[slug].astro` | 40-68 | `buildPageSchemas()` (pour BreadcrumbList + WebPage de base) |
| `ContentPage.astro` | 33-58 | `buildPageSchemas()` |
| `index.astro` | 66-130 | Personnalisé (LocalBusiness) — justifié |

**Action :** Migrer blog/index, blog/[slug] et ContentPage vers `buildPageSchemas()`.

**Validation FAQ manquante :**

- `schema.ts` ne vérifie pas que `question` et `answer` sont non-vides. Un item FAQ vide dans Keystatic génère un schéma FAQPage invalide.
- **Action :** Ajouter un filtre `isValidFaqItem()` avant la génération du schéma.

**Axes d'amélioration restants :**

- Les horaires d'ouverture, les coordonnées géographiques et la fourchette de prix restent codés en dur sur la page d'accueil — priorité faible car rarement modifiés

---

### 5. Pipeline d'images — Note : 9/10

**Ce qui fonctionne bien :**

- Toutes les images utilisent le composant `<Image>` d'Astro avec conversion webp
- Paramètres de qualité cohérents : 60 pour les couvertures, 80 pour le contenu
- Largeurs responsives : `[640, 1024, 1440]` pleine largeur, `[320, 480, 640]` grilles
- Utilitaires partagés `resolveImage()` / `resolveImageUrl()`
- Images de couverture organisées par slug de page dans `src/assets/images/covers/{slug}/`
- Noms de fichiers descriptifs (ex : `atelier-couture-hero.jpg`)

**Axes d'amélioration :**

- `resolveImage()` retourne `null` silencieusement. Certaines pages (mes-creations) gèrent le fallback, d'autres non — incohérence.

---

### 6. Styles et système de design — Note : 8/10

**Ce qui fonctionne bien :**

- Les propriétés CSS personnalisées dans le bloc `@theme` fournissent une source de vérité unique
- Système à deux polices (Playfair Display + Manrope) cohérent et auto-hébergé
- Les styles prose gèrent toute la sortie Markdoc avec une hiérarchie correcte
- Le débordement d'image sur desktop (`margin-left: -3rem`) est élégant
- Jetons CSS nettoyés — aucun token inutilisé
- Menu hamburger mobile avec animation de glissement (`max-height` transition)

**Problèmes identifiés :**

| Problème | Impact |
|----------|--------|
| 13+ instances de `style="font-family: var(--font-heading);"` inline | Maintenabilité — devrait être une classe CSS |
| `Footer.astro` ligne 14 : `color: #faf9f5` en dur au lieu d'une variable CSS | Incohérence avec le système de design |
| Largeurs de conteneur incohérentes (`max-w-3xl`, `max-w-4xl`, `max-w-5xl`) sans convention documentée | Confusion potentielle |
| `.service-card:hover` applique le même shadow que `.service-card` par défaut | Style CSS inutile |

---

### 7. Accessibilité — Note : 6/10

**Ce qui fonctionne bien :**

- `YouTubeEmbed` a un `aria-label` ✓
- Hamburger menu met à jour `aria-expanded` correctement ✓
- Balise `<time>` avec attribut `datetime` dans `BlogCard` ✓
- `<footer>` sémantique ✓

**Problèmes identifiés :**

| Problème | Sévérité | Fichier(s) |
|----------|----------|------------|
| **Pas de lien « Aller au contenu »** (skip-to-content) | Haute | Header.astro |
| Liens navigation du footer dans `<div>` sans `<ul>/<li>` sémantique | Moyenne | Footer.astro (lignes 49-56) |
| Cartes entièrement enveloppées dans `<a>` (contenu bloc dans inline) | Moyenne | ServiceCard, DetailCard, BlogCard |
| Pas d'`aria-label` sur les liens des cartes | Moyenne | ServiceCard, DetailCard, BlogCard |
| En-têtes footer en `<h3>` — devrait être `<h2>` pour la hiérarchie de titres | Basse | Footer.astro (lignes 14, 48) |

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

| Élément | Emplacement | Action |
|---------|-------------|--------|
| `ateliers-reguliers-compare.astro` | src/pages/ | Supprimer — page prototype avec plus de 300 lignes de données codées en dur, noIndex |
| Import `filterPublishedPosts` inutilisé | blog/index.astro | Supprimer l'import ou l'utiliser |

---

## Plan de correction par priorité

### Phase 1 — DRY et qualité de code (effort : ~2h)

| # | Action | Fichiers impactés | Effort |
|---|--------|-------------------|--------|
| 1 | Créer classe CSS `.heading-font` et remplacer les 13+ inline styles | global.css + 9 composants | 20 min |
| 2 | Extraire `IntroSection.astro` (texte intro + CTA) | 5 pages → nouveau composant | 20 min |
| 3 | Extraire `CrossLinksSection.astro` (texte + liens filtrés) | 4 pages → nouveau composant | 20 min |
| 4 | Ajouter `getCrossLinks(excludeHref)` dans `nav.ts` | 5 pages + nav.ts | 10 min |
| 5 | Ajouter `splitParagraphs()` / `splitLines()` dans `strings.ts` | 5 pages + 1 composant + strings.ts | 15 min |
| 6 | Utiliser `filterPublishedPosts()` dans index.astro et blog/index.astro | 2 pages + blog.ts | 10 min |
| 7 | Migrer blog/index et blog/[slug] vers `buildPageSchemas()` | 2 pages + schema.ts (si besoin) | 20 min |
| 8 | Supprimer `ateliers-reguliers-compare.astro` | 1 page | 2 min |

### Phase 2 — Accessibilité (effort : ~1h)

| # | Action | Fichiers impactés | Effort |
|---|--------|-------------------|--------|
| 1 | Ajouter lien « Aller au contenu » dans Header | Header.astro + global.css | 15 min |
| 2 | Restructurer la navigation footer avec `<ul>/<li>` | Footer.astro | 10 min |
| 3 | Corriger la hiérarchie de titres du footer (`h3` → `h2`) | Footer.astro | 5 min |
| 4 | Ajouter `aria-label` aux liens des cartes | ServiceCard, DetailCard, BlogCard | 15 min |
| 5 | Corriger le hex hardcodé dans Footer (`#faf9f5` → variable CSS) | Footer.astro | 5 min |

### Phase 3 — Validation et robustesse (effort : ~30 min)

| # | Action | Fichiers impactés | Effort |
|---|--------|-------------------|--------|
| 1 | Ajouter validation regex sur le champ prix dans Keystatic | keystatic.config.ts | 5 min |
| 2 | Ajouter `validation: { min: 0 }` sur le champ order des créations | keystatic.config.ts | 2 min |
| 3 | Ajouter filtre `isValidFaqItem()` dans schema.ts | schema.ts | 10 min |
| 4 | Harmoniser la gestion des images nulles (fallback cohérent) | Pages avec images | 15 min |

### Phase 4 — Contenu (en cours)

1. **Étoffer la galerie de créations** — 3 éléments, c'est trop peu ; ajouter 10-15 créations
2. **Mettre à jour le contenu obsolète de la page d'accueil** — la section actualités doit être rafraîchie

---

## Tableau récapitulatif des notes

| Domaine | Note | Tendance |
|---------|------|----------|
| Architecture CMS | 10/10 | ✓ Stable |
| Architecture des composants | 7/10 | ↗ Après extraction des composants partagés |
| DRY — Pages | 6/10 | ↗ Après Phase 1 |
| SEO et schémas | 8/10 | ↗ Après migration vers utilitaires |
| Pipeline d'images | 9/10 | ✓ Stable |
| Styles et design | 8/10 | ↗ Après classe CSS heading-font |
| Accessibilité | 6/10 | ↗ Après Phase 2 |
| Routage et déploiement | 9/10 | ✓ Stable |
| Tests et CI | 7/10 | ✓ Acceptable pour la taille du projet |
| Sécurité | 9/10 | ✓ Stable |
| **Moyenne globale** | **7.9/10** | |

---

## Verdict

L'architecture est **fonctionnelle et bien conçue dans ses fondations** (CMS, SEO, images, sécurité). Le point faible principal est la **duplication de code entre les pages** : sections intro, cross-links, résolution d'images, et construction de schémas sont copiées-collées au lieu d'être factorisées en composants partagés. Les **13+ styles inline** `font-family` et les **problèmes d'accessibilité** (pas de skip-to-content, navigation footer non sémantique) sont les autres axes prioritaires.

Les corrections de Phase 1 (~2h) et Phase 2 (~1h) suffiraient à passer de 7.9 à ~9/10 en moyenne. Aucune refonte architecturale n'est nécessaire — il s'agit d'extraction et de factorisation de patterns existants.
