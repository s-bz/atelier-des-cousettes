# PRD — Blog "Conseils Couture"

## Objectif

Creer une section blog sur couture-tarn.fr pour renforcer l'autorite thematique, ameliorer le score E-E-A-T et augmenter le potentiel de citation IA. Identifie comme recommandation #10 de l'audit SEO du 07/04/2026.

## Contexte

Le site ne possede que 6 pages statiques. Un blog avec 7 articles cibles sur des requetes informationnelles liees a la couture permettra de :
- Doubler le nombre de pages indexees
- Creer un cluster thematique autour de "couture debutant"
- Fournir du contenu citable par les moteurs IA
- Generer du trafic organique sur des requetes longue traine

## Architecture technique

### Stack existante
- Astro 6 + Keystatic 5 + Markdoc
- Deploiement Vercel
- Tailwind CSS 4

### Modifications

1. **Keystatic** : Ajouter une collection `blog` avec champs : title (slug), publishDate, seoDescription, coverImage, coverImageAlt, author, content (markdoc)
2. **Pages Astro** :
   - `/blog` — page listing avec grille de cartes
   - `/blog/[slug]` — page article dynamique
3. **Composants** : Reutiliser `BaseLayout`, `Hero`. Creer `BlogCard.astro` pour la liste.
4. **Schema** : `Article` + `BreadcrumbList` sur chaque article, `CollectionPage` sur la page listing
5. **Navigation** : Ajouter "Blog" au menu

### Articles prevus (7)

| # | Slug | Titre | Mots cibles |
|---|------|-------|-------------|
| 1 | choisir-machine-a-coudre | Comment choisir sa machine a coudre | ~800 |
| 2 | debuter-couture-conseils | Debuter la couture : 7 conseils pour se lancer | ~800 |
| 3 | tissus-debutants | Quels tissus choisir quand on debute la couture | ~700 |
| 4 | coudre-tote-bag | Coudre un tote bag : les etapes cles | ~700 |
| 5 | entretenir-machine-a-coudre | Entretenir sa machine a coudre : le guide | ~700 |
| 6 | prendre-ses-mesures | Comment bien prendre ses mesures | ~700 |
| 7 | trousse-couture-indispensables | Les indispensables de la trousse a couture | ~700 |

### User Stories

1. En tant que visiteur, je veux acceder au blog depuis la navigation principale pour decouvrir les articles.
2. En tant que visiteur, je veux voir une liste d'articles avec titre, date et resume pour choisir celui qui m'interesse.
3. En tant que visiteur, je veux lire un article avec un contenu structure et un CTA vers les cours.
4. En tant qu'administrateur, je veux ajouter/modifier des articles depuis Keystatic.

## Hors perimetre

- Systeme de commentaires
- Pagination (7 articles ne le necessitent pas)
- Categories/tags (a ajouter plus tard si besoin)
- Flux RSS (a ajouter plus tard)
