# Spécification — les pages publiques lisent Supabase

_30 juillet 2026_

## 1. Le problème

Les trois pages de service — `ateliers-reguliers`, `stages-thematiques`,
`un-apres-midi-couture` — affichent des noms, des tarifs et des dates saisis à
la main dans Keystatic. Les mêmes informations existent désormais en base, où
Isabelle les tient à jour pour faire tourner l'espace membre : les créneaux, les
séances programmées, les prix à la séance.

Il y a donc deux vérités, et l'une des deux se périme sans rien dire. La page
« Un après-midi couture » en donne la démonstration : ses sept dates sont un
copier-coller de celles du Stage patronage. Personne ne l'a vu, parce que rien
ne pouvait le voir.

Ce qui suit fait de la base la source des faits — les noms, les dates, les prix
à la séance — et laisse à Keystatic ce qui relève du récit.

## 2. Périmètre

Trois nouvelles pages, montées à côté des anciennes et non indexées, le temps
qu'Isabelle vérifie. Les pages actuelles ne sont pas modifiées.

Hors périmètre, explicitement :

- la bascule elle-même, qui fera l'objet d'un second passage ;
- tout bouton « Réserver » sur le site public ;
- le schéma `Event` par date de stage — vrai gain SEO, autre chantier ;
- la suppression des champs `dates` dans Keystatic : les anciennes pages les
  lisent encore.

## 3. Le partage : faits en base, récit dans Keystatic

La base ne porte pas les tarifs de forfait affichés publiquement — « 33 € ou
55 €/mois » — parce qu'un forfait n'existe en base que rattaché à une personne,
dans `subscriptions`. Elle ne porte pas non plus les descriptions de stage, les
prérequis, ni la cadence annoncée (« 1 à 2 fois par mois, le mardi »).

Ces informations restent dans Keystatic. Les faire entrer en base aurait
demandé des colonnes publiques sur `creneaux` et des écrans d'administration
pour les saisir, c'est-à-dire déplacer la rédaction du site dans un outil qui
n'est pas fait pour ça.

## 4. Mise en service

### Les pages d'aperçu

`/apercu/ateliers-reguliers/`, `/apercu/stages-thematiques/`,
`/apercu/un-apres-midi-couture/`.

Un préfixe plutôt qu'un suffixe `-v2` : le lot tient dans un dossier qu'on
supprime d'un geste à la bascule, et aucune URL bâtarde ne traîne si la
vérification prend trois semaines.

### La non-indexation, en deux verrous

1. `noIndex` passé à `BaseLayout`, qui rend
   `<meta name="robots" content="noindex, follow">`.
2. Exclusion de `/apercu/` du sitemap, via le `filter` d'`@astrojs/sitemap`
   dans `astro.config.mjs`.

Et **pas** de `Disallow` dans `robots.txt` : interdire l'exploration
empêcherait Google de voir le `noindex`, ce qui produit exactement l'inverse du
résultat cherché — une URL connue, jamais lue, susceptible d'apparaître en
résultat sans description.

Aucun lien entrant depuis la navigation. On accède aux pages par leur URL,
qu'on transmet à Isabelle.

### La bascule, plus tard

Le corps de chaque page `/apercu/*` remplace celui de la page réelle,
`src/pages/apercu/` est supprimé, `noIndex` retiré, le `filter` du sitemap
nettoyé. Aucune redirection à écrire : ces URL n'auront jamais été ni indexées
ni liées.

## 5. Architecture

### 5.1 Une vue SQL

```sql
create view v_seances_publiques as
select
  s.id as seance_id,
  s.creneau_id,
  s.starts_at,
  s.ends_at,
  s.location,
  s.unit_price_cents
from sessions s
join creneaux c on c.id = s.creneau_id
where s.status = 'scheduled'
  and c.archived_at is null
  and s.starts_at > now();
```

La jointure ne sert qu'à filtrer : les attributs du créneau — libellé, `kind`,
`audience`, `group_id`, `seances_par_stage`, `default_unit_price_cents` — sont
lus séparément et rapprochés dans le module. Les recopier ici en ferait deux
sources à garder d'accord.

Aucune donnée de réservation n'en sort : le site public n'affiche ni le nombre
de places libres, ni la mention « complet ». La vue ne touche donc jamais
`bookings`, et la question de ce qu'on peut déduire d'un compteur public ne se
pose pas.

Aucun `grant` non plus. La vue se lit côté serveur avec la clé secrète, comme
tout le reste de l'application. `anon` demeure sans accès au schéma `public`,
conformément à `20260729103454_harden_privileges.sql`, et la CSP reste
inchangée puisque le navigateur ne contacte jamais `supabase.co`.

`capacity` est délibérément absente de la vue : ne pas l'exposer évite qu'un
développement ultérieur s'en serve pour recalculer côté page ce qu'on a décidé
de ne pas montrer.

### 5.2 Un module de lecture

`src/utils/catalogue.ts`, strictement côté serveur.

`chargerCatalogue()` fait deux lectures — les créneaux non archivés, puis la
vue — et les assemble en une liste de créneaux portant chacun ses séances à
venir. Les créneaux sans aucune date en font partie : une offre existe même
quand son calendrier n'est pas encore posé.

Les fonctions de mise en forme sont pures et vivent dans le même module :

- `formaterPrix(cents)` → « 40 € », « 32,50 € »
- `fourchette(valeurs, formater)` → « 40 € » si toutes égales, « 33 €–40 € » sinon
- `dureeEnHeures(seance)` → « 3h », « 2h30 »
- `grouperParMois(seances)` → `[{ mois: 'Octobre', jours: [4, 25] }, …]`
- `formaterSeance(seance)` → « Samedi 10 janvier de 14h à 17h »
- `prixDuStage(creneau, seances)` et `dureeDuStage(creneau, seances)` — voir
  § 6, page 2 : la règle diffère selon `seances_par_stage`
- `blocsDeStage(creneau, seances)` → découpe les dates en groupes de
  `seances_par_stage`, dans l'ordre chronologique

### 5.3 Le lien Keystatic → base

Un champ `creneauIds` — une **liste** d'identifiants — sur chaque entrée
`creneaux[]` (ateliers) et `stages[]`, facultatif pour ne pas invalider le
contenu existant.

Une liste, et non un identifiant seul, parce que le cas est déjà là : « Stage
découverte de la couture » est un seul texte sur le site, et deux créneaux en
base depuis `scripts/seed-stages.mjs` — `stage-decouverte-couture-complete` et
`stage-decouverte-couture-courte`. Chacun a son prix, sa durée et ses dates ;
seule la description leur est commune. Un champ simple aurait obligé à
dédoubler la prose, ou à faire disparaître une formule.

Pas de rapprochement implicite par le nom. Les identifiants en base valent bien
`toSlug(label)` pour les ateliers, mais les stages n'ont jamais suivi cette
règle — `stage-sac-tote-bag` face à « Stage sac et tote bag » — et le jour où
Isabelle renomme un créneau depuis l'écran d'administration, un rapprochement
par le nom ferait disparaître son texte sans le moindre signal. Un champ
explicite rend la liaison visible et réparable.

Une entrée Keystatic dont un `creneauId` ne correspond à aucune ligne produit
un `console.warn` — lisible dans les journaux Vercel — et s'affiche sans dates.
Pas de bandeau de diagnostic à l'écran : Isabelle est la première lectrice de
ces pages et n'a pas à y voir passer nos erreurs.

Le cas inverse dégrade tout seul : un créneau créé en base sans texte Keystatic
s'affiche avec son nom, ses dates et son prix, sans description.

## 6. Correspondance, page par page

### Page 1 — Ateliers réguliers

| Affiché | Source |
| --- | --- |
| nom | `creneaux.label` |
| section et pastille de groupe | `creneaux.group_id`, libellés depuis `ATELIER_GROUPS` |
| lieu | `creneaux.default_location` |
| horaires | `creneaux.default_start_time` / `default_end_time` |
| dates, groupées par mois (« Octobre : 4 et 25 ») | vue |
| cadence (« 1 à 2 fois par mois, le mardi ») | Keystatic |
| tarif de forfait et son détail | Keystatic |
| FAQ, introduction, liens croisés | Keystatic |

Les `schemaOffers` restent Keystatic : les forfaits n'existent pas en base.

### Page 2 — Stages thématiques

| Affiché | Source |
| --- | --- |
| nom | `creneaux` où `kind = 'stage'` |
| prix, durée | voir la règle ci-dessous |
| dates (« Samedi 10 janvier de 14h à 17h ») | vue |
| description courte, description longue, prérequis | Keystatic |
| FAQ, introduction, liens croisés | Keystatic |

**Le prix et la durée d'un stage se lisent à deux endroits différents selon
`seances_par_stage`**, et c'est la subtilité principale de cette page.

_Stage au forfait — `seances_par_stage > 1`._ Les dates se vendent ensemble. Le
prix du forfait est porté par `creneaux.default_unit_price_cents` (90 €, 65 €,
65 €) et **les séances valent 0 €**, pour qu'aucune addition ne facture deux
fois le même stage. Lire le prix sur les séances afficherait donc « 0 € ».
La durée est la somme des `seances_par_stage` **premières** dates — c'est le
« 90 € pour 7 h » qu'annonce Isabelle — et non de toutes : un forfait proposé
deux fois dans la saison ne dure pas le double. La logique existe déjà, sous le
nom `heuresDuStage()`, dans `src/pages/espace-membre/admin/creneaux/index.astro` ;
elle rejoint `catalogue.ts` plutôt que d'être recopiée.

Les dates s'affichent par blocs de `seances_par_stage`, dans l'ordre, et jamais
comme des dates indépendantes : les trois matinées du stage découverte forment
une progression — prise en main, tote-bag, trousse — et proposer d'en choisir
une seule serait faux.

_Stage à l'unité — `seances_par_stage = 1`._ Chaque date est une offre à part
entière, à `sessions.unit_price_cents`, et ce prix **varie d'une date à
l'autre** : « Initiation machine à coudre » vaut 40 € pour 3 h le samedi, 33 €
pour 2 h 30 les jeudis soir. Le badge de la carte porte la fourchette
(« 33 €–40 € », « 2h30–3h ») et chaque date affiche son propre prix et sa
propre durée. Les rabattre sur une valeur unique reviendrait à annoncer un
tarif que le visiteur ne paiera pas.

Les `schemaOffers` se déduisent de ces mêmes prix au lieu d'être retapés.

### Page 3 — Un après-midi couture

Un après-midi couture n'est pas une offre distincte : c'est une séance
d'atelier prise à l'unité, hors forfait. C'est très exactement ce que porte
`creneaux.default_unit_price_cents` depuis
`20260730050443_prix_hors_forfait_40_30.sql` — 40 € pour un adulte, 30 € pour
un enfant.

| Affiché | Source |
| --- | --- |
| badge prix (« 30 €–40 € ») | `fourchette` sur `unit_price_cents` des séances d'atelier |
| badge durée (« 2h–3h ») | `fourchette` sur `ends_at − starts_at` |
| badge lieu (« Revel et Verdalle ») | lieux distincts des séances |
| dates adultes, à 40 € | séances des créneaux `kind='atelier'`, `audience='adultes'` |
| dates enfants, à 30 € | séances des créneaux `kind='atelier'`, `audience='enfants'` |
| déroulé, public visé, FAQ | Keystatic |

Deux blocs séparés, chacun annonçant son tarif. La page mentionne déjà « les
enfants accompagnés d'un parent » ; taire les séances enfants alors que la base
en porte le tarif reviendrait à cacher une offre qui existe.

Le prix n'est plus écrit en dur dans le contenu.

## 7. Rendu

`prerender = false` sur les trois pages, avec
`Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`.

Une modification d'Isabelle est visible en cinq minutes, et Vercel continue de
servir la version précédente pendant qu'il revalide. C'est ce qui rend
supportable la dépendance au runtime : une indisponibilité Supabase de quelques
dizaines de secondes n'est vue par personne.

Les dates et heures se formatent en `Europe/Paris`, explicitement. Les
`starts_at` sont des `timestamptz` et Vercel tourne en UTC : sans forçage,
« 14h » deviendrait « 13h » en hiver — une erreur qui n'apparaîtrait qu'à la fin
octobre, sur toutes les pages à la fois.

## 8. Dégradations

**Supabase ne répond pas.** La page rend quand même, en 200, sans ses blocs de
dates, avec « Les prochaines dates sont communiquées sur demande » et le bouton
de contact. L'erreur part dans les journaux Vercel.

Pas de repli sur les dates Keystatic : ce serait rétablir la duplication qu'on
supprime, et ces champs disparaîtront à la bascule — le repli pourrirait sans
que personne s'en aperçoive.

**Un créneau n'a aucune date à venir.** Même message, délibérément. Du point de
vue du visiteur c'est la même situation, et lui proposer deux formulations
différentes n'apporterait rien.

## 9. Tests

`src/utils/__tests__/catalogue.test.ts`, sur les fonctions pures :

- regroupement par mois, dans l'ordre chronologique et non alphabétique ;
- effondrement d'une fourchette : une seule valeur donne « 40 € », plusieurs
  donnent « 33 €–40 € » ;
- formatage des prix, y compris un montant à centimes ;
- formatage d'une séance à cheval sur le changement d'heure, pour vérifier que
  `Europe/Paris` est bien appliqué et non l'heure du serveur ;
- `prixDuStage` : un stage au forfait rend le prix du créneau et **jamais**
  « 0 € », un stage à l'unité rend la fourchette de ses séances ;
- `dureeDuStage` : un forfait de trois matinées proposé deux fois dans la saison
  rend 7 h, et non 14 h ;
- `blocsDeStage` : six dates et `seances_par_stage = 3` donnent deux blocs de
  trois, chronologiques.

L'assemblage `chargerCatalogue()` n'est pas testé contre une vraie base : la
vérification passe par les pages d'aperçu, qui existent pour ça.

## 10. Décisions et raisons

| Décision | Raison |
| --- | --- |
| SSR plutôt que lecture au build | Isabelle voit ses modifications sans attendre le rebuild de 8 h. Le cache CDN absorbe le risque. |
| Aucune donnée de disponibilité en public | Décidé après coup : ni compteur, ni « complet ». La vue ne lit donc jamais `bookings`. |
| Pages d'aperçu non indexées | Isabelle valide sur des URL réelles sans exposer un état intermédiaire au référencement. |
| Vue SQL plutôt que jointures dans le code | Le filtrage (futur, non annulé, non archivé) est écrit à un seul endroit. |
| `creneauIds` explicite, et une liste | Un rapprochement par le nom casserait au premier renommage ; « Stage découverte » est déjà un texte pour deux créneaux. |
| Prix du stage lu selon `seances_par_stage` | Les séances d'un forfait valent 0 € en base pour ne pas se cumuler ; les lire afficherait « 0 € » au public. |

## 11. Dépendance

Cette spécification suppose acquis le travail en cours sur la branche
`feat/stages-reservables` : la colonne `creneaux.seances_par_stage`
(`20260730063312_seances_par_stage.sql`, non encore commitée à la rédaction de
ce document) et le portage du prix de forfait sur le créneau par
`scripts/seed-stages.mjs`. Le § 6 de la page 2 n'a pas de sens sans elles.
