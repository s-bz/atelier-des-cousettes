# Stratégie SEO programmatique — L'Atelier des Cousettes

Date : 31 juillet 2026
Périmètre retenu : **pages de stages** (6) + **glossaire couture** (40)
Périmètre écarté : pages par commune — voir « Ce qu'on ne construit pas ».

---

## 1. Analyse d'opportunité

### Ce que disent les vrais chiffres

Volumes mesurés (DataForSEO, google_ads, France / fr, juillet 2026) et positions
réelles (Search Console, `reports/seo-improver/2026-07-15/`).

**Requêtes géographiques — le filon est vide :**

| Requête | Volume/mois |
|---|---|
| `couturière castres` | 390 *(intention retouches, pas cours)* |
| `cours de couture castres` | 20 |
| `cours de couture tarn` | 10 |
| Sorèze, Dourgne, Puylaurens, Revel… | sous le seuil de mesure |

Et le site se classe **déjà** 1ʳᵉ à 9ᵉ sur les requêtes de proximité —
`club couture autour de moi` (1,0), `couturière autour de moi` (2,5),
`cours de couture autour de moi` (9,3). Google résout la géographie par la
proximité et la fiche Google Business, pas par des pages de commune.

**Requêtes de stage — faible volume, forte intention :**

| Requête | Volume | CPC | Concurrence |
|---|---|---|---|
| `cours de couture débutant` | 260 | 2,52 € | MEDIUM |
| `stage de couture` | 210 | 1,36 € | MEDIUM |
| `cours machine à coudre` | 50 | 1,08 € | HIGH |
| `cours de patronage` | 40 | 3,93 € | MEDIUM |
| `cours surjeteuse` | 30 | 0,17 € | HIGH |
| `formation surjeteuse` | 20 | 2,86 € | MEDIUM |
| `apprendre le patronage` | 20 | 3,06 € | HIGH |

Le CPC est l'information utile ici : entre 1 € et 4 €, ces requêtes sont celles
que des concurrents payent pour acheter. Le volume est faible, l'intention est
commerciale. **Ces pages ne sont pas un pari sur le trafic — elles sont un pari
sur la conversion et sur la fin de la cannibalisation interne.**

**Requêtes de lexique — c'est là qu'est le volume :**

| Requête | Volume | Concurrence |
|---|---|---|
| `couture anglaise` | 2 400 | LOW |
| `encolure` | 2 400 | LOW |
| `droit fil` | 1 600 | LOW |
| `point de chaînette` | 1 600 | LOW |
| `emmanchure` | 1 300 | LOW |
| `surpiqûre` | 1 300 | LOW |
| `laize tissu` | 1 000 | LOW |
| `couture rabattue` | 720 | LOW |
| `fronces` | 720 | LOW |
| `parementure` | 590 | LOW |
| `décatir` | 590 | LOW |
| `point zigzag` | 480 | LOW |
| `empiècement` | 320 | LOW |
| `surfilage` | 210 | LOW |

Environ **17 000 recherches/mois cumulées en concurrence LOW**, sur un vocabulaire
qu'Isabelle enseigne tous les mois en atelier.

Les gros volumes du champ (`pied de biche` 49 500, `canette` 18 100,
`patron de couture` 12 100, `thermocollant` 5 400, `biais` 3 600) sont en
concurrence HIGH : le site les porte pour la cohérence du lexique et pour les
moteurs de réponse, **pas** en espérant s'y classer à court terme.

### Positionnement honnête du pari

| Jeu de pages | Volume visé | Intention | Rôle |
|---|---|---|---|
| Stages (6) | ~600/mois | commerciale | convertir + désaturer la page unique |
| Glossaire (40) | ~17 000/mois réalistes | informationnelle | autorité thématique + citations IA |

Le glossaire n'apporte pas d'inscriptions directement. Il apporte de l'autorité
sur le champ « couture », qui est ce qui manque au domaine pour que les pages de
stage se classent. C'est un investissement à deux étages, pas deux projets.

---

## 2. Défendabilité des données

Hiérarchie de la compétence : les pages de stage sont en **catégorie 1**
(données propriétaires). Elles lisent en base, à chaque visite :

- les dates réelles des prochaines séances (`sessions`)
- le prix réel (`default_unit_price_cents`)
- les places restantes (`capacity` − `bookings`)
- la durée réelle, calculée séance par séance

Aucun concurrent ne peut recopier ça, et ça se périme tout seul dans le bon sens :
une date passée disparaît. C'est le signal de fraîcheur le plus solide du site.

Le glossaire est en **catégorie 1 également**, mais par l'angle et non par la
donnée : chaque terme porte une section « En atelier » — ce qu'Isabelle observe,
corrige et fait refaire sur ce geste précis. C'est ce qui sépare une définition
utile d'une paraphrase de Wikipédia, et c'est aussi ce qui la rend citable.

---

## 3. Structure d'URL

Sous-dossiers, jamais de sous-domaine — l'autorité se consolide sur le domaine.

```
/stages-thematiques/                         hub existant (allégé)
/stages-thematiques/{stage}/                 6 pages, slug = toSlug(libellé base)
   initiation-machine-a-coudre/
   stage-decouverte-de-la-couture/
   stage-surjeteuse/
   stage-patronage/
   stage-banane/
   stage-sac-et-tote-bag/

/glossaire/                                  index A→Z + par catégorie
/glossaire/{terme}/                          40 pages
```

Le slug des stages est **déjà** celui des ancres actuelles (`toSlug(f.base)`) :
la page hub utilise ces identifiants pour son `id=`. Aucun lien interne ni
externe ne pointe vers ces ancres (vérifié) — la bascule ne casse rien et ne
demande aucune redirection.

Toutes les URL portent le slash final, conformément à `vercel.json`.

---

## 4. Cannibalisation : ce qu'on ne crée surtout pas

C'est le risque principal quand on ajoute 46 pages à un site qui en compte ~35.
Trois arbitrages ont été posés :

**a) Le hub perd son détail.** `/stages-thematiques/` cesse de porter les six
descriptions longues : il garde l'introduction, la grille de cartes, la FAQ,
les témoignages et le schéma `Service` qui énumère toutes les offres. Le détail
part sur les pages filles. Sans ça, hub et filles se disputeraient les mêmes
requêtes avec le même texte — le doublon parfait.

**b) Aucun terme de glossaire ne double un article existant.** Écartés :

| Terme écarté | Volume | Article qui le couvre déjà |
|---|---|---|
| `surjeteuse` | 18 100 | `/blog/surjeteuse-a-quoi-ca-sert/` |
| `ourlet invisible` | 1 000 | `/blog/coudre-ourlet-invisible/` |
| `patron de couture` | 12 100 | `/blog/comprendre-patrons-couture/` |
| `prendre ses mesures` | — | `/blog/prendre-ses-mesures/` |

Ces termes existent quand même dans le glossaire, mais **en renvoi** vers
l'article, jamais en page autonome.

**c) Les synonymes fusionnent.** `marge de couture` (90) et `valeur de couture`
(90) désignent la même chose : une seule page, l'autre terme cité dans le corps
et dans les alias. Deux pages se seraient annulées.

---

## 5. Gabarits

### Page de stage

| Élément | Source |
|---|---|
| URL | `/stages-thematiques/{slug}/` |
| `<title>` | `{Nom du stage} — {prix} · L'Atelier des Cousettes` |
| meta description | `{description courte}` + prix et lieu réels, tronquée à 160 |
| H1 | Nom du stage |
| Contenu | prérequis, description longue (CMS), formules, **calendrier live**, places restantes |
| CTA | `ContactCTA` avec le libellé du CMS |
| Liens | 5 stages frères + hub + articles de blog liés |
| Schéma | `BreadcrumbList` + `WebPage` + `Service`/`Offer` + `Event` par séance |

Le `Course`/`Event` par séance à venir est nouveau et n'existe nulle part
ailleurs sur le site : c'est ce qui rend une date éligible aux résultats
enrichis d'événement.

### Page de glossaire

| Élément | Source |
|---|---|
| URL | `/glossaire/{slug}/` |
| `<title>` | `{Terme} : définition couture · L'Atelier des Cousettes` |
| meta description | la définition courte, telle quelle |
| H1 | `{Terme}` |
| Définition courte | 1 à 2 phrases, autoportantes — c'est le bloc extractible |
| Explication | 2 à 4 paragraphes |
| « En atelier » | l'angle propriétaire : ce qu'Isabelle corrige sur ce geste |
| Termes liés | 2 à 4 renvois internes au glossaire |
| Renvois | article de blog et/ou stage concerné |
| Schéma | `BreadcrumbList` + `DefinedTerm` dans `DefinedTermSet` + `FAQPage` si question |

`DefinedTerm` est le type exact pour un lexique — plus juste qu'`Article`, et il
permet de déclarer l'appartenance au `DefinedTermSet` « Glossaire de la couture »,
ce qui donne à Google la structure de l'ensemble et pas seulement des pages
isolées.

---

## 6. Maillage interne

Modèle moyeu-et-rayons, sans page orpheline :

- **Moyeux** : `/stages-thematiques/`, `/glossaire/`
- **Rayons → moyeu** : fil d'Ariane sur chaque page
- **Rayons ↔ rayons** : chaque stage renvoie aux 5 autres ; chaque terme renvoie
  à 2–4 termes liés, choisis à la main sur le sens et non au hasard
- **Glossaire → argent** : chaque terme qui correspond à un stage y renvoie
  (`patronage` → stage patronage, `surfilage`/`point de chaînette` → stage
  surjeteuse). C'est le seul chemin de conversion du glossaire, il doit être
  explicite.
- **Blog → glossaire** : lien depuis `/blog/` vers le glossaire, et le glossaire
  renvoie aux articles. Les 22 articles existants deviennent le contexte du
  lexique.
- **Navigation** : `/glossaire/` entre au **pied de page**, pas à la barre du
  haut — six liens y tiennent déjà à côté du bouton de contact, un septième
  ferait basculer la navigation au menu replié sur les écrans intermédiaires. Le
  pied de page est présent sur toutes les pages lui aussi : le lien vaut autant
  pour le maillage, et ne coûte pas de place. Sans lui, 40 pages dépendraient du
  seul plan du site pour être découvertes.

Chaque terme de glossaire reçoit donc **au moins 3 liens internes entrants**
(index, termes liés, article). C'est le seuil sous lequel Search Console signale
« Détectée, actuellement non indexée » — problème déjà rencontré sur ce site
pour les articles anciens, et résolu par `pickRelatedPosts` en cycle. Le
glossaire applique la même logique.

---

## 7. Indexation

- Les 46 pages entrent au `sitemap-index.xml` (généré, filtre `HORS_PLAN`
  inchangé — aucune n'est `noIndex`).
- Pas de `lastmod` inventé : la règle du site est déjà « date réelle ou rien ».
  Les pages de stage n'en portent pas (leur contenu est calculé à la requête),
  les termes de glossaire portent leur date de dernière modification.
- Les pages de stage sont en `prerender = false` : elles doivent lire la base.
  Cache 1 h, comme `llms.txt`.
- `llms.txt` et `llms-full.txt` récupèrent le glossaire : c'est exactement le
  type de contenu qu'un moteur de réponse cite.

**Ce qu'on surveille après lancement** (via `/seo-improver`) :
taux d'indexation à 4 et 8 semaines, position moyenne sur les 14 termes LOW
listés en §1, et — le vrai signal — si les pages de stage remontent sur
`stage de couture` / `cours de patronage`.

---

## 8. Ce qu'on ne construit pas, et pourquoi

**Les pages par commune.** Douze pages `cours de couture à {commune}` viseraient
~30 recherches/mois cumulées, sur des communes où le site se classe déjà en
première page par proximité. Google qualifie ce motif de *doorway pages* —
« plusieurs pages destinées à des villes différentes mais substantiellement
similaires ». Le rapport bénéfice/risque est négatif : peu de gain possible,
une sanction manuelle possible, et une dilution du budget de crawl d'un domaine
qui vient de migrer.

Ce qui répond mieux au même besoin, sans page nouvelle : les mentions de
communes déjà présentes dans les pages de service, la fiche Google Business, et
les témoignages qui portent un champ `lieu`.

**Le comparatif et l'annuaire.** Pas de données propriétaires pour les nourrir,
pas d'intention de recherche locale correspondante.

---

## 9. Chiffrage

| Poste | Volume |
|---|---|
| Pages ajoutées | 46 (+1 index glossaire = 47) |
| Coût recherche de mots-clés | 0,09 $ (1 appel DataForSEO) |
| Contenu rédigé | 40 fiches de glossaire, ~200 mots chacune |
| Contenu réutilisé | 6 descriptions de stage (déjà dans le CMS) |
| Pages supprimées | 0 |
| Redirections nécessaires | 0 |
