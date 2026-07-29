# SPEC — Abonnements et crédits de séances

**Statut :** spécification du modèle de domaine — non implémenté
**Date :** 2026-07-29
**Complète :** `DOCS/PRD-espace-membre.md`

Ce document définit exactement comment un abonnement donne droit à des séances, comment ces séances se consomment, et ce qui se passe dans chaque cas limite. C'est la partie du système où une ambiguïté coûte cher : un solde faux est visible par l'adhérent et indéfendable.

---

## 1. Vocabulaire

| Terme | Définition |
| --- | --- |
| **Compte** | Une identité de connexion : une adresse e-mail. Ne vient pas à l'atelier. |
| **Participant** | La personne qui vient à l'atelier. Appartient à un compte. |
| **Créneau** | Un rendez-vous récurrent : « jeudi après-midi, Revel, 14h–17h ». Un horaire, pas un produit. |
| **Séance** | Une occurrence datée d'un créneau : « jeudi 9 octobre 2026, 14h–17h, Revel, 6 places ». |
| **Abonnement** | Un contrat de saison attaché à un **participant** : tant de séances par mois, à tel prix, à partir de telle date. |
| **Crédit** | Le droit d'assister à une séance. **Jamais stocké** — toujours calculé. |
| **Réservation** | Le lien entre un **participant** et une séance datée. Consomme un crédit tant qu'elle est active. |

Deux points centraux.

**Un abonnement ne réserve pas un créneau, il octroie des crédits.** Les crédits sont fongibles — utilisables sur n'importe quel créneau, sur les deux sites. Le créneau d'origine de l'abonnement ne sert qu'à l'auto-inscription.

**Le compte et le participant ne sont pas la même chose.** Une mère inscrit ses deux filles au créneau enfants du samedi : un compte, deux participants, deux abonnements, deux soldes indépendants. Une adulte qui vient pour elle-même : un compte, un participant — le cas courant, et l'interface ne lui montre jamais la distinction.

### Pourquoi dès la v1

Confondre les deux revient à faire de l'adresse e-mail la clé du participant. Deux enfants dans la même famille deviennent alors impossibles à représenter sans inventer des adresses factices (`marie+lea@…`), avec des soldes, des réservations et des e-mails de rappel attachés à la mauvaise personne.

Séparer plus tard suppose de scinder chaque ligne existante, de réaffecter tous les abonnements et toutes les réservations, et de reconstruire les identités d'authentification : une migration non rétrocompatible sur des données réelles de saison en cours. Le surcoût aujourd'hui est d'une table et d'une clé étrangère.

## 1 bis. Comptes et participants

```text
accounts     (id, auth_user_id, email unique, phone, created_at)
participants (id, account_id NULLABLE, first_name, last_name, birthdate, notes)
```

- L'**authentification** (code à 6 chiffres ou Google) porte sur `accounts.email`. Un participant n'a ni adresse e-mail ni mot de passe.
- Les **abonnements**, les **réservations** et le **solde** portent sur `participants`. Chaque enfant a son propre solde.
- Un compte peut porter le parent **et** ses enfants comme participants distincts, chacun avec son abonnement.
- Si le compte n'a qu'un seul participant, l'interface n'affiche **aucun sélecteur** : l'adulte ordinaire ne voit jamais la notion. Au-delà d'un participant, un sélecteur apparaît partout où le solde et les réservations sont affichés.

### `account_id` est nullable, et c'est central

**Un participant peut exister sans aucun compte.** C'est le cas de toute personne qui ne se servira jamais du site : Isabelle la crée, lui affecte un abonnement, réserve et libère ses places à sa place. Elle vient à l'atelier exactement comme les autres, avec son solde et ses crédits, sans jamais avoir donné d'adresse e-mail.

Ce n'est pas un cas marginal. Une part des adhérentes ne voudra pas d'un compte, et exiger une adresse e-mail pour exister dans le système forcerait à inventer des adresses factices — précisément le défaut que la séparation compte/participant sert à éviter.

Conséquences directes :

- **Isabelle crée des participants indépendamment des comptes.** Trois gestes distincts à l'admin : créer un participant seul, créer un compte seul, rattacher un participant existant à un compte.
- **Aucun e-mail** n'est envoyé pour un participant sans compte — ni confirmation, ni rappel J-2. Isabelle le sait et prévient ces personnes comme elle le fait aujourd'hui. L'écran d'admin **signale visiblement** les participants sans compte, pour qu'un silence ne passe pas pour un oubli du système.
- **Le rattachement ultérieur ne perd rien.** Le jour où une adhérente veut un accès, on crée un compte et on lui rattache le participant existant : historique, abonnements, réservations et solde sont conservés, puisque tout est déjà porté par le participant.
- **M1 ne nécessite aucun compte.** Isabelle peut mener une saison entière avec la table `accounts` vide. L'authentification des adhérents (M2) devient un ajout, jamais un prérequis.

Les **e-mails** (confirmation, rappel J-2) partent vers `accounts.email` quand il y en a un, en nommant le participant concerné : « Rappel : Léa a séance jeudi 9 octobre à 10h ».

**Risque résiduel assumé :** `participants.account_id` est une clé étrangère simple, donc un participant appartient à **au plus un** compte. Deux parents séparés voulant chacun leur accès, ou un adolescent qui prendrait son propre compte, exigeraient une table de liaison `account_participants`. C'est peu probable ici et l'ajouter plus tard reste une migration de données additive, sans réécriture des abonnements ni des réservations — contrairement à la séparation compte/participant elle-même. Si le cas est jugé plausible dès maintenant, la table de liaison coûte une demi-heure de plus.

## 2. L'abonnement

```text
subscriptions (
  id, participant_id,
  season               -- '2026-2027'
  home_creneau_id      -- créneau d'origine, pour l'auto-inscription
  credits_per_month    -- 1 ou 2 (0 possible : voir §8)
  monthly_price_cents  -- ce qui est dû chaque mois, indicatif
  starts_on, ends_on   -- fenêtre de droits
  helloasso_order_id   -- nullable, purement traçabilité
)
```

Un participant peut avoir **plusieurs abonnements sur une même saison** — c'est ainsi qu'on gère un changement de formule en cours d'année (§6). Le solde s'additionne sur tous ses abonnements de la saison.

Un abonnement appartient à un **participant**, jamais à un compte. Deux sœurs sur le créneau enfants ont deux abonnements distincts, deux soldes distincts, et l'une peut changer de formule sans toucher à l'autre.

## 3. Le crédit n'est pas stocké

Il n'existe ni table de grand-livre, ni colonne `balance`, ni tâche mensuelle d'attribution. Le solde est une fonction de deux faits déjà en base :

```text
Le solde se calcule **par participant**, jamais par compte.

```text
octroyé(p, t)  = Σ sur les abonnements de la saison DU PARTICIPANT p :
                    credits_per_month × mois_octroyés(abonnement, t)

consommé(p, t) = nombre de réservations actives (status = 'booked')
                 du participant p sur des séances de la saison

solde(p, t)    = octroyé(p, t) − consommé(p, t)
```

**Pourquoi c'est important.** Un solde stocké dérive : une réservation annulée sans écriture compensatoire, un job mensuel qui tourne deux fois, une migration qui rejoue des lignes — et le chiffre affiché ne veut plus rien dire, sans moyen de le prouver. Ici, le solde est recalculable à tout instant depuis les deux seules sources de vérité. Il ne peut pas être faux ; il peut seulement être mal calculé, ce qu'un test attrape.

Le **report de saison est une conséquence arithmétique, pas une fonctionnalité.** Il n'y a rien à implémenter pour qu'un crédit d'octobre soit utilisable en mars.

### `mois_octroyés`

L'octroi a lieu au **premier jour de chaque mois civil**, du mois de `starts_on` au mois de `ends_on` inclus.

```text
mois_octroyés(abo, t) = mois_entre( mois(abo.starts_on),
                                    mois(min(t, abo.ends_on)) ) + 1
                        borné à 0 si t < starts_on
```

**Un mois entamé est un mois dû en entier.** Pas de prorata, pas de demi-crédit. Isabelle règle `starts_on` sur le mois où l'adhérent commence réellement.

## 4. Exemple chiffré

Abonnement : `starts_on = 2026-10-01`, `ends_on = 2027-06-30`, `credits_per_month = 2`.

| Date | Mois octroyés | Octroyé | Réservations actives | Solde |
| --- | --- | --- | --- | --- |
| 15 oct. 2026 | 1 | 2 | 2 (ses 2 jeudis) | 0 |
| 15 nov. 2026 | 2 | 4 | 3 (a libéré un jeudi) | 1 |
| 15 déc. 2026 | 3 | 6 | 4 | 2 |
| 10 janv. 2027 | 4 | 8 | 9 (rattrapage + 1 en trop) | −1 |
| 30 juin 2027 | 9 | 18 | 16 | 2 |
| 15 juill. 2027 | 9 (figé) | 18 | 16 | 2 → **perdu** |

Deux enseignements lisibles dans ce tableau :

- En novembre, le solde monte à 1 **parce qu'une séance a été libérée**, pas parce qu'elle n'a pas été honorée (§5).
- En janvier, le solde passe à −1 : c'est autorisé, et cela produit une ligne à facturer (§7).

## 5. Les trois règles qui font tout le comportement

### Règle 1 — Une réservation active consomme, une réservation libérée ne consomme plus

`consommé` est un **compte de réservations actives**, pas un journal de débits. Annuler ne demande aucune écriture compensatoire : la réservation passe à `released`, elle sort du compte, le crédit revient. Il n'existe aucun chemin de code où un crédit puisse être « rendu deux fois ».

### Règle 2 — Capitaliser exige de libérer sa place

Ne pas venir sans prévenir **consomme quand même le crédit.** La place était tenue, personne d'autre n'a pu la prendre.

C'est la règle la plus importante à expliquer aux adhérentes, et la seule qui rende la capacité signifiante : sans elle, une séance affiche complet pendant que la salle est à moitié vide. Elle crée la bonne incitation — libérer sa place, ce qui la rend disponible et met le crédit de côté.

Isabelle peut toujours passer outre : libérer a posteriori une réservation passée rend le crédit (§9).

### Règle 3 — Le découvert est autorisé et signalé

Réserver à solde nul ou négatif **réussit**. Le solde descend sous zéro et alimente une liste à facturer.

Bloquer serait plus simple à coder et faux en pratique : quelqu'un qui veut venir une fois de plus doit pouvoir le faire, quitte à payer. L'interface le dit clairement au moment de réserver — « séance supplémentaire, 25 € à régler avec Isabelle » — plutôt que d'opposer un refus.

### Quand c'est l'atelier qui annule

Une séance annulée par Isabelle (vacances, maladie, effectif insuffisant) **libère toutes ses réservations** : les crédits reviennent intégralement.

C'est la seule exception à la règle 2, et elle est évidente : le crédit n'est consommé que si la place a réellement été tenue à disposition. Elle ne l'a pas été. Les réservations passent à `released` — ce qui les rend au passage invisibles à l'auto-inscription (§9), donc aucune ne ressuscitera sur une séance annulée.

## 6. Changer de formule en cours de saison

**Ne jamais modifier `credits_per_month` d'un abonnement existant.** Cela réécrirait rétroactivement l'octroi de tous les mois passés, y compris ceux déjà consommés.

À la place : clore l'abonnement en cours et en créer un second.

> Passage de 1 à 2 séances/mois au 1er janvier :
> abonnement A `2026-10-01 → 2026-12-31`, `credits_per_month = 1` → 3 crédits
> abonnement B `2027-01-01 → 2027-06-30`, `credits_per_month = 2` → 12 crédits
> octroyé sur la saison = 15

Le solde sommant tous les abonnements de la saison, la transition est exacte et l'historique est conservé. Une interruption se modélise de la même façon : deux abonnements avec un trou entre les deux, et aucun crédit octroyé pendant le trou.

## 6 bis. Arrêter un abonnement en cours de saison

Quelqu'un ne peut plus payer et souhaite arrêter. Deux choses doivent cesser, et elles sont **indépendantes** :

1. **L'argent** — le prélèvement mensuel, côté HelloAsso.
2. **Les droits** — l'octroi de crédits, côté application.

N'en faire qu'une seule produit exactement le mauvais résultat : arrêter le prélèvement sans toucher à l'abonnement donne des séances gratuites jusqu'en juin ; arrêter les droits sans le prélèvement continue de débiter quelqu'un qui n'a plus rien.

### Côté application

**Avancer `ends_on` au dernier mois payé.** C'est tout. Aucun état « résilié », aucune colonne supplémentaire : l'octroi cesse à cette date par la même arithmétique que partout ailleurs, et le mécanisme est identique à celui du changement de formule (§6).

Un mois entamé reste dû en entier (§3) : une résiliation le 12 janvier fixe `ends_on` au 31 janvier, et le crédit de janvier est octroyé.

### Les crédits déjà payés ne sont pas perdus

C'est la conséquence la plus importante, et elle est correcte par construction.

> Payé d'octobre à janvier, 2 crédits/mois → 8 crédits octroyés.
> 3 séances honorées → **solde de 5**.
> Ces 5 séances ont été payées. Elles restent utilisables jusqu'au 30 juin.

Le solde reste positif, les réservations restent possibles, et la personne vient épuiser ce qu'elle a déjà acheté. Rien à coder : arrêter un abonnement gèle l'octroi, cela ne confisque pas l'acquis. Confisquer demanderait au contraire un traitement spécial, qu'il ne faut pas écrire — on ne reprend pas ce qui a été payé.

Si le solde est **négatif** au moment de l'arrêt, la personne doit des séances supplémentaires : elles apparaissent normalement en facturation (§7).

### Libérer les places, mais pas toutes

À l'arrêt, il faut libérer les réservations futures — sinon des places restent tenues jusqu'en juin par quelqu'un qui ne viendra pas. Mais pas indistinctement :

- **Les réservations `source = 'auto'` postérieures à `ends_on` sont libérées.** La personne ne les a pas choisies, l'auto-inscription les a créées pour elle.
- **Les réservations `source = 'member'` ou `'admin'` sont conservées.** Elles ont été posées délibérément, et le solde restant les couvre. Les annuler d'office reviendrait à décider à la place de quelqu'un qui a payé.

L'auto-inscription ne reprendra pas : elle ne traite que les abonnements dont la fenêtre couvre le mois considéré (§9).

### Ce qui n'est pas une question technique

**Le remboursement des crédits non utilisés.** Le modèle propose par défaut de ne rien rembourser et de laisser les crédits utilisables jusqu'au 30 juin. C'est une décision de l'association, pas du logiciel — si Isabelle préfère rembourser, cela se fait hors application, et l'abonnement est alors clos avec `ends_on` au dernier mois **réellement dû**.

**L'adhésion annuelle de 15 €** aux P'tits Piafs n'est pas concernée : c'est une cotisation d'association, acquise pour la saison.

## 7. Extras et facturation

```text
séances_supplémentaires(p) = max(0, −solde(p))
```

Chaque séance porte un `unit_price_cents` — le prix d'y assister sans crédit. L'écran d'admin liste les participants à solde négatif avec le détail des séances concernées et le total dû.

**Le décompte est par participant, le règlement par compte.** C'est le parent qui paie pour ses deux filles : la liste à facturer est donc groupée par compte, avec le détail par participant en dessous, et un total par compte. Ne jamais additionner les soldes de plusieurs participants en un seul chiffre — un solde positif de l'une masquerait le découvert de l'autre.

### Quelles séances sont les séances supplémentaires

Le solde est un nombre agrégé : il dit *combien* de séances dépassent, jamais *lesquelles*. Or les séances n'ont pas toutes le même `unit_price_cents` — 25 € le jeudi soir, davantage ailleurs. Facturer exige donc une règle déterministe.

**Les crédits se consomment dans l'ordre chronologique des séances.** On parcourt les réservations actives du participant par date de séance croissante, en maintenant un solde courant : à chaque réservation, l'octroi acquis à la date de cette séance moins les réservations déjà parcourues. Une réservation qui ferait passer ce solde courant sous zéro est une **séance supplémentaire**, facturée au `unit_price_cents` de sa propre séance.

C'est la seule règle à la fois explicable à une adhérente — « vos crédits couvrent vos séances dans l'ordre, au-delà c'est payant » — et stable : elle ne dépend ni de l'ordre de saisie, ni de la date à laquelle on regarde.

Elle tient compte du report : une séance du 9 octobre ne peut pas être couverte par un crédit octroyé en mars. C'est l'octroi **à la date de la séance** qui compte, pas l'octroi total de la saison.

### Régler ces séances en ligne (jalon ultérieur)

**HelloAsso Checkout est fait pour ça** : une intention de paiement d'un montant arbitraire, sans catalogue ni campagne préalable, sans frais. C'est même le meilleur usage de HelloAsso dans tout ce projet — mieux ajusté que la campagne d'adhésion, parce qu'un montant ad-hoc est exactement ce qu'un checkout sait faire et ce qu'une campagne ne sait pas faire.

Le flux : l'application calcule le dû, crée une intention de paiement côté serveur (`itemName` « 2 séances supplémentaires », montant en centimes, `metadata` portant les identifiants des réservations concernées), redirige, puis **réconcilie via le webhook ou l'API** — jamais en faisant confiance aux paramètres de l'URL de retour, que la documentation HelloAsso signale comme falsifiables.

Ce que cela suppose d'ajouter, le moment venu :

- une table `charges` (montant, statut, `helloasso_checkout_intent_id`, `helloasso_order_id`, `paid_at`) et son lien vers les réservations couvertes ;
- le client API de `src/utils/helloasso.ts`, déjà prévu au plan HelloAsso ;
- un compte HelloAsso vérifié — le seul vrai prérequis.

**C'est un ajout purement additif** : une table et un écran, aucune modification du modèle de crédits. Rien n'est à décider maintenant, sinon la règle chronologique ci-dessus, qui relève du domaine et non du paiement.

Réserve honnête : à 25 € quelques fois par saison, un lien de paiement est peut-être plus lourd que de demander la somme de vive voix. La liste à facturer de l'admin a de la valeur dans tous les cas ; le paiement en ligne, seulement si le volume le justifie.

Cela couvre trois situations avec un seul mécanisme : l'adhérent abonné qui vient une fois de plus, l'adhérent au créneau payé à la séance (§8), et le visiteur ponctuel.

## 8. Cas particuliers

**Le créneau payé à la séance** — le jeudi fin de journée est à 25 € la séance, sans abonnement mensuel. Modélisé par un abonnement à `credits_per_month = 0` : l'octroi est nul, chaque réservation fait descendre le solde, et **toute** réservation apparaît en facturation. Aucun code spécifique.

**Arrivée en cours de mois** — `starts_on` au 12 novembre octroie le crédit de novembre en entier. Volontairement généreux, et sans fraction à gérer.

**Fin de saison** — après `ends_on`, l'octroi cesse. Les crédits non consommés **expirent au 30 juin** et ne passent pas à la saison suivante. Une nouvelle saison est un nouvel abonnement, solde reparti de zéro. À dire explicitement aux adhérentes en début d'année.

**Les enfants** — le créneau enfants du samedi n'a besoin d'aucun traitement spécifique : l'enfant est un **participant**, rattaché au compte d'un parent (§1 bis). Deux sœurs sur un même compte ont deux abonnements, deux soldes et deux jeux de réservations indépendants. Le parent se connecte une fois et bascule de l'une à l'autre.

Un mineur n'a ni compte ni adresse e-mail : toute la correspondance passe par `accounts.email`, en nommant l'enfant concerné. `participants.birthdate` est renseignée pour les mineurs — utile pour vérifier l'éligibilité au créneau enfants et pour les besoins de l'association ; facultative pour les adultes.

## 9. L'auto-inscription

Un job idempotent, exécuté quotidiennement sur un horizon glissant de 60 jours. Pour chaque abonnement actif et chaque mois de l'horizon :

1. Lister les séances du `home_creneau_id` dans ce mois, par date croissante.
2. Écarter celles pour lesquelles il existe **déjà une ligne `bookings`**, quel que soit son statut.
3. Écarter celles qui sont complètes.
4. Réserver les `credits_per_month` premières restantes, avec `source = 'auto'`, **tant que le solde reste ≥ 0**.

### Les quatre points qui comptent

**Les lignes libérées sont des pierres tombales.** L'étape 2 regarde `booked` *et* `released`. Sans cela, libérer sa place le lundi la verrait réapparaître le mardi — le bug le plus certain de tout ce système. C'est aussi la raison pour laquelle une réservation annulée n'est jamais supprimée.

**Le job respecte le droit mensuel, pas le calendrier.** Un forfait 1 séance/mois sur un créneau qui en propose 2 ne produit qu'une réservation par mois.

**Le job ne crée jamais de découvert.** L'étape 4 s'arrête à solde nul. Un participant qui a dépensé ses crédits ailleurs n'est pas auto-inscrit chez lui par-dessus.

**Le job raisonne par participant.** Deux sœurs sur le même créneau et le même compte produisent deux réservations distinctes sur chaque séance — et consomment donc deux places. La capacité se compte en participants, jamais en comptes.

**Le job est rejouable.** Le relancer dix fois de suite ne change rien. C'est ce qui permet de le faire tourner tous les jours, d'ajouter des séances en cours de saison, et de créer un adhérent en janvier sans traitement de rattrapage particulier.

### Le conflit de réservation

Un adhérent auto-inscrit à ses deux jeudis qui réserve ensuite un samedi passe à −1. Ce n'est pas un bug : il a trois places tenues pour deux crédits. L'interface le traite au moment de réserver — « vous avez déjà 2 séances réservées ce mois-ci » — et propose de libérer une des réservations existantes dans le même geste. S'il choisit de garder les trois, la troisième est facturée.

## 10. Ce qui n'est délibérément pas modélisé

**La présence effective.** Réserver vaut consommation ; il n'y a pas d'état « venu / pas venu ». Isabelle coche une feuille de présence si elle le souhaite, mais le système ne s'en sert pas. Ajouter un état `attended` viendra si le besoin s'en fait sentir — et ce sera additif.

**Les paiements.** `monthly_price_cents` dit ce qui est **dû**, jamais ce qui est **reçu**. Tant que HelloAsso n'encaisse pas, personne dans le système ne sait qui est à jour. Décision assumée, argumentée dans `DOCS/PRD-espace-membre.md` §6.

**La liste d'attente.** Une séance complète n'est pas réservable, et rien ne prévient quand une place se libère.

## 11. Ce que les tests doivent prouver

- `mois_octroyés` aux bornes : la veille de `starts_on` (0), le jour même (1), le dernier jour de `ends_on` (n), le lendemain (n, figé).
- Annuler puis re-réserver la même séance laisse le solde inchangé.
- Un no-show ne rend pas le crédit ; une libération a posteriori par l'admin le rend.
- Annuler une séance rend son crédit à **tous** ses participants, et l'auto-inscription ne recrée aucune réservation dessus.
- Réduire la capacité d'une séance sous le nombre de réservations actives échoue, sans en supprimer aucune.
- Deux abonnements successifs sur une saison somment correctement, y compris avec un trou entre les deux.
- L'auto-inscription est idempotente : deux exécutions consécutives produisent zéro nouvelle ligne.
- L'auto-inscription ne ressuscite jamais une réservation libérée.
- L'auto-inscription ne rend jamais le solde négatif.
- `credits_per_month = 0` : toute réservation apparaît en facturation.
- Identification des extras : avec des séances à prix unitaires différents, les réservations facturées doivent être les dernières dans l'ordre chronologique, et le total doit utiliser le `unit_price_cents` de chaque séance concernée — pas un prix moyen ni celui de la première.
- L'identification des extras ne dépend pas de l'ordre d'insertion : créer les réservations dans le désordre puis dans l'ordre doit produire la même facture.
- Une séance ancienne ne peut pas être couverte par un crédit octroyé après elle : réserver le 9 octobre alors que l'octroi d'octobre est déjà consommé doit produire une séance supplémentaire, même si le solde de fin de saison est positif.
- Capacité : la (N+1)ᵉ réservation sur une séance de N places échoue, y compris sous deux requêtes simultanées.
- Le solde est identique qu'il soit calculé en SQL ou reconstitué à la main depuis les lignes brutes.

### Comptes et participants

- Deux participants sur un même compte ont des soldes **indépendants** : consommer tous les crédits de l'une ne change pas celui de l'autre.
- Les deux sœurs inscrites à la même séance occupent **deux places** : une séance de 6 places est complète après 6 participants, quel que soit le nombre de comptes.
- L'index unique porte sur `(session_id, participant_id)` : la même sœur ne peut pas être réservée deux fois, mais les deux sœurs le peuvent.
- Un compte à un seul participant ne déclenche **aucun** sélecteur dans l'interface.
- Un compte ne peut ni voir ni réserver pour un participant qui ne lui appartient pas — vérifié par une politique RLS, pas seulement par le code applicatif.
- Un participant sans abonnement a un solde de 0 et non une erreur.
- Le changement de formule d'une sœur ne modifie ni le solde ni les réservations de l'autre.

### Participants sans compte

- Un participant à `account_id = NULL` peut recevoir un abonnement, être auto-inscrit, réservé et libéré par l'admin, et son solde se calcule normalement.
- Aucun e-mail n'est produit pour un participant sans compte — vérifié en comptant les envois, pas seulement en constatant l'absence d'erreur.
- Rattacher a posteriori un participant à un compte **ne modifie ni son solde, ni ses abonnements, ni ses réservations** : comparer les trois avant et après.
- Une saison complète — création, abonnements, auto-inscription, réservations, facturation — doit se dérouler avec la table `accounts` **vide**.
