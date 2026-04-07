# Audit Qualité de Contenu & E-E-A-T — couture-tarn.fr

**Date :** 07 avril 2026
**Pages auditées :** 6 pages principales + 13 articles de blog (hors mentions-légales, noindex)

---

## Score Global de Qualité de Contenu : 82/100

---

## Bonne posture

Ce qui est en place et fonctionne bien.

### Infrastructure technique

- **Données structurées** — Excellent balisage schema sur toutes les pages : LocalBusiness + WebSite (accueil), Service avec Offer (services), Article (blog), ImageGallery (créations), BreadcrumbList (toutes).
- **Schema Person** — Page La couturière inclut un schema `Person` avec `EducationalOccupationalCredential` (CAP couture flou).
- **Offres schema depuis le CMS** — Les offres (prix, noms) des 3 pages de services sont gérées depuis Keystatic (`schemaOffers`), plus de hardcoding dans les templates.
- **Descriptions schema dynamiques** — Les descriptions des schemas Service utilisent le champ `seoDescription` du CMS.
- **Meta tags** — Canonical, Open Graph (`fr_FR`), Twitter card sur chaque page.
- **Crawlers IA** — `robots.txt` autorise GPTBot, ChatGPT-User, Claude-Web, PerplexityBot. `llms.txt` présent.
- **Sitemap** — Auto-généré par `@astrojs/sitemap`.
- **En-têtes de sécurité** — Configurés dans `vercel.json`.

### Contenu & E-E-A-T

- **Blog : 13 articles SEO** — Cluster thématique couture solide couvrant : choix de machine à coudre, tote bag, débuter la couture, entretien machine, prendre ses mesures, tissus débutants, trousse de couture, patrons, ourlet invisible, trousse à fermeture éclair, erreurs de débutant, organiser son espace, surjeteuse. Articles structurés en Q/R avec titres interrogatifs (bon pour citations IA).
- **Qualifications sur toutes les pages** — "Isabelle Bultez, couturière diplômée CAP couture flou" mentionnée dans le paragraphe d'introduction de chaque page de service et sur la page d'accueil.
- **Liens internes contextuels** — Toutes les pages de services ont des liens croisés vers les services liés dans le corps du texte. La page d'accueil lie vers les 3 services, la bio et le blog.
- **Paragraphes d'introduction** — Chaque page a un paragraphe d'introduction riche (qualifications, niveaux, accompagnement, tarifs, lieux).
- **Page d'accueil structurée** — Sections "Pourquoi nous choisir", "Nos formules", "Votre animatrice", "Actualités". Images, cartes services, CTA gérés depuis Keystatic.
- **FAQ enrichies** — 5-6 questions H2 par page de service couvrant matériel, niveau, inscription, déroulement, tarifs, annulation.
- **La couturière enrichie** — Philosophie d'enseignement, spécialisations, expérience détaillée. Schema Person avec credential CAP.

### Pages au-dessus du seuil

| Page | Mots | Seuil | Statut |
|------|------|-------|--------|
| Stages thématiques | ~961 | 800 | ✅ OK |
| Ateliers réguliers | ~887 | 800 | ✅ OK |
| Un après-midi couture | ~803 | 800 | ✅ OK |
| Page d'accueil | ~500 | 500 | ✅ OK |
| La couturière | ~600 | 500 | ✅ OK |

---

## Analyse par Page — Problèmes restants

### 1. Page d'accueil (`/`)

| Critère | Résultat | Statut |
|---------|----------|--------|
| Nombre de mots | ~500 mots | ✅ OK |
| H1 | "L'Atelier des Cousettes" | OK |
| Meta description | 148 caractères, riche en mots-clés | OK |
| Liens internes | 3 cartes services + liens corps + blog + bio | Excellent |
| Schema | LocalBusiness + WebSite + OfferCatalog | Excellent |

**Problèmes restants :**

- Actualités mises à jour en "Saison 2025-2026" mais le contenu reste générique — pourrait inclure des dates précises ou des nouveautés concrètes.
- Vidéo YouTube présente mais aucune transcription ni texte d'accompagnement.

---

### 2. Mes créations (`/mes-creations`)

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
| **Expérience** | 15/25 | Galerie existante mais maigre. Vidéo YouTube positive. 13 articles de blog démontrent une expertise pratique. |
| **Expertise** | 20/25 | Diplôme CAP sur la page bio (avec schema Person), sur toutes les pages de services et la page d'accueil. Philosophie d'enseignement détaillée. 13 articles de blog. |
| **Autorité** | 11/25 | Blog avec 13 articles crée un cluster thématique solide. Aucune citation externe, mention presse ou partenariat. |
| **Fiabilité** | 17/25 | Coordonnées sur chaque page. Adresse physique. Mentions légales. Adhésion associative. FAQ détaillées. Toujours aucun témoignage ou avis. |
| **Total** | **63/100** | |

---

## Score de Prêt pour les Citations IA : 58/100

| Signal | Statut | Notes |
|--------|--------|-------|
| Déclarations citables | Bon | Articles de blog + FAQ détaillées sur chaque page de service fournissent des réponses extractibles. |
| Données structurées | Fort | Excellent balisage schema, offres depuis CMS, Person schema. |
| Hiérarchie des titres | Bon | Flux H1 → H2 → H3 propre |
| Format réponse-d'abord | Bon | Articles de blog en Q/R + 5-6 FAQ par page de service avec titres interrogatifs. |
| Tableaux/listes | Moyen | Tarifs listés mais pas en tableaux HTML |
| llms.txt | Présent | Résumé lisible par les machines |
| robots.txt crawlers IA | Autorisés | GPTBot, Claude-Web, PerplexityBot |
| Données propriétaires | Faible | Aucune statistique unique ou insight propriétaire |
| Autorité thématique | Bon | 19 pages (6 + 13 articles blog) — cluster thématique couture |

---

## Fraîcheur du Contenu

| Page | Signal de fraîcheur | Statut |
|------|-------------------|--------|
| Page d'accueil | Actualités "Saison 2025-2026" | ✅ Mis à jour |
| Ateliers réguliers | Dates de sessions listées | À vérifier pour la saison en cours |
| Stages thématiques | Sessions datées multiples | À vérifier pour la saison en cours |
| Un après-midi couture | Sessions datées | À vérifier pour la saison en cours |
| La couturière | Bio evergreen | OK |
| Mes créations | Pas de dates | OK mais maigre |

---

## Recommandations restantes

### Critique (Lacunes de contenu)

1. **Étoffer la galerie Mes créations** — Actuellement ~68 mots et ~5 images. Ajouter 10 à 15+ créations avec des textes alternatifs descriptifs et un paragraphe par création.

### Élevé (E-E-A-T & Confiance)

2. **Ajouter des témoignages/avis** — Collecter des citations d'élèves pour les pages de services. Envisager d'intégrer des avis Google.

3. **Ajouter des validations externes** — Mentions presse, partenariats, nombre d'élèves formés, années d'activité pour renforcer l'autorité.

---

## Synthèse

Le site a **considérablement progressé** et atteint désormais un bon niveau de qualité de contenu. Toutes les pages principales (hors galerie) dépassent leur seuil minimum de mots. Les FAQ sont enrichies avec 5-6 questions par page de service. Les liens internes sont en place sur toutes les pages. Le schema Person avec credential CAP renforce les signaux E-E-A-T.

**Bilan des recommandations initiales :**

- ✅ #1 — Page d'accueil étoffée à 500 mots
- ✅ #2 — Pages de services étoffées à 800+ mots
- ✅ #3 — La couturière étoffée à 600 mots + schema Person
- ✅ #7 — Liens internes entre toutes les pages de services
- ✅ #8 — FAQ enrichies (5-6 questions par page)
- ✅ #9 — Qualifications de l'animatrice sur toutes les pages
- ✅ #10 — Blog créé avec 13 articles SEO
- ❌ #4 — Galerie Mes créations non étoffée
- ❌ #5 — Témoignages/avis non ajoutés
- ❌ #6 — Contenu obsolète partiellement traité (saison mise à jour, dates spécifiques à vérifier)

**Priorités immédiates :**

1. **Galerie Mes créations** — Seule page très en dessous de son seuil (68/300 mots).
2. **Témoignages** — Signal E-E-A-T manquant le plus impactant.
3. **Validations externes** — Citations, partenariats pour renforcer l'autorité.
