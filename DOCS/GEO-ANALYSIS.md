# Analyse GEO — L'Atelier des Cousettes

**Site :** <https://atelier-des-cousettes.fr>
**Date :** 31 juillet 2026

> Cette note remplace la version du 7 avril 2026, devenue trompeuse : elle citait
> l'ancien domaine `couture-tarn.fr`, comptait 13 articles de blog quand il y en
> a 22, et listait comme « à faire » des chantiers livrés depuis (llms-full.txt,
> FAQ sur tout le blog, robots.txt aux noms de robots à jour).

---

## Ce qui est en place

| Signal | État |
| --- | --- |
| Accès des robots IA | 12 robots nommés un par un dans `robots.txt` — GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, Google-Extended, PerplexityBot, Applebot, MistralAI-User… |
| Fichiers pour machines | `/llms.txt`, `/llms-full.txt`, `/tarifs.md`, `/dates.md` — **rendus depuis la base et le CMS**, jamais recopiés |
| FAQ extractibles | 22 articles sur 22 portent leurs `faqItems` → `FAQPage` + `speakable`, affichés sur la page |
| Tutoriels | 5 articles portent un `HowTo` avec durée, fournitures et étapes |
| Formules | `Service` + **`Course` / `CourseInstance`** avec les dates réelles, le lieu, l'enseignante et le prix |
| Graphe d'entités | `@id` `#organization` et `#website` résolus depuis toutes les pages |
| Rendu | Aucune dépendance JavaScript pour le contenu ; les pages de formules sont rendues à chaque visite, donc jamais périmées |

**Le point fort du site** : plus rien de ce qu'un moteur lit n'est une copie.
Les prix, les créneaux et les dates viennent de la base qui facture, ce qui
supprime la faute la plus coûteuse du référencement génératif — un montant
périmé récité par un modèle, qu'aucun visiteur ne peut corriger.

---

## Ce qui reste ouvert

### 1. La présence hors du site (ÉLEVÉ)

C'est le plafond, et il n'est pas technique. Les moteurs de réponse citent 6,5
fois plus une marque via un tiers que via son propre domaine.

- **Google Business Profile** : 5★ pour 6 avis. La collecte d'avis reste
  l'action la plus rentable du lot — voir `ANNUAIRES-LOCAUX.md`.
- **Annuaires locaux** : PagesJaunes, Petit Futé, offices de tourisme, JDS,
  IntraMuros occupent une grande partie de la première page sur les requêtes
  locales. Plan détaillé dans `ANNUAIRES-LOCAUX.md`.
- **Cohérence NAP** : les fiches déposées avant le 31 juillet 2026 citent
  `couture-tarn.fr`. À reprendre avant d'en créer de nouvelles.
- **Reddit / forums** : aucune présence. À pondérer — pour un atelier local, les
  annuaires et le profil Google pèsent plus qu'un fil Reddit national.

### 2. Le contenu comparatif (MOYEN)

Les articles comparatifs représentent environ un tiers des citations des moteurs
de réponse ; le blog n'en compte aucun sur 22 articles. Trois sujets attendent,
et chacun répond à une question réellement posée avant de s'inscrire :

- « Atelier régulier ou stage thématique : lequel choisir ? »
- « Surjeteuse ou machine à coudre » — l'article existant explique la
  surjeteuse sans jamais poser la comparaison frontalement.
- « Cours de couture ou apprendre seule avec des tutoriels »

### 3. Les avis, en balisage (MOYEN, sous condition)

La note Google (5,0) et les témoignages sont affichés, et ne sont balisés nulle
part. **Attention** : Google interdit `aggregateRating` auto-attribué sur
`LocalBusiness` et `Organization` — le baliser là exposerait à une action
manuelle. Le type `Course`, désormais posé sur les trois pages de formules, y est
en revanche éligible. À n'envisager qu'avec des avis réellement collectés et
affichés, jamais recopiés.

### 4. Le `HowTo` sur les articles qui en sont (FAIBLE)

`prendre-ses-mesures` et `retouches-simples-ourlet-bouton-fermeture` décrivent
des gestes pas à pas sans porter d'étapes structurées. Les autres articles sont
des guides ou des listes : les baliser en `HowTo` promettrait des étapes que
personne n'y trouverait.

---

## Ce qu'il ne faut pas faire

Rappels, parce que chacun a déjà été tenté quelque part :

- **Pas de contenu écrit « pour l'IA »** séparé du contenu lu par les visiteurs.
  Google le traite comme du *scaled content abuse*.
- **Pas de découpage du contenu en fragments** pour aider l'extraction. Des
  titres et des paragraphes normaux suffisent.
- **Rien de balisé qui ne soit affiché.** La règle vaut déjà pour les FAQ ; elle
  vaut pour les dates, les prix et les avis.
- **Pas de blocage des robots de recherche IA.** Un robot bloqué ne peut pas
  citer.
