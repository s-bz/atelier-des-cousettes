# Analyse GEO — L'Atelier des Cousettes

**Site :** https://couture-tarn.fr
**Date :** 7 avril 2026 (mis à jour après implémentation)

---

## Score GEO : 78/100 (était 62/100)

| Critère | Score | Poids | Pondéré |
| --- | --- | --- | --- |
| Citabilité | 20/25 | 25% | 20 |
| Lisibilité structurelle | 18/20 | 20% | 18 |
| Contenu multimodal | 10/15 | 15% | 10 |
| Signaux d'autorité et de marque | 12/20 | 20% | 12 |
| Accessibilité technique | 18/20 | 20% | 18 |
| **Total** | | | **78/100** |

---

## Répartition par plateforme

| Plateforme | Score | Notes |
| --- | --- | --- |
| Google AI Overviews | 82/100 | Schéma local solide, contenu enrichi avec blocs de définition, FAQ structurées en H2 questions |
| ChatGPT | 65/100 | llms.txt présent, GPTBot autorisé, 13 articles de blog citables. Pas de présence Wikipedia/Reddit |
| Perplexity | 55/100 | PerplexityBot autorisé. Pas de citations Reddit/communautaires à exploiter |

---

## Accès des robots IA

| Robot | Statut |
| --- | --- |
| GPTBot (OpenAI) | Autorisé |
| ChatGPT-User (OpenAI) | Autorisé |
| Claude-Web (Anthropic) | Autorisé |
| PerplexityBot (Perplexity) | Autorisé |
| Applebot-Extended (Apple) | Autorisé |
| OAI-SearchBot (OpenAI) | Non listé (autorisé par défaut) |
| ClaudeBot (Anthropic) | Non listé (autorisé par défaut) |
| CCBot (Common Crawl) | Non listé (autorisé par défaut) |

**Verdict :** Tous les robots IA majeurs sont explicitement autorisés.

---

## Statut llms.txt

**Présent :** Oui, à `/llms.txt`

**Qualité :** Bon. Contient un résumé structuré, les services avec tarifs, adresses, coordonnées et liens vers les pages.

**Améliorations possibles :**

- Ajouter une section `## Faits clés` avec des chiffres spécifiques (années d'expérience, nombre d'élèves, etc.)
- Ajouter les liens vers le blog pour enrichir le contenu indexable par les LLM
- Envisager un `llms-full.txt` avec le contenu détaillé de toutes les pages

---

## Analyse des mentions de marque

| Plateforme | Présent | Impact |
| --- | --- | --- |
| Wikipedia | Non | Impact négatif élevé — Wikipedia est la source de citation #1 pour ChatGPT (47,9%) |
| Reddit | Non | Impact négatif élevé — Reddit est #1 pour Perplexity (46,7%) et #2 pour ChatGPT (11,3%) |
| YouTube | Oui (1 vidéo intégrée avec description) | Modéré — vidéo par un tiers, pas de chaîne propre |
| LinkedIn | Inconnu | Modéré — aucun profil lié trouvé dans les données structurées |
| Facebook | Oui | Impact faible pour la citation IA (Facebook n'est pas exploré par la plupart des IA) |
| Google Business Profile | Inconnu | Critique pour les réponses IA locales |

**Lacune critique :** Les mentions de marque corrèlent 3x plus avec la visibilité IA que les backlinks. Le site a une présence quasi nulle sur les plateformes dont les moteurs IA citent le contenu.

---

## Analyse de citabilité au niveau des passages

### État actuel (amélioré)

Le contenu a été considérablement enrichi depuis l'analyse initiale :

- **Page d'accueil** — Bloc de définition de 500+ mots avec « Qu'est-ce que L'Atelier des Cousettes ? », formules, animatrice, tarifs. Parfaitement citable.
- **Stages thématiques** — Introduction de 150+ mots + 6 FAQ en H2 questions (« Qu'apprend-on lors d'une initiation ? », « Faut-il apporter sa machine ? », etc.). Forte citabilité.
- **Ateliers réguliers** — Introduction structurée + FAQ (tarifs, matériel, niveau, inscription). Bonne citabilité.
- **Un après-midi couture** — Introduction complète + 8 FAQ en H2 questions (déroulement, public, projets, matériel, annulation). Excellente citabilité.
- **La couturière** — Bio structurée avec introduction factuelle (diplôme, années d'expérience, lieu). Accents corrigés. Bonne citabilité.
- **Blog (13 articles)** — Contenu pratique riche en passages citables : guides, tutoriels, listes, conseils. Forte autorité thématique sur « couture débutant ».

### Passages citables identifiés

Chaque page de service contient désormais au moins un bloc de 134-167 mots répondant à une question spécifique avec des faits concrets (lieu, prix, durée, animatrice, niveau requis).

Les 13 articles de blog fournissent des dizaines de passages citables sur des sujets pratiques (choix de machine, tissus, mesures, entretien, ourlets, patrons, etc.).

---

## Vérification du rendu côté serveur

**Statut : Excellent**

- Astro avec pré-rendu statique (SSG) — toutes les pages sont pré-rendues en HTML au moment du build
- Zéro dépendance JavaScript côté client pour le contenu
- Tous les schémas rendus côté serveur dans le `<head>` HTML
- Les robots IA voient l'intégralité du contenu sans exécution JavaScript

---

## 5 changements à plus fort impact

### 1. Construire une présence Reddit/communautaire (ÉLEVÉ)

- Publier dans les subreddits de couture francophone (r/couture, r/france) ou forums
- Répondre aux questions sur la couture dans la région du Tarn
- Mentionner l'atelier naturellement dans des fils de discussion pertinents
- Impact direct sur la probabilité de citation par Perplexity et ChatGPT

### 2. Créer/optimiser la fiche Google Business Profile (ÉLEVÉ)

- Vérifier que la fiche GBP est complète avec photos, horaires, avis
- Ajouter l'URL GBP dans le `sameAs` du schéma LocalBusiness
- Les réponses IA locales s'appuient fortement sur les données GBP

### 3. Enrichir llms.txt avec le blog et les faits clés (MOYEN)

- Ajouter les liens vers les 13 articles de blog
- Ajouter une section « Faits clés » : années d'expérience, nombre d'élèves, spécialités
- Envisager un `llms-full.txt` détaillé

### 4. Ajouter `knowsAbout` au schéma Person (MOYEN)

Le schéma Person d'Isabelle dans le LocalBusiness a déjà `knowsAbout` sur la page d'accueil, mais les autres pages (ContentPage, blog) n'incluent pas cette propriété. Harmoniser.

### 5. Développer une chaîne YouTube (FAIBLE)

- La vidéo existante est par un tiers — créer du contenu vidéo propre
- Les tutoriels couture en vidéo sont fortement citables par les IA
- Lier la chaîne dans le `sameAs` du schéma

---

## Recommandations de schéma

### Déjà implémenté

- LocalBusiness avec fondateur, horaires, catalogue d'offres, adresse structurée depuis le CMS
- Service schema sur 3 pages de services avec tarifs depuis le CMS
- Article schema sur 13 articles de blog avec auteur et éditeur depuis le CMS
- ImageGallery sur la page créations
- BreadcrumbList sur toutes les pages de contenu
- WebSite schema sur la page d'accueil
- WebPage schema avec `dateModified` sur toutes les pages ContentPage
- CollectionPage schema sur la page blog
- `knowsAbout` sur le Person schema de la page d'accueil

### Ajouts recommandés

1. **`sameAs` étendu** sur LocalBusiness : ajouter LinkedIn, Google Business Profile URL, YouTube (si chaîne créée)
2. **`knowsAbout`** harmonisé sur le Person schema dans ContentPage et les pages de blog
3. **`datePublished`** sur les pages de services (via le WebPage schema)

---

## Reformatage du contenu — État actuel

### Page d'accueil — CORRIGÉ

Bloc de définition factuel de 500+ mots avec sections structurées : « Pourquoi choisir L'Atelier des Cousettes ? », « Nos formules », « Votre animatrice », « Actualités ». Liens internes vers toutes les pages de services et le blog.

### Pages de services — CORRIGÉ

Chaque page de service a désormais :
1. Introduction factuelle de 150+ mots (définition, lieu, public, prix, animatrice)
2. FAQ en H2 sous forme de questions (5-8 questions par page)
3. Liens internes vers les autres services et le blog

### La couturière — CORRIGÉ

Bio structurée avec introduction factuelle, accents corrigés, parcours détaillé. Page la plus riche en signaux E-E-A-T du site.

### Blog — NOUVEAU

13 articles de 700-800 mots ciblant le cluster « couture débutant ». Contenu pratique, structuré en H2/H3, avec liens internes vers les pages de services. Publication programmée avec gating par date.
