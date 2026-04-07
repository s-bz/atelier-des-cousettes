# Audit SEO complet — couture-tarn.fr

**Date :** 7 avril 2026
**Site :** https://couture-tarn.fr
**Type d'activité :** Commerce local / Services — Cours de couture (Tarn, France)
**Pages indexées :** 16 (dont 1 page de comparaison noIndex à supprimer)
**Framework :** Astro 6 + Keystatic CMS, déployé sur Vercel

---

## Score global de santé SEO : 84/100

| Catégorie | Poids | Score | Pondéré |
|-----------|-------|-------|---------|
| SEO technique | 25% | 88/100 | 22,0 |
| Qualité du contenu | 25% | 80/100 | 20,0 |
| SEO on-page | 20% | 82/100 | 16,4 |
| Schema / Données structurées | 10% | 92/100 | 9,2 |
| Performance (Core Web Vitals) | 10% | 88/100 | 8,8 |
| Images | 5% | 90/100 | 4,5 |
| Préparation IA (AI Search) | 5% | 82/100 | 4,1 |
| **Total** | **100%** | | **85/100** |

---

## Résumé exécutif

### Top 5 des problèmes critiques

1. **Aucune date `lastmod` dans le sitemap** — Les moteurs de recherche ne savent pas quand les pages ont été mises à jour, ce qui ralentit la ré-indexation après les redesigns récents.
2. **`og:type` incorrect pour les articles de blog** — Toutes les pages utilisent `og:type: website` au lieu de `og:type: article` pour les articles, ce qui dégrade le partage social et les rich previews.
3. **Pas de balise `article:published_time`** pour les articles de blog — Les réseaux sociaux et les moteurs de recherche ne détectent pas la date de publication.
4. **Page `ateliers-reguliers-compare` dans le sitemap malgré `noIndex`** — Contradiction entre le sitemap (qui dit « indexez-moi ») et la balise robots (qui dit « n'indexez pas »).
5. **CSP utilise `unsafe-inline` et `unsafe-eval`** — Réduit la protection contre les attaques XSS, bien que le risque soit faible pour un site statique.

### Top 5 des gains rapides (quick wins)

1. Ajouter `lastmod` au sitemap via la configuration `@astrojs/sitemap`
2. Ajouter `og:type: article` + `article:published_time` dans `BaseLayout` pour les articles
3. Supprimer la page `ateliers-reguliers-compare` (confirmé par le propriétaire)
4. Ajouter `og:site_name` dans `BaseLayout`
5. Ajouter les liens vers les articles de blog dans `llms.txt`

---

## 1. SEO technique (88/100)

### Crawlabilité et indexabilité

| Élément | Statut | Détail |
|---------|--------|--------|
| `robots.txt` | ✅ Bon | Autorise tous les crawlers, inclut le sitemap |
| Crawlers IA | ✅ Excellent | GPTBot, ChatGPT-User, Claude-Web, Applebot-Extended, PerplexityBot autorisés |
| Sitemap XML | ⚠️ Partiel | 16 URLs listées, mais aucune date `lastmod` |
| Page `compare` dans sitemap | ❌ Problème | `ateliers-reguliers-compare` est dans le sitemap mais a `noIndex` |
| URL canoniques | ✅ Bon | Présentes sur toutes les pages |
| Redirections 301 | ✅ Bon | 7 redirections pour les anciennes URLs (accents manquants, `/cours-particuliers`, `/sitemap.xml`) |
| Balise `robots` | ✅ Bon | `index, follow` par défaut, `noindex, follow` pour mentions légales et compare |
| HTTP → HTTPS | ✅ Bon | Redirection automatique via Vercel |

### Sécurité

| En-tête | Statut | Valeur |
|---------|--------|--------|
| `Strict-Transport-Security` | ✅ | `max-age=63072000` (Vercel par défaut) |
| `X-Content-Type-Options` | ✅ | `nosniff` |
| `X-Frame-Options` | ✅ | `DENY` |
| `Referrer-Policy` | ✅ | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | ⚠️ | Présente mais utilise `unsafe-inline` + `unsafe-eval` |
| `Permissions-Policy` | ❌ | Absente — devrait restreindre caméra, micro, géolocalisation |

### Infrastructure

- **CDN :** Vercel Edge Network (cache HIT observé)
- **Protocole :** HTTP/2
- **Compression :** Activée (gzip/brotli via Vercel)
- **Cache statique :** Headers `Cache-Control: public, max-age=31536000, immutable` pour `/images/`
- **Fichiers Astro :** Les assets `/_astro/` bénéficient du cache immutable par défaut de Vercel (hash dans le nom de fichier)

---

## 2. Qualité du contenu (80/100)

### E-E-A-T (Expérience, Expertise, Autorité, Fiabilité)

| Signal | Statut | Détail |
|--------|--------|--------|
| Auteur identifié | ✅ | Isabelle Bultez, couturière diplômée CAP couture flou |
| Page « À propos » | ✅ | `/la-couturiere` avec biographie détaillée, credential (CAP), parcours |
| Schema `Person` | ✅ | Avec `hasCredential`, `knowsAbout`, `worksFor` |
| Coordonnées | ✅ | Adresse, téléphone, email, Facebook |
| Mentions légales | ✅ | `/mentions-legales` présente |

### Contenu par page

| Page | Contenu | Évaluation |
|------|---------|------------|
| Accueil | Riche — services, valeurs, animatrice, vidéo, blog | ✅ Excellent |
| Ateliers réguliers | Structuré — sections, FAQ, créneaux | ✅ Bon |
| Stages thématiques | Structuré — stages détaillés avec prix, FAQ | ✅ Bon |
| Un après-midi couture | Structuré — description, tarifs, FAQ | ✅ Bon |
| La couturière | Biographie en sections avec images | ✅ Bon |
| Mes créations | Galerie d'images avec lightbox | ✅ Bon |
| Blog (7 articles) | ~900-1100 mots par article | ⚠️ Correct, pourrait être plus long |
| Blog listing | Introduction + grille d'articles | ✅ Bon |

### Problèmes de contenu

- ⚠️ **Articles de blog sans images dans le corps** — L'article « Débuter la couture : 7 conseils » n'a aucune image dans le contenu (seulement le hero). Les images dans le corps améliorent l'engagement et le SEO.
- ⚠️ **Longueur des articles** — 900-1100 mots est correct mais en dessous de la moyenne concurrentielle pour les mots-clés visés (« débuter couture », « choisir machine à coudre »). Viser 1500-2000 mots pour les articles piliers.
- ⚠️ **Pas de contenu « fraîcheur »** — Aucune date `lastmod` n'est trackée, les articles réutilisent `publishDate` comme `dateModified`.

---

## 3. SEO on-page (82/100)

### Balises titre

| Page | Titre | Évaluation |
|------|-------|------------|
| Accueil | `L'Atelier des Cousettes` | ⚠️ Pas de mots-clés (« cours de couture Tarn ») |
| Services | `{Titre} \| L'Atelier des Cousettes` | ✅ Bon format |
| Blog articles | `{Titre} \| L'Atelier des Cousettes` | ✅ Bon format |

### Meta descriptions

- ✅ Présentes sur toutes les pages via Keystatic (`seoDescription`)
- ✅ Descriptions uniques et pertinentes
- ⚠️ Vérifier que toutes font entre 120-160 caractères (optimal pour les SERP)

### Hiérarchie des titres

- ✅ Un seul H1 par page
- ✅ H2 pour les sections principales
- ✅ H3 pour les sous-sections
- ✅ Bon usage de `font-family: var(--font-heading)` pour la cohérence visuelle

### Open Graph

| Balise | Statut |
|--------|--------|
| `og:type` | ⚠️ Toujours `website` — devrait être `article` pour les posts de blog |
| `og:url` | ✅ URL canonique |
| `og:title` | ✅ Titre complet avec suffixe site |
| `og:description` | ✅ Description SEO |
| `og:locale` | ✅ `fr_FR` |
| `og:image` | ✅ Avec dimensions 1200×630 |
| `og:site_name` | ❌ Absente |
| `article:published_time` | ❌ Absente sur les articles |
| `article:author` | ❌ Absente sur les articles |

### Twitter Cards

- ✅ `summary_large_image` sur toutes les pages
- ✅ Titre, description, image

### Liens internes

- ✅ Navigation principale vers toutes les pages de service + blog
- ✅ Cross-links entre pages de service
- ✅ Articles de blog lient vers les pages de service
- ✅ Footer avec liens principaux et mentions légales
- ⚠️ Pas de liens entre articles de blog (articles connexes)

---

## 4. Schema / Données structurées (92/100)

### Implémentation par page

| Page | Schemas | Statut |
|------|---------|--------|
| Accueil | `LocalBusiness` + `WebSite` | ✅ Excellent — geo, heures, offres, fondateur |
| Ateliers réguliers | `BreadcrumbList` + `WebPage` + `Service` + `FAQPage` | ✅ Excellent |
| Stages thématiques | `BreadcrumbList` + `WebPage` + `Service` + `FAQPage` | ✅ Excellent |
| Un après-midi couture | `BreadcrumbList` + `WebPage` + `Service` + `FAQPage` | ✅ Excellent |
| La couturière | `BreadcrumbList` + `WebPage` + `Person` | ✅ Excellent |
| Mes créations | `BreadcrumbList` + `WebPage` + `ImageGallery` | ✅ Bon |
| Blog listing | `BreadcrumbList` + `CollectionPage` | ✅ Bon |
| Blog articles | `BreadcrumbList` + `Article` | ✅ Bon |

### Points forts

- `LocalBusiness` très complet (coordonnées, geo, heures d'ouverture, gamme de prix, catalogue d'offres)
- `Person` avec `hasCredential` pour le CAP couture flou
- `FAQPage` sur les pages de service (visibilité rich snippets)
- `Service` avec `Offer` et prix en EUR

### Points d'amélioration

- ⚠️ `dateModified` sur les articles = `publishDate` — pas de vraie date de modification
- ⚠️ Pas d'`image` dans le schema `Article` si pas de cover image (conditionnel, mais tous les articles devraient avoir une image)
- ⚠️ `ImageGallery` ne contient pas de `thumbnailUrl` pour les miniatures

---

## 5. Performance (88/100)

### Infrastructure

- ✅ **Site statique** (Astro SSG) — temps de réponse serveur minimal
- ✅ **CDN Vercel** — edge caching mondial
- ✅ **HTTP/2** — multiplexage des requêtes
- ✅ **YouTube lazy-loading** — thumbnail statique + chargement au clic (composant `YouTubeEmbed`)
- ✅ **Polices auto-hébergées** — `@fontsource-variable` évite les requêtes Google Fonts

### Points d'attention

- ⚠️ **Pas de `<link rel="preload">` pour les polices** — Les polices Playfair Display et Manrope Variable pourraient être préchargées pour réduire le FOIT/FOUT
- ⚠️ **Images hero en pleine largeur** — Vérifier que les images de couverture ne dépassent pas 200KB après optimisation
- ✅ **Astro image optimization** — WebP, quality 60/80, widths responsives

### Cache

- ✅ Assets `/_astro/` : immutable par nom de fichier hashé (Vercel par défaut)
- ✅ `/images/` : `max-age=31536000, immutable` (configuré dans `vercel.json`)
- ⚠️ Pages HTML : `max-age=0, must-revalidate` — correct pour du contenu dynamique, mais pourrait bénéficier de `s-maxage` pour le edge cache

---

## 6. Images (90/100)

### Bonnes pratiques

| Critère | Statut |
|---------|--------|
| Composant `<Image>` Astro | ✅ Systématique (jamais de `<img>` brut) |
| Format WebP | ✅ Conversion automatique |
| Qualité optimisée | ✅ 60 (covers), 80 (contenu) |
| Largeurs responsives | ✅ `[320, 480, 640]` et `[640, 1024, 1440]` |
| Attribut `sizes` | ✅ Présent et adapté au layout |
| Texte alternatif descriptif | ✅ Via Keystatic (champs `imageAlt`) |
| Stockage dans `src/assets/` | ✅ Pas de `public/images/` (optimisation Astro) |

### Points d'amélioration

- ⚠️ **Vignette YouTube externe** — `https://img.youtube.com/vi/.../hqdefault.jpg` échappe à l'optimisation Astro
- ⚠️ **Articles de blog sans images** — Certains articles n'ont que l'image hero, pas d'images dans le corps

---

## 7. Préparation IA / AI Search Readiness (82/100)

### Signaux positifs

| Signal | Statut |
|--------|--------|
| `llms.txt` | ✅ Présent avec description structurée, services, liens |
| Crawlers IA autorisés | ✅ 5 user-agents explicitement autorisés |
| Schema markup riche | ✅ LocalBusiness, Service, FAQPage, Article, Person |
| Contenu structuré | ✅ FAQ sur les pages de service (question/réponse) |
| Autorité auteur | ✅ Isabelle Bultez avec credentials vérifiables |

### Points d'amélioration

- ⚠️ **`llms.txt` incomplet** — Ne liste pas les articles de blog ni les descriptions par page
- ⚠️ **Pas de `llms-full.txt`** — Version étendue avec le contenu complet de chaque page pour une meilleure indexation IA
- ⚠️ **FAQ structurées limitées** — Seules les pages de service ont des FAQ ; la page couturière et le blog pourraient aussi en bénéficier
- ⚠️ **Pas de `speakable` schema** — Identifier les passages les plus citables pour Google Assistant et les AI Overviews

---

## Analyse page par page

### Accueil (`/`)
- **Titre :** `L'Atelier des Cousettes` — ⚠️ Manque de mots-clés (« cours de couture Tarn »)
- **Schema :** LocalBusiness + WebSite — ✅ Très complet
- **Contenu :** 6 sections (hero, intro+services, valeurs, animatrice, vidéo, actualités) — ✅ Riche
- **Liens internes :** Vers toutes les pages de service, blog, couturière — ✅

### Ateliers réguliers (`/ateliers-reguliers`)
- **Schema :** BreadcrumbList + WebPage + Service + FAQPage — ✅
- **Contenu :** Créneaux structurés, FAQ, cross-links — ✅
- **Prix :** Détaillés dans les offres schema — ✅

### Stages thématiques (`/stages-thematiques`)
- **Schema :** BreadcrumbList + WebPage + Service + FAQPage — ✅
- **Contenu :** Stages détaillés avec prix, durée, prérequis — ✅

### Un après-midi couture (`/un-apres-midi-couture`)
- **Schema :** BreadcrumbList + WebPage + Service + FAQPage — ✅
- **Contenu :** Description claire, tarif, FAQ — ✅

### La couturière (`/la-couturiere`)
- **Schema :** BreadcrumbList + WebPage + Person — ✅ Avec credential CAP
- **Contenu :** Biographie en sections avec images — ✅
- **E-E-A-T :** Page clé pour la crédibilité — ✅

### Mes créations (`/mes-creations`)
- **Schema :** BreadcrumbList + WebPage + ImageGallery — ✅
- **Contenu :** Galerie + lightbox accessible — ✅
- **Images :** Alt text via Keystatic, WebP optimisé — ✅

### Blog listing (`/blog`)
- **Schema :** BreadcrumbList + CollectionPage — ✅
- **Contenu :** Introduction + grille d'articles — ✅

### Articles de blog (7 articles)
- **Schema :** BreadcrumbList + Article — ✅
- **Auteur :** Isabelle Bultez avec jobTitle — ✅
- **OG :** ⚠️ `og:type: website` au lieu de `article`
- **Dates :** ⚠️ `dateModified = publishDate` (pas de vraie mise à jour)

### Mentions légales (`/mentions-legales`)
- **noIndex :** ✅ Correctement configuré
- **Schema :** Aucun — ✅ Normal pour une page légale

---

## Comparaison avec les standards du secteur

Pour un site de commerce local / services avec 16 pages, ce score de **85/100** est **très bon**. Les principaux axes d'amélioration sont :

1. **Enrichir le contenu blog** pour gagner en autorité thématique
2. **Corriger les balises OG** pour le partage social des articles
3. **Ajouter `lastmod`** au sitemap pour accélérer la ré-indexation
4. **Étendre `llms.txt`** pour l'indexation IA

Le site surperforme sur les données structurées (schema) et la configuration technique, qui sont habituellement les points faibles des petits sites artisanaux.
