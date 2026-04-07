# Plan d'action SEO — couture-tarn.fr

**Date :** 7 avril 2026
**Score initial :** 85/100 → **Score estimé après corrections : 95/100**

---

## Critique — Corriger immédiatement

### 1. ~~Supprimer la page `ateliers-reguliers-compare`~~ ✅ FAIT

- **Fichier :** `src/pages/ateliers-reguliers-compare.astro`
- **Résultat :** Fichier supprimé via `git rm`. Page retirée du sitemap.

### 2. ~~Ajouter `lastmod` au sitemap~~ ✅ FAIT

- **Fichier :** `astro.config.mjs`
- **Résultat :** Hook `serialize` ajouté dans la config `@astrojs/sitemap`. Toutes les 15 URLs ont maintenant un `lastmod`.

---

## Haute priorité — Corriger sous 1 semaine

### 3. ~~Corriger `og:type` pour les articles de blog~~ ✅ FAIT

- **Fichier :** `src/layouts/BaseLayout.astro` + `src/pages/blog/[slug].astro`
- **Résultat :** Props `ogType`, `articlePublishedTime`, `articleAuthor` ajoutés au BaseLayout. Blog articles passent `og:type: article` + `article:published_time` + `article:author`. `og:site_name` ajouté pour toutes les pages.

### 4. ~~Ajouter `Permissions-Policy` header + supprimer `unsafe-eval`~~ ✅ FAIT

- **Fichier :** `vercel.json`
- **Résultat :** Header `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` ajouté. `unsafe-eval` supprimé du CSP (`unsafe-inline` conservé car nécessaire pour les scripts inline Astro).

### 5. ~~Enrichir `llms.txt` avec les articles de blog~~ ✅ FAIT

- **Fichier :** `public/llms.txt`
- **Résultat :** Section `## Articles du blog` ajoutée avec les 13 articles (titre + URL + description courte).

---

## Priorité moyenne — Corriger sous 1 mois

### 6. ~~Améliorer le titre de la page d'accueil~~ ✅ FAIT

- **Fichier :** `src/content/pages/homepage/index.yaml`
- **Résultat :** Sous-titre modifié en « Cours de couture à Revel et Verdalle (Tarn) » — inclut les mots-clés géolocalisés. Le titre H1 reste « L'Atelier des Cousettes » pour le branding, le sous-titre apporte les mots-clés.

### 7. Ajouter des images dans le corps des articles de blog — EN ATTENTE (contenu éditorial)

- **Fichier :** Articles Markdoc dans `src/content/blog/`
- **Problème :** Certains articles (ex. « Débuter la couture ») n'ont aucune image dans le contenu
- **Action :** Ajouter 2-3 images pertinentes par article (photos d'atelier, illustrations de techniques, matériel)
- **Impact :** Meilleur engagement, meilleur SEO images, meilleur temps sur page

### 8. ~~Ajouter des liens entre articles de blog (articles connexes)~~ ✅ FAIT

- **Fichier :** `src/pages/blog/[slug].astro`
- **Résultat :** Section « Articles connexes » ajoutée avec grille de 3 articles (les plus récents, hors article courant). Cards avec titre + description.

### 9. ~~Tracker la vraie date de modification des articles~~ ✅ FAIT

- **Fichier :** `keystatic.config.ts` + `src/pages/blog/[slug].astro`
- **Résultat :** Champ optionnel `lastModified` ajouté au schema blog dans Keystatic. Le schema JSON-LD Article utilise `lastModified || publishDate` pour `dateModified`.

### 10. ~~Renforcer le CSP en supprimant `unsafe-eval`~~ ✅ FAIT

- **Fichier :** `vercel.json`
- **Résultat :** `unsafe-eval` supprimé du `script-src`. Build validé avec succès — le site n'en avait pas besoin en production.

---

## Priorité basse — Backlog

### 11. ~~Précharger les polices critiques~~ ✅ FAIT

- **Fichier :** `src/layouts/BaseLayout.astro`
- **Résultat :** `<link rel="preload">` ajouté pour `playfair-display-latin-wght-normal.woff2` et `manrope-latin-wght-normal.woff2`.

### 12. ~~Ajouter un `llms-full.txt` avec le contenu détaillé~~ ✅ FAIT

- **Fichier :** `public/llms-full.txt`
- **Résultat :** Fichier de 186 lignes créé avec description complète de l'activité, tous les services détaillés (créneaux, stages, tarifs), biographie d'Isabelle, les 13 articles de blog, et informations de contact.

### 13. ~~Ajouter `speakable` schema sur les FAQ~~ ✅ FAIT

- **Fichier :** `src/utils/schema.ts`
- **Résultat :** `SpeakableSpecification` avec `cssSelector` ajouté au schema FAQPage.

### 14. ~~Ajouter des thumbnails au schema `ImageGallery`~~ ✅ FAIT

- **Fichier :** `src/pages/mes-creations.astro`
- **Résultat :** `thumbnailUrl` ajouté à chaque `ImageObject` dans le schema.

### 15. ~~Créer plus de contenu blog (objectif : 15-20 articles)~~ ✅ FAIT

- **Résultat :** 5 nouveaux articles créés (18 articles au total, objectif 15-20 atteint) :
  - « Les différentes coutures de base en couture » (2026-05-26)
  - « Couture pour enfants : 8 projets faciles et ludiques » (2026-06-02)
  - « Idées cadeaux couture faits main : 10 créations qui font plaisir » (2026-06-09)
  - « Couture zéro déchet : 7 projets pratiques pour le quotidien » (2026-06-16)
  - « Retouches simples : ourlet, bouton, fermeture éclair » (2026-06-23)
- **Chaque article :** 1500-2000 mots, liens internes vers les pages de service et autres articles, rédigés en français avec diacritiques.

---

## Correctifs additionnels (découverts pendant l'audit)

### A. ~~Supprimer `dateModified: new Date()` dans ContentPage.astro~~ ✅ FAIT

- **Fichier :** `src/components/ContentPage.astro`
- **Problème :** Le schema WebPage reportait la date de build comme date de modification — violait les consignes du CLAUDE.md.
- **Résultat :** Ligne supprimée. Le champ `dateModified` n'est plus émis (préférable à une date fausse).

### B. ~~Blog listing : utiliser `buildPageSchemas()` + ajouter `mainEntity`~~ ✅ FAIT

- **Fichier :** `src/pages/blog/index.astro`
- **Problème :** Le schema était construit inline (incohérent avec les autres pages). Manquait `WebPage` et `mainEntity`.
- **Résultat :** Utilise maintenant `buildPageSchemas()` + `CollectionPage` avec `mainEntity` listant tous les `BlogPosting`.

### C. ~~Passer `altText` au Hero sur 2 pages de service~~ ✅ FAIT

- **Fichiers :** `src/pages/ateliers-reguliers.astro`, `src/pages/stages-thematiques.astro`
- **Problème :** Le `coverImageAlt` défini dans Keystatic n'était pas passé au composant Hero — texte alt générique utilisé à la place.
- **Résultat :** Prop `altText={page.coverImageAlt}` ajouté aux deux pages.

### D. ~~Enrichir le schema Person sur la page couturière~~ ✅ FAIT

- **Fichier :** `src/pages/la-couturiere.astro`
- **Problème :** Le schema `Person` manquait les propriétés `description` et `image`.
- **Résultat :** `description` (via `seoDescription`) et `image` (via `ogImage`) ajoutés au schema Person.

---

## Récapitulatif par priorité

| # | Action | Priorité | Statut |
| --- | -------- | ---------- | -------- |
| 1 | Supprimer page compare | Critique | ✅ Fait |
| 2 | Ajouter `lastmod` au sitemap | Critique | ✅ Fait |
| 3 | Corriger `og:type` articles | Haute | ✅ Fait |
| 4 | Ajouter `Permissions-Policy` + supprimer `unsafe-eval` | Haute | ✅ Fait |
| 5 | Enrichir `llms.txt` | Haute | ✅ Fait |
| 6 | Améliorer titre accueil | Moyenne | ✅ Fait |
| 7 | Images dans articles blog | Moyenne | ⏳ Contenu éditorial |
| 8 | Articles connexes blog | Moyenne | ✅ Fait |
| 9 | Date modification articles | Moyenne | ✅ Fait |
| 10 | Renforcer CSP | Moyenne | ✅ Fait |
| 11 | Précharger polices | Basse | ✅ Fait |
| 12 | `llms-full.txt` | Basse | ✅ Fait |
| 13 | Schema `speakable` | Basse | ✅ Fait |
| 14 | Thumbnails `ImageGallery` | Basse | ✅ Fait |
| 15 | Plus de contenu blog (18 articles) | Basse | ✅ Fait |
| A | Fix `dateModified` ContentPage | Haute | ✅ Fait |
| B | Blog listing schema cohérent | Moyenne | ✅ Fait |
| C | Hero altText manquant (2 pages) | Moyenne | ✅ Fait |
| D | Person schema + image/description | Basse | ✅ Fait |

**Total : 18/19 actions complétées. 1 en attente (images dans le corps des articles — nécessite des photos).**
