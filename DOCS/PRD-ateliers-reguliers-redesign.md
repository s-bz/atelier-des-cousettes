# PRD — Refonte de la page Ateliers réguliers pour la clarté et l'ergonomie

## Problème

La page « Ateliers réguliers » présente tout son contenu dans un seul bloc Markdoc monolithique : introduction, lieux, créneaux horaires avec calendriers, tarifs et FAQ. Un visiteur doit défiler un long mur de texte pour trouver le créneau qui l'intéresse et comparer les tarifs. Les calendriers de dates sont particulièrement longs et rendent la page difficile à scanner. Le format ne permet pas une gestion indépendante de chaque créneau dans Keystatic.

Les pages d'accueil et stages thématiques ont déjà été restructurées avec succès en sections distinctes (PRD-homepage-redesign.md, PRD-stages-thematiques-redesign.md). L'objectif est d'appliquer la même approche.

## Objectif

Restructurer la page en sections visuellement distinctes :

1. « De quoi s'agit-il ? » (introduction)
2. « Quels créneaux sont proposés ? » (cartes par créneau)
3. « Combien ça coûte ? » (grille tarifaire)
4. « Questions pratiques » (FAQ)
5. « Autres formules » (CTA + liens croisés)

Aucun changement visuel (couleurs, polices, design tokens inchangés). Réutilisation maximale des composants existants (StageCard pattern).

## User Stories

### US-1 : Trouver rapidement un créneau disponible

**En tant que** nouveau visiteur, **je veux** voir tous les créneaux avec leur jour, horaire, lieu et prix dans un format visuel scannable, **afin de** identifier rapidement le créneau qui correspond à mon emploi du temps.

### US-2 : Consulter le calendrier d'un créneau

**En tant que** visiteur intéressé par un créneau, **je veux** voir les dates précises de la saison en un clic, **afin de** vérifier la compatibilité avec mon agenda.

### US-3 : Comprendre la grille tarifaire

**En tant que** futur élève, **je veux** voir les tarifs clairement présentés avec les différentes formules (mensuel, à la séance), **afin de** choisir la formule qui me convient.

### US-4 : Réponses aux questions pratiques

**En tant que** futur participant, **je veux** trouver rapidement les réponses aux questions fréquentes (matériel, niveau, inscription, projets possibles), **afin de** me préparer.

### US-5 : Gestion indépendante via Keystatic

**En tant qu'** administratrice (Isabelle), **je veux** pouvoir modifier chaque créneau individuellement (jour, horaire, dates, prix) et les questions FAQ dans Keystatic, **afin de** mettre à jour le calendrier chaque saison sans toucher au code.

## Solution

### Nouvelle architecture des sections

| #   | Section              | Fond              | Contenu                                                                      |
| --- | -------------------- | ----------------- | ---------------------------------------------------------------------------- |
| 1   | Hero Banner          | Image de couverture | Titre + sous-titre (inchangé)                                               |
| 2   | Introduction + CTA   | Par défaut        | Paragraphe d'accroche court + CTA contact                                   |
| 3   | Navigation rapide    | Accent            | Pill tabs d'ancre : « Revel — Adultes », « Revel — Enfants », « Verdalle » |
| 4   | Créneaux par groupe  | Accent            | Sous-sections avec titre + grille de cartes par groupe                      |
| 5   | Détails créneaux + CTA | Par défaut      | Calendrier complet par créneau + tarif détaillé + CTA contact               |
| 6   | FAQ + CTA            | Accent            | Questions/réponses structurées + CTA contact                                |
| 7   | Liens croisés        | Par défaut        | Liens vers stages thématiques et après-midi couture                         |

Chaque section majeure inclut un `ContactCTA` pour maximiser les conversions.

### Navigation rapide (pill tabs)

Une barre de pills d'ancre en haut de la section créneaux permet de sauter directement au groupe souhaité. Rendu purement statique (liens d'ancre `#revel-adultes`, `#revel-enfants`, `#verdalle`), sans JavaScript. Les pills ont un style bouton secondaire (outline) cohérent avec le design system.

Les créneaux sont regroupés dans les sections cards ET détails par :
- **Revel — Adultes** : mardi après-midi, jeudi après-midi, jeudi fin de journée, samedi matin ados+adultes, samedi après-midi
- **Revel — Enfants** : ateliers enfants samedi
- **Verdalle** : atelier de Verdalle

### Changements Keystatic

Le champ unique `content` (Markdoc) est remplacé par des champs structurés dans le singleton `ateliersReguliers` :

- `introduction` — Texte court d'accroche
- `creneaux[]` — Tableau de créneaux, chacun avec :
  - `name` — Nom du créneau (ex : « Atelier du jeudi après-midi »)
  - `location` — Lieu (ex : « Revel » ou « Verdalle »)
  - `day` — Jour (ex : « Jeudi »)
  - `time` — Horaire (ex : « 14h à 17h »)
  - `audience` — Public cible (ex : « Adultes » ou « Enfants »)
  - `price` — Tarif résumé (ex : « 55 €/mois »)
  - `priceDetails` — Détail tarifaire (texte multiligne)
  - `dates` — Calendrier de la saison (texte multiligne)
  - `note` — Note optionnelle (ex : « Selon les demandes »)
- `faqItems[]` — Tableau de questions/réponses :
  - `question` — La question
  - `answer` — La réponse (texte multiligne)
- `crossLinksText` — Texte de fin avec liens vers les autres formules
- `schemaOffers` — Conservé tel quel (déjà structuré pour le SEO)
- `ctaLabel` — Libellé du bouton CTA

### Composant réutilisé

- **StageCard.astro** — Renommé ou adapté ? Non : on crée un composant **AtelierCard.astro** spécifique car les informations affichées diffèrent (lieu, jour, horaire, public vs nom, prix, durée). Même style visuel (ombres, radius, typographie).

### Nouveau composant

- **AtelierCard.astro** — Carte de créneau (nom + lieu + jour + horaire + public + prix). Style cohérent avec StageCard.astro. Inclut un lien d'ancre vers la section détail correspondante.

### Composants réutilisés (sans modification)

- Hero.astro — Bandeau titre + image de couverture
- ContactCTA.astro — Bouton vers formulaire de contact Tally
- BaseLayout.astro — Mise en page globale avec méta-tags

### Composant abandonné

- ContentPage.astro — N'est plus utilisé pour cette page car on construit la mise en page par sections directement dans `ateliers-reguliers.astro`.

### Schema.org

Le schéma `Service` avec `Offer` items est conservé et continue d'être généré depuis `schemaOffers`. Le `BreadcrumbList` est reproduit directement dans la page. Le schéma `FAQPage` est ajouté, généré depuis les `faqItems[]`.

## Contenu migré

Les créneaux actuels sont migrés depuis le Markdoc vers les champs structurés :

| Créneau                              | Lieu     | Jour     | Horaire         | Public         | Prix                    |
| ------------------------------------ | -------- | -------- | --------------- | -------------- | ----------------------- |
| Atelier de Verdalle                  | Verdalle | Vendredi | (calendrier à venir) | Adultes   | 50 €/mois (2x 2h30)    |
| Atelier du mardi après-midi          | Revel    | Mardi    | 14h–17h         | Adultes        | 33 € ou 55 €/mois      |
| Atelier du jeudi après-midi          | Revel    | Jeudi    | 14h–17h         | Adultes        | 55 €/mois               |
| Atelier du jeudi fin de journée      | Revel    | Jeudi    | 17h30–19h30     | Adultes        | 25 € la séance          |
| Atelier du samedi matin              | Revel    | Samedi   | 9h30–12h30      | Ados et adultes | 37 €/mois              |
| Atelier du samedi après-midi         | Revel    | Samedi   | 14h–17h         | Adultes        | 33 € ou 55 €/mois      |
| Ateliers enfants samedi              | Revel    | Samedi   | 10h–12h         | Enfants        | 30 €/mois               |

Les 5 questions FAQ sont migrées depuis le Markdoc :

1. Quels sont les tarifs des ateliers réguliers ?
2. Faut-il apporter son matériel ?
3. Quel niveau faut-il pour s'inscrire ?
4. Comment fonctionne l'inscription ?
5. Que peut-on réaliser en atelier ?

## Fichiers modifiés/créés

| Fichier                                            | Action                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `keystatic.config.ts`                              | Modifié — nouveaux champs structurés pour `ateliersReguliers`       |
| `src/content/pages/ateliers-reguliers/index.yaml`  | Créé — contenu migré en YAML structuré                              |
| `src/content/pages/ateliers-reguliers/index.mdoc`  | Supprimé — remplacé par index.yaml                                  |
| `src/pages/ateliers-reguliers.astro`               | Réécrit — nouvelle mise en page par sections                        |
| `src/components/AtelierCard.astro`                 | Créé — carte de créneau (jour, horaire, lieu, public, prix)        |

## Vérification

- `pnpm build` — aucune erreur de build
- `pnpm check` — 0 erreurs TypeScript
- Vérification visuelle mobile et desktop via `pnpm dev`
- Vérification que les schémas JSON-LD (Service + FAQPage + BreadcrumbList) sont présents
- Vérification que tous les champs sont éditables dans `/keystatic`
- Vérification que les liens croisés (stages thématiques, après-midi couture) fonctionnent
