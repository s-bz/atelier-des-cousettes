# Revue d'architecture — couture-tarn.fr

**Date :** 7 avril 2026
**Stack :** Astro 6 + Keystatic 5 + Tailwind CSS 4 + Vercel

---

## Résumé exécutif

Site marketing piloté par CMS avec 15 pages indexées (8 statiques + 7 articles de blog). L'architecture est solide pour un site vitrine avec un seul éditeur de contenu. Keystatic fournit un workflow CMS fichier avec stockage GitHub en production.

**Points forts :** Zéro contenu codé en dur dans les pages — tout passe par le CMS. Schéma SEO complet sur chaque page. Utilitaires partagés (images, navigation). CI en place. En-têtes de sécurité configurés.

**Points restants :** Deux composants/pages inutilisés (`PricingCard`, page de comparaison). Contenu à étoffer (galerie, blog, actualités).

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
  │ BaseLayout │    │ 10 routes   │    │ 7 Astro     │
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
| Layouts | 2 | BaseLayout, ContentPage |
| Composants | 6 | Header, Footer, Hero, BlogCard, ContactCTA, YouTubeEmbed |
| Utilitaires | 3 | reader.ts, images.ts, navLinks.ts |
| Styles | 1 | global.css |
| Contenu (CMS) | 25 | 9 singletons, 13 articles de blog, 3 créations |
| Ressources publiques | 9 | favicon, icônes, manifest, robots.txt, llms.txt, og-default.jpg |
| Configuration | 6 | astro.config, keystatic.config, tsconfig, vercel.json, .npmrc, package.json |
| Scripts | 1 | patch-keystatic.mjs |
| **Total source** | **22** | |

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

### 2. Architecture des composants — Note : 9/10

**Ce qui fonctionne bien :**

- Responsabilité unique claire : chaque composant remplit une seule fonction
- `ContentPage` est un wrapper intelligent qui gère Hero + BreadcrumbList + schéma WebPage + prose + CTA — utilisé par 5 pages
- `Hero` bascule élégamment en mode texte seul lorsqu'il n'y a pas d'image de couverture
- `BlogCard` est propre avec un formatage de date en locale française
- Utilitaire partagé `resolveImage()` / `resolveImageUrl()` qui centralise la résolution d'images
- Aucun composant mort — le code inutilisé (`PricingCard`) a été supprimé

**Axes d'amélioration :**

- `ateliers-reguliers-compare.astro` contient plus de 300 lignes de données codées en dur — page prototype, candidate à la suppression

### 3. Architecture SEO et schémas — Note : 9/10

**Ce qui fonctionne bien :**
- Chaque page dispose d'un schéma `BreadcrumbList`
- Schémas spécifiques par page : `LocalBusiness` + `WebSite` (accueil), `Service` + offres (pages services), `Article` (blog), `ImageGallery` (créations), `CollectionPage` (listing blog)
- URL canonique sur chaque page
- Open Graph + Twitter Cards sur chaque page
- `robots.txt` autorise explicitement les robots IA
- `llms.txt` fournit un résumé métier lisible par les machines
- Sitemap généré automatiquement
- `hasOfferCatalog` dérive les noms de services des singletons CMS au moment du build

**Axes d'amélioration :**

- Les horaires d'ouverture, les coordonnées géographiques et la fourchette de prix restent codés en dur sur la page d'accueil — priorité faible car rarement modifiés

### 4. Pipeline d'images — Note : 9/10

**Ce qui fonctionne bien :**
- Toutes les images utilisent le composant `<Image>` d'Astro avec conversion webp
- Paramètres de qualité cohérents : 60 pour les couvertures, 80 pour le contenu
- Largeurs responsives : `[640, 1024, 1440]` pleine largeur, `[320, 480, 640]` grilles
- Utilitaires partagés `resolveImage()` / `resolveImageUrl()`
- Images de couverture organisées par slug de page dans `src/assets/images/covers/{slug}/`
- Noms de fichiers descriptifs (ex : `atelier-couture-hero.jpg`)

**Axes d'amélioration :**

- Le répertoire d'image de couverture `mentions-legales` existe mais pourrait être vide — il faudrait un fallback ou une gestion explicite

### 5. Styles et système de design — Note : 9/10

**Ce qui fonctionne bien :**
- Les propriétés CSS personnalisées dans le bloc `@theme` fournissent une source de vérité unique
- Système à deux polices (Playfair Display + Manrope) cohérent et auto-hébergé
- Les styles prose gèrent toute la sortie Markdoc avec une hiérarchie correcte
- Le débordement d'image sur desktop (`margin-left: -3rem`) est élégant
- Jetons CSS nettoyés — aucun token inutilisé
- Menu hamburger mobile avec animation de glissement (`max-height` transition)

### 6. Routage et déploiement — Note : 9/10

**Ce qui fonctionne bien :**
- Routage basé sur les fichiers, clair et simple
- Redirections 301 correctes pour les anciennes URLs / URLs mal orthographiées dans `vercel.json`
- En-têtes de cache immutables pour les images
- Redirection sitemap de `/sitemap.xml` vers `/sitemap-index.xml`
- `getStaticPaths()` génère correctement les slugs de blog

**Note :** `trailingSlash: 'always'` a été testé mais provoquait des 404 avec l'adaptateur Vercel — le comportement par défaut d'Astro fonctionne correctement.

### 7. Tests et CI — Note : 7/10

**Ce qui fonctionne bien :**

- Pipeline CI en place : GitHub Actions (`.github/workflows/ci.yml`) exécutant `pnpm check` + `pnpm build` sur push/PR vers main
- Le build lui-même constitue le meilleur test d'intégration pour un site de cette taille

**Axes d'amélioration :**

- Aucun test unitaire ou E2E — acceptable pour un site marketing de 15 pages, mais à reconsidérer si le site grandit

### 8. Sécurité — Note : 9/10

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

---

## Code mort / Candidats au nettoyage

| Élément | Emplacement | Action |
|---------|-------------|--------|
| `ateliers-reguliers-compare.astro` | src/pages/ | Supprimer — page prototype avec plus de 300 lignes de données codées en dur, noIndex |

---

## Prochaines étapes recommandées (par ordre de priorité)

### Phase 1 — Contenu (en cours)

1. **Étoffer le blog** — 13 articles publiés (objectif 12-15 atteint) ; continuer à publier régulièrement
2. **Étoffer la galerie de créations** — 3 éléments, c'est trop peu ; ajouter 10-15 créations
3. **Mettre à jour le contenu obsolète de la page d'accueil** — la section actualités « Octobre 2025 » doit être rafraîchie

### Phase 2 — Nettoyage optionnel (au besoin)

1. **Supprimer le code mort** — `ateliers-reguliers-compare.astro`, `test-reader.mjs`
2. **Migrer les horaires d'ouverture + la fourchette de prix vers le CMS** — utile si ces données changent selon la saison

---

## Verdict

**L'architecture est solide et prête pour la production.** Tout le contenu est géré via Keystatic, le SEO est complet (schémas, meta tags, robots.txt, llms.txt, sitemap), et le code est propre avec des utilitaires partagés. Le pipeline CI valide chaque push, les en-têtes de sécurité sont en place, et l'auteur/éditeur sont configurables depuis le CMS. Les seuls axes d'amélioration restants sont l'enrichissement du contenu (galerie, blog, actualités) et le nettoyage optionnel de deux fichiers inutilisés. Aucune refonte architecturale n'est nécessaire.
