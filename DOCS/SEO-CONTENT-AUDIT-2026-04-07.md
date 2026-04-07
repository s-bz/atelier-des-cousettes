# Audit Qualité de Contenu & E-E-A-T — couture-tarn.fr

**Date :** 07 avril 2026
**Pages auditées :** 6 pages principales + 13 articles de blog (hors mentions-légales, noindex)

---

## Score Global de Qualité de Contenu : 68/100

---

## Bonne posture

Ce qui est en place et fonctionne bien.

### Infrastructure technique

- **Données structurées** — Excellent balisage schema sur toutes les pages : LocalBusiness + WebSite (accueil), Service avec Offer (services), Article (blog), ImageGallery (créations), BreadcrumbList (toutes).
- **Offres schema depuis le CMS** — Les offres (prix, noms) des 3 pages de services sont gérées depuis Keystatic (`schemaOffers`), plus de hardcoding dans les templates.
- **Descriptions schema dynamiques** — Les descriptions des schemas Service utilisent le champ `seoDescription` du CMS.
- **Meta tags** — Canonical, Open Graph (`fr_FR`), Twitter card sur chaque page.
- **Crawlers IA** — `robots.txt` autorise GPTBot, ChatGPT-User, Claude-Web, PerplexityBot. `llms.txt` présent.
- **Sitemap** — Auto-généré par `@astrojs/sitemap`.
- **En-têtes de sécurité** — Configurés dans `vercel.json`.

### Contenu & E-E-A-T

- **Blog : 13 articles SEO** — Cluster thématique couture solide couvrant : choix de machine à coudre, tote bag, débuter la couture, entretien machine, prendre ses mesures, tissus débutants, trousse de couture, patrons, ourlet invisible, trousse à fermeture éclair, erreurs de débutant, organiser son espace, surjeteuse. Articles structurés en Q/R avec titres interrogatifs (bon pour citations IA).
- **Qualifications sur toutes les pages de services** — "Isabelle Bultez, couturière diplômée CAP couture flou" mentionnée dans le paragraphe d'introduction de chaque page de service.
- **Liens internes contextuels** — Ateliers réguliers et un après-midi couture ont des liens croisés vers les services liés dans le corps du texte.
- **Paragraphes d'introduction** — Chaque page de service a un paragraphe d'introduction riche (qualifications, niveaux, accompagnement, tarifs, lieux).
- **Page d'accueil CMS** — Images, cartes services, CTA et contenu gérés depuis Keystatic. Schema OfferCatalog avec titres dynamiques des services.

### Pages en bonne santé

| Page | Mots | Seuil | Statut |
|------|------|-------|--------|
| Stages thématiques | ~775 | 800 | ⚠️ Quasi atteint (-25 mots) |
| Ateliers réguliers | ~695 | 800 | ⚠️ En progression (-105 mots) |

---

## Analyse par Page — Problèmes restants

### 1. Page d'accueil (`/`)

| Critère | Résultat | Statut |
|---------|----------|--------|
| Nombre de mots | ~236 mots | ÉCHEC (min 500) |
| H1 | "L'Atelier des Cousettes" | OK |
| Meta description | 148 caractères, riche en mots-clés | OK |
| Liens internes | 3 cartes services (CMS) + nav | OK |
| Schema | LocalBusiness + WebSite + OfferCatalog | Excellent |

**Problèmes :**

- **Contenu mince** — 236 mots, en dessous du minimum de 500.
- La section actualités indique "Octobre 2025" — **contenu obsolète** (6 mois).
- Pas de structure H2 au-delà de "Actualités" — il manque des sections "Nos cours", "Pourquoi nous choisir", etc.
- Vidéo YouTube présente mais aucune transcription ni texte d'accompagnement.

---

### 2. Ateliers réguliers (`/ateliers-reguliers`)

| Critère | Résultat | Statut |
|---------|----------|--------|
| Nombre de mots | ~695 mots | ATTENTION (min 800) |

**Problèmes :**

- **105 mots en dessous** du seuil de 800 mots.
- Aucun témoignage, récit d'élève ou photo d'ateliers en cours.
- Le contenu reste principalement une grille de dates/tarifs — manque de texte descriptif sur l'expérience et les apprentissages.

---

### 3. Stages thématiques (`/stages-thematiques`)

| Critère | Résultat | Statut |
|---------|----------|--------|
| Nombre de mots | ~775 mots | ATTENTION (min 800) |

**Problèmes :**

- **25 mots en dessous** du seuil — quasi atteint.
- Les dates font référence à janvier, octobre, avril — vérifier qu'elles sont à jour pour la saison 2025-2026.
- Aucun résultat d'élèves, photos avant/après ni témoignages.
- Pas de liens internes contextuels vers les pages liées.

---

### 4. Un après-midi couture (`/un-apres-midi-couture`)

| Critère | Résultat | Statut |
|---------|----------|--------|
| Nombre de mots | ~189 mots | ÉCHEC (min 800) |

**Problèmes :**

- **Contenu très mince** — 189 mots, très loin du minimum de 800.
- Seulement 2 questions H2 — pourrait être considérablement étoffé.
- Aucune photo de séances passées, aucun témoignage.
- Manque de détails sur le déroulement, le matériel, ce que l'on crée.

---

### 5. La couturière (`/la-couturiere`)

| Critère | Résultat | Statut |
|---------|----------|--------|
| Nombre de mots | ~333 mots | ÉCHEC (min 500 pour page "à propos") |
| H2 | 3 sections biographiques | Bonne structure |
| Images | 3 photos bio avec alt text | Bon |
| Signaux E-E-A-T | Diplôme CAP, héritage familial, parcours pro | Bonne base |

**Problèmes :**

- **Page E-E-A-T la plus forte** du site, mais encore trop mince à 333 mots.
- Mentionne le diplôme CAP mais ne développe pas sur les années d'expérience, le nombre d'élèves formés, les spécialisations.
- Aucune validation externe (mentions presse, prix, partenariats).
- Schema `Person` manquant (seulement référencée comme fondatrice dans LocalBusiness).
- Devrait être la page E-E-A-T pilier du site — nécessite une expansion significative.

---

### 6. Mes créations (`/mes-creations`)

| Critère | Résultat | Statut |
|---------|----------|--------|
| Nombre de mots | ~68 mots | ÉCHEC (min 300 pour galerie) |
| Galerie | ~5 images | Maigre |
| Schema | ImageGallery | Bon |
| Alt text | Générique | Faible |

**Problèmes :**

- **Extrêmement mince** — page de galerie quasi vide.
- Insuffisant pour démontrer l'expertise.
- Alt text générique, non descriptif (ex : "Robe en lin naturel cousue main" serait bien mieux).
- Aucune description par création, ni matériaux, ni détails du processus.

---

## Bilan E-E-A-T

| Facteur | Score | Signaux clés |
|---------|-------|--------------|
| **Expérience** | 14/25 | Galerie existante mais maigre. Vidéo YouTube positive. 13 articles de blog démontrent une expertise pratique. |
| **Expertise** | 18/25 | Diplôme CAP sur la page bio et sur toutes les pages de services. 13 articles de blog renforcent l'autorité thématique. |
| **Autorité** | 11/25 | Blog avec 13 articles crée un cluster thématique solide. Aucune citation externe, mention presse ou partenariat. |
| **Fiabilité** | 16/25 | Coordonnées sur chaque page. Adresse physique. Mentions légales. Adhésion associative. Toujours aucun témoignage ou avis. |
| **Total** | **59/100** | |

---

## Score de Prêt pour les Citations IA : 52/100

| Signal | Statut | Notes |
|--------|--------|-------|
| Déclarations citables | Moyen | Articles de blog contiennent des définitions et conseils extractibles. Pages de services principalement horaires/prix. |
| Données structurées | Fort | Excellent balisage schema, offres depuis CMS. |
| Hiérarchie des titres | Bon | Flux H1 → H2 → H3 propre |
| Format réponse-d'abord | Moyen | Articles de blog en Q/R avec titres interrogatifs. FAQ pages de services limitées. |
| Tableaux/listes | Moyen | Tarifs listés mais pas en tableaux HTML |
| llms.txt | Présent | Résumé lisible par les machines |
| robots.txt crawlers IA | Autorisés | GPTBot, Claude-Web, PerplexityBot |
| Données propriétaires | Faible | Aucune statistique unique ou insight propriétaire |
| Autorité thématique | Bon | 19 pages (6 + 13 articles blog) — cluster thématique couture |

---

## Fraîcheur du Contenu

| Page | Signal de fraîcheur | Statut |
|------|-------------------|--------|
| Page d'accueil | Actualités "Octobre 2025" | **OBSOLÈTE** — 6 mois |
| Ateliers réguliers | Dates de sessions listées | À vérifier pour la saison en cours |
| Stages thématiques | Sessions datées multiples | À vérifier pour la saison en cours |
| Un après-midi couture | Sessions datées | À vérifier pour la saison en cours |
| La couturière | Bio evergreen | OK |
| Mes créations | Pas de dates | OK mais maigre |

---

## Recommandations restantes

### Critique (Lacunes de contenu)

1. **Étoffer la page d'accueil à 500+ mots** — Actuellement 236 mots. Ajouter une section "pourquoi nous choisir", une brève présentation de l'animatrice avec lien vers la bio, et mettre à jour la section actualités.

2. **Étoffer les pages de services à 800+ mots** — Stages thématiques quasi au seuil (775). Ateliers réguliers en progression (695). Un après-midi couture très mince (189). Ajouter du texte descriptif sur l'expérience, les apprentissages, le déroulement.

3. **Étoffer La couturière à 600+ mots** — Actuellement 333 mots. Ajouter les années d'expérience, le nombre d'élèves formés, la philosophie pédagogique, les spécialisations. Ajouter le schema `Person`.

4. **Étoffer la galerie Mes créations** — Actuellement ~68 mots et ~5 images. Ajouter 10 à 15+ créations avec des textes alternatifs descriptifs et un paragraphe par création.

### Élevé (E-E-A-T & Confiance)

5. **Ajouter des témoignages/avis** — Collecter des citations d'élèves pour les pages de services. Envisager d'intégrer des avis Google.

6. **Mettre à jour le contenu obsolète** — La section actualités "Octobre 2025" est toujours sur la page d'accueil.

7. **Ajouter des liens internes sur stages thématiques** — Seule page de service sans liens croisés dans le corps du texte.

### Moyen (Citations IA & Structure)

8. **Ajouter plus de contenu FAQ** — Les pages de services ont 2-3 questions H2 mais pas encore 5-6 par page (stationnement, matériel, annulation, taille des groupes, conditions d'âge).

---

## Synthèse

Le site a **significativement progressé**. Les bases SEO techniques sont excellentes et ont été renforcées : offres schema gérées depuis le CMS, qualifications de l'animatrice sur toutes les pages de services, liens internes contextuels, et un **blog de 13 articles** formant un cluster thématique couture solide.

**Bilan des recommandations initiales :**

- ✅ #7 — Liens internes entre pages de services (2/3 pages)
- ✅ #9 — Qualifications de l'animatrice sur les pages de services
- ✅ #10 — Blog créé avec 13 articles SEO
- ⚠️ #1, #2, #8 — En cours (contenu enrichi mais seuils non atteints)
- ❌ #3, #4, #5, #6 — Non traités

**Priorités immédiates :**

1. **Contenu mince** — Aucune page n'atteint son seuil minimum. Priorité : un après-midi couture (189/800) et page d'accueil (236/500).
2. **Contenu obsolète** — Actualités "Octobre 2025" à remplacer.
3. **E-E-A-T** — Témoignages, galerie étoffée et page couturière enrichie restent absents.
