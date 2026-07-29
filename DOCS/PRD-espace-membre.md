# PRD — Espace membre : réservation de séances

**Statut :** design validé, découpé en jalons — non implémenté
**Date :** 2026-07-29

---

## 1. Problème

Les ateliers réguliers sont vendus au mois (25–55 €/mois, septembre → juin), mais la présence est flexible : un adhérent a droit à 1 ou 2 séances par mois et peut venir à **n'importe quel créneau, sur les deux sites** (Revel et Verdalle). Une séance non utilisée est **reportée jusqu'à la fin de la saison**.

Aujourd'hui, rien de tout cela n'est outillé. Isabelle coordonne chaque échange par téléphone ou message, tient les comptes de tête, et n'a aucune garantie qu'une séance ne sera pas surchargée.

Le modèle de contenu actuel ne peut même pas exprimer le problème : un créneau est à la fois le produit, l'horaire et la capacité, et les dates sont du texte libre (`dates` dans `src/content/pages/ateliers-reguliers/index.yaml`).

### Ce qui a été écarté, et pourquoi

Les logiciels de réservation de cours font tout cela nativement, mais aucun ne passe la double contrainte **français + budget**. Le moins cher correctement localisé est SimplyBook.me à 29,90 €/mois ; les outils métier français (Deciplus 69 €, Bsport ~150 €) sont conçus et tarifés pour des salles de sport. Les outils anglo bon marché (TeamUp ~$26, Momoyoga) ne sont pas localisés — rédhibitoire pour des adhérentes rurales, souvent âgées. Budget disponible : **5 €/mois maximum**.

À ce volume — **une vingtaine d'adhérents**, environ 35 réservations et 70 e-mails par mois — une application sur mesure coûte **0 €/mois** d'infrastructure : les paliers gratuits de Supabase et Resend sont dépassés de plusieurs ordres de grandeur. Le coût est le temps de développement, pas l'abonnement.

Ce chiffre doit rester présent à l'esprit dans tout le reste du document : à cette échelle, presque toute mécanique défensive (files d'attente, garde-fous de quota, optimisation de requêtes, montée en charge) est du travail inutile. Ce qui compte est la **justesse du modèle** et la **clarté pour Isabelle**, jamais le volume.

## 2. Les deux quantités

Toute la conception découle de la séparation de deux choses que le contenu actuel confond :

- **Le droit** — « 2 séances par mois », attaché à la *personne*, consommé dans le temps
- **L'occupation** — « 6 places le 9 octobre », attachée à la *séance datée*

Une fois qu'on réserve **par séance** et non par créneau, la flexibilité tombe toute seule : décaler, changer de créneau, sauter une séance, rattraper — c'est la même opération. Aucun cas particulier.

## 3. Décisions produit

| Décision | Choix | Conséquence |
| --- | --- | --- |
| Inscription | **Auto-inscrit, désinscription volontaire** | L'adhérent n'agit que s'il ne peut pas venir. Ceux qui ne changent jamais rien n'ont rien à faire. |
| Portée | Tout créneau, les deux sites | Les séances sont des crédits fongibles. |
| Report | Jusqu'à fin juin | Le solde s'accumule sur la saison. |
| Annulation | Libre, le crédit revient | Aucune règle punitive. Une place libérée tardivement reste perdue — accepté. |
| Dépassement | Autorisé, signalé | Réserver à solde nul est possible : « séance supplémentaire, 25 € à régler avec Isabelle ». Isabelle obtient une liste à facturer. |
| Capacité | Bloquante | Contrainte physique (machines, place). Complet = non réservable. Pas de liste d'attente en v1. |
| Calendrier | Base de données + écran d'admin | Les séances datées avec capacité sont des données, pas du contenu. |

### Le solde n'est pas stocké

> Le modèle complet — arithmétique, cas limites, règles d'auto-inscription — est spécifié dans **`DOCS/SPEC-abonnements-credits.md`**. Résumé ci-dessous.

```text
octroyé = crédits_par_mois × mois_écoulés(début → mois courant, plafonné à fin)
consommé = réservations actives de la saison
solde    = octroyé − consommé
```

Le report est une conséquence arithmétique, pas une fonctionnalité. Pas de table de grand-livre, pas de tâche mensuelle d'attribution, pas de dérive possible entre le solde affiché et la réalité.

L'auto-inscription respecte le droit mensuel : pour chaque mois, on réserve les `crédits_par_mois` premières séances du créneau d'origine — pas toutes. Un adhérent au forfait 33 € (1 séance/mois) sur un créneau qui en propose 2 n'est auto-inscrit qu'à une seule.

## 4. Architecture

**Rendu hybride.** Les pages publiques restent prérendues. Seul `/espace-membre/**` passe en `export const prerender = false`. Le projet a déjà l'adaptateur Vercel et une fonction serverless (Keystatic) — le surcoût d'infrastructure est nul.

**Tout l'accès Supabase se fait côté serveur.** Aucune requête JavaScript vers `supabase.co` depuis le navigateur. Conséquences :

- **Aucune modification de CSP.** `src/config/csp.js` et son test CI (`src/utils/__tests__/csp.test.ts`) sont intacts. La connexion Google fait sortir le navigateur du site par une navigation de premier niveau (vers `accounts.google.com`, puis retour) — une navigation n'est contrainte ni par `connect-src` ni par `form-action`, contrairement à une requête `fetch` ou à un `<iframe>`. C'est aussi pourquoi on utilise la redirection Google et non Google One Tap, qui exigerait `frame-src`.
- Formulaires HTML classiques, POST vers des routes Astro. Fonctionne sans JavaScript, ce qui compte sur des connexions rurales et des navigateurs anciens.

### Deux moyens de connexion

**Code à 6 chiffres par e-mail** — le chemin principal. Pas de lien magique : les scanners antivirus de certains fournisseurs préchargent les liens des e-mails et consomment les liens magiques avant l'adhérent. Un code fonctionne aussi quand l'e-mail est ouvert sur le téléphone et le site sur l'ordinateur.

**« Continuer avec Google »** — le chemin rapide, via le fournisseur OAuth de Supabase. Flux PKCE : la route Astro génère l'URL d'autorisation, redirige, et échange le `code` du retour contre une session **côté serveur**. Aucun jeton ne transite par du JavaScript client.

C'est un **ajout, pas un remplacement**. Une part importante des adhérentes rurales est sur `orange.fr`, `free.fr` ou `wanadoo.fr`, pour qui le bouton Google ne sert à rien. Les deux moyens restent proposés côte à côte, sans hiérarchie visuelle marquée.

**Rattachement du compte.** L'identité d'authentification (Google ou e-mail) est reliée à la ligne `accounts` en comparant l'adresse e-mail lors de la première connexion. Google fournit des e-mails vérifiés, donc le rattachement automatique est sûr. Si aucune ligne `accounts` ne correspond — typiquement une adhérente dont le compte Google porte une autre adresse que celle donnée à Isabelle — l'application **ne crée ni compte ni participant** : elle affiche « Compte non reconnu, contactez Isabelle » et l'écran d'admin permet de rattacher l'identité au bon compte. C'est le cas d'erreur le plus probable en septembre ; il est traité explicitement, pas laissé au hasard.

Une fois connecté, le compte accède à **tous ses participants** et à eux seuls — garanti par une politique RLS sur `participants.account_id`, pas uniquement par la logique applicative.

### Le rôle administrateur

`accounts.role` — `'member'` par défaut, `'admin'` pour Isabelle et l'administrateur technique. Deux adresses connues d'avance, insérées par une migration d'amorçage : les comptes admin **préexistent** donc à la première connexion, et le message « Compte non reconnu » ne les concerne pas.

Trois points qui comptent :

- **Le rôle est lu en base, jamais dans un jeton ou un cookie.** Chaque route d'admin le revérifie côté serveur. Un rôle transporté par le client est un rôle falsifiable.
- **Les politiques RLS sont adossées au rôle**, pas seulement les routes. Une route oubliée ne doit pas suffire à exposer les données de tout le monde.
- **Un compte admin n'a pas besoin de participant.** Isabelle administre sans venir consommer des crédits ; un compte à zéro participant est un état valide, déjà permis par le modèle.

Pas d'écran de gestion des rôles en v1 : deux adresses, une migration. Le jour où il en faudrait un troisième, une ligne SQL suffit.

**Configuration manuelle requise** (hors CLI) : créer un client OAuth dans Google Cloud Console et déclarer l'URI de redirection autorisée `https://<projet>.supabase.co/auth/v1/callback`, puis coller l'ID et le secret dans le tableau de bord Supabase. Ce n'est pas provisionnable par `vercel integration add`.

**Supabase envoie ses e-mails via Resend** (SMTP personnalisé). Le SMTP par défaut de Supabase est plafonné à quelques envois par heure — inutilisable en septembre.

**RLS activé.** Les routes membre utilisent la session de l'utilisateur (clé anon) et les politiques RLS font foi. Seules les routes d'admin utilisent la clé de service. La sécurité ne repose pas uniquement sur la logique applicative.

### Schéma

```sql
accounts      (id, auth_user_id, email unique, phone, notes)
participants  (id, account_id NULLABLE, first_name, last_name, birthdate, notes)
subscriptions (id, participant_id, season, credits_per_month, home_creneau_id,
               monthly_price_cents, starts_on, ends_on, helloasso_order_id)
creneaux      (id text pk, label, group_id,
               default_start_time, default_end_time, default_location,
               default_capacity, default_unit_price_cents)
sessions      (id, creneau_id, starts_at, ends_at, location, capacity,
               unit_price_cents, status)
bookings      (id, session_id, participant_id, source, status,
               created_at, released_at)
```

- **Le compte se connecte, le participant vient à l'atelier.** Un adulte ordinaire = un compte, un participant, et l'interface ne montre jamais la distinction. Une mère et ses deux filles = un compte, deux ou trois participants, chacun avec son abonnement et son solde. Cette séparation est faite dès la v1 parce que l'introduire après coup imposerait de scinder chaque ligne et de réaffecter tous les abonnements et réservations d'une saison en cours. Détail complet dans `SPEC-abonnements-credits.md` §1 bis.
- **`participants.account_id` est nullable.** Une adhérente qui ne veut pas de compte existe quand même : Isabelle la crée, l'abonne et réserve pour elle. Aucune adresse e-mail n'est requise pour participer. Isabelle crée donc les participants **indépendamment** des comptes, et peut rattacher l'un à l'autre plus tard sans rien perdre. Conséquence directe : **M1 fonctionne avec la table `accounts` vide.**
- `bookings.source` : `auto` | `member` | `admin` — permet de distinguer une auto-inscription d'un choix délibéré.
- Index unique partiel sur `(session_id, participant_id) WHERE status = 'booked'` : la double réservation est impossible **au niveau du schéma**, pas seulement dans le code. Deux sœurs sur la même séance restent deux lignes valides et occupent deux places.
- `subscriptions.starts_on` : un participant qui arrive en janvier ne reçoit pas les crédits de septembre.
- `subscriptions.helloasso_order_id` est **nullable**. Un abonnement créé à la main par Isabelle n'en a pas, et n'en aura peut-être jamais. Rien dans le modèle ne dépend de HelloAsso.
- `subscriptions.monthly_price_cents` : le montant mensuel dû, saisi à la création. Purement indicatif — l'application n'encaisse rien — mais tant que HelloAsso n'est pas en place, c'est ce qui permet à Isabelle de savoir qui doit combien.

### Provisionnement

Les comptes Supabase et Resend ont été créés **directement chez les fournisseurs**, hors Marketplace Vercel. Les variables d'environnement ne sont donc pas injectées automatiquement : il faut lier le dépôt puis les saisir.

```bash
vercel link                      # le dépôt n'est pas encore lié
vercel env add <NOM>             # une fois par variable, par environnement
vercel env pull .env.local --yes
```

Quatre variables, **sans préfixe `PUBLIC_`** : Astro n'expose au navigateur que les variables préfixées `PUBLIC_`, si bien que le nommage lui-même garantit qu'aucune clé ne peut fuir côté client.

| Variable | Rôle |
| --- | --- |
| `SUPABASE_URL` | URL du projet |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` — accès porté par la session de l'utilisateur, soumis au RLS |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` — routes d'admin uniquement, contourne le RLS |
| `RESEND_API_KEY` | Envoi des e-mails |

**Ne pas utiliser les clés héritées `anon` et `service_role`** : Supabase les retire d'ici fin 2026 au profit des clés `sb_publishable_…` / `sb_secret_…`. Outre la pérennité, une clé secrète compromise se révoque en quelques secondes **sans invalider les sessions de tous les utilisateurs connectés** — ce qui était le vrai coût d'une rotation de `service_role`.

À noter : ces nouvelles clés ne sont pas des JWT et ne peuvent donc **pas** être placées dans l'en-tête `Authorization`, qui reste réservé au JWT de l'utilisateur.

Deux étapes se font au tableau de bord et pas en ligne de commande : authentifier le domaine `atelier-des-cousettes.fr` chez Resend (SPF/DKIM), et déclarer Resend comme SMTP personnalisé dans Supabase Auth — sans quoi les codes de connexion se heurtent au plafond horaire du SMTP par défaut de Supabase.

L'application ne lit aujourd'hui **aucune** variable d'environnement — c'est la première fois. Le lint `scripts/lint-trailing-slash.mjs` s'applique aussi aux nouvelles routes.

### Pièges RLS à ne pas découvrir en production

- **`GRANT` et RLS sont deux choses différentes**, et c'est le piège vérifié sur ce projet : la Data API ne donne aujourd'hui aucun accès au rôle `anon` (une requête REST avec la clé publishable répond `401`, alors que la même clé répond `200` sur `/auth/v1/settings` — la clé est donc valide). Activer le RLS n'expose pas une table ; il faut un `GRANT` explicite. Sans lui, les requêtes des adhérents échouent **malgré une session valide et des politiques correctes**, et l'on perd des heures à déboguer des politiques qui n'ont jamais été en cause. M0 accorde donc les droits explicitement, au rôle `authenticated` seulement, **jamais** à `anon`.
- **RLS activé sur toutes les tables** du schéma `public`. Une table exposée à la Data API sans RLS est lisible par le rôle qui a reçu le `GRANT`.
- **Un `UPDATE` exige aussi une politique `SELECT`.** Sans elle, la mise à jour ne lève aucune erreur : elle affecte simplement zéro ligne. Cela concerne directement la libération d'une réservation, qui est un `UPDATE` de `status` — le symptôme serait « le bouton ne fait rien », sans trace.
- **Le rôle admin ne doit jamais venir de `user_metadata`**, modifiable par l'utilisateur lui-même. Il est lu en base (`accounts.role`) à chaque requête ; c'est déjà la règle posée plus haut, et c'est aussi la raison technique de cette règle.
- **Une vue contourne le RLS par défaut.** Toute vue créée pour les écrans d'admin doit l'être `WITH (security_invoker = true)`.
- **Supprimer un compte n'invalide pas ses jetons en cours.** Révoquer la session avant de supprimer.

## 5. Découpage en jalons

Chaque jalon livre un logiciel testable seul.

**M0 — Fondations.** Provisionnement, rendu hybride, middleware de session, schéma + migrations, amorçage des créneaux et de leurs valeurs par défaut depuis Keystatic.
*Livrable : le schéma et les créneaux en base. Aucune séance, aucune interface.*

**M1 — Admin d'Isabelle.** Connexion admin, **création des séances dans une interface** (ci-dessous), **création manuelle de participants — avec ou sans compte** — et d'un abonnement par participant (créneau d'origine, nombre de séances incluses par mois, montant mensuel, dates de début et de fin) ; création d'un compte et rattachement d'un participant existant ; liste des séances, feuille de présence, ajout/retrait manuel d'un participant sur une séance.
*Livrable : elle peut piloter une saison entière depuis un écran, sans HelloAsso et sans que les adhérents aient un compte. Valide le modèle au coût le plus bas.*

### La création des séances

**Pas de moteur de récurrence.** Les dates réelles sont irrégulières et choisies à la main — le jeudi après-midi tombe les 18/09, 02 et 09/10, 06 et 20/11, 04 et 18/12… et le mardi ne suit aucune règle. Modéliser une récurrence serait mentir sur les données, et Isabelle passerait la saison à gérer des exceptions.

**Le créneau porte les valeurs par défaut, elle coche les dates.** Une saison compte environ 100 à 140 séances : les créer une par une serait décourageant. L'écran est donc :

1. choisir un créneau — l'horaire, le lieu, la capacité et le prix unitaire sont préremplis depuis `creneaux.default_*` ;
2. cocher plusieurs dates d'un coup dans un calendrier ;
3. valider — une ligne `sessions` par date, ensuite modifiable individuellement.

Chaque séance reste éditable seule : décaler un horaire, changer une capacité, corriger un lieu. Les valeurs par défaut ne sont qu'un point de départ, jamais une contrainte.

**Cycle de vie d'une séance :**

- **Annuler une séance** (vacances, maladie) passe son `status` à `cancelled` et **libère toutes ses réservations** — les crédits reviennent, ce n'est pas la faute des participants. Les personnes concernées sont prévenues en M3 ; avant cela, Isabelle prévient elle-même.
- **Réduire la capacité** sous le nombre de réservations actives est **refusé**, avec le décompte à l'appui. Le système ne choisit jamais qui exclure.
- **Déplacer une séance** conserve ses réservations : c'est la même séance à une autre date.

Un script d'amorçage peut, si vous le souhaitez, préremplir la première saison à partir des dates déjà saisies dans `src/content/pages/ateliers-reguliers/index.yaml` — une commodité ponctuelle, pas un mécanisme. L'interface reste la voie normale.

L'import CSV depuis HelloAsso n'est **pas** dans M1 : c'est un raccourci de saisie, pas une dépendance. Il arrive quand la campagne HelloAsso existe et remplit exactement les mêmes champs que le formulaire manuel.

**M2 — Espace adhérent.** Connexion par code **et par Google**, rattachement à la ligne `accounts`, sélecteur de participant si le compte en porte plusieurs, tableau de bord (solde, prochaines séances), planning, réservation et libération, auto-inscription.
*Livrable : Isabelle sort de la boucle de coordination.*

**M3 — E-mails.** Confirmation, rappel J-2 (cron Vercel quotidien), annulation d'une séance par Isabelle. Quotas et contraintes ci-dessous.

### Ce que les paliers gratuits autorisent réellement

Deux fournisseurs distincts, à ne pas confondre : **Vercel** héberge et déclenche le cron, **Resend** envoie les e-mails.

| | Palier gratuit | Ce que ça implique ici |
| --- | --- | --- |
| **Vercel Hobby** | 100 crons par projet, **une exécution par jour maximum**, précision horaire **± 59 min** | La limite n'est pas le nombre de tâches mais leur fréquence. Un balayage quotidien pour les rappels J-2 suffit ; une expression plus fréquente (`0 * * * *`) **échoue au déploiement**. Le rappel partira dans l'heure suivant l'horaire visé — sans importance pour un rappel à deux jours. |
| **Resend gratuit** | **3 000 e-mails/mois, plafonnés à 100/jour**, 1 domaine | Le plafond mensuel est hors d'atteinte (~150/mois attendus). **C'est le plafond journalier qui est la vraie contrainte.** |

**Les codes de connexion comptent dans le même quota.** Supabase envoie ses e-mails d'authentification via le relais SMTP de Resend : codes à 6 chiffres, confirmations et rappels puisent tous dans les 100 par jour.

**Aucune de ces limites n'est atteignable ici.** Avec une vingtaine d'adhérents, le pire jour imaginable — inviter tout le monde le même soir — produit une vingtaine de codes, soit un cinquième du plafond quotidien. Le volume courant tourne autour de 70 e-mails par mois. Il n'y a donc **ni échelonnement des envois ni garde-fou de quota à écrire** : ce serait de la complexité pour un problème qui ne se posera pas.

### Expéditeur

Le domaine authentifié chez Resend est **`portail.atelier-des-cousettes.fr`** (sous-domaine), et l'expéditeur est donc **`no_reply@portail.atelier-des-cousettes.fr`**. La même adresse doit être déclarée comme expéditeur du SMTP personnalisé dans Supabase Auth, sans quoi les codes de connexion partiront d'une adresse non authentifiée et finiront en indésirables.

Passer par un sous-domaine est le bon choix : la réputation d'envoi de l'application est isolée de celle du domaine racine. Si un jour les e-mails transactionnels sont mal classés, le courrier d'Isabelle depuis `atelier-des-cousettes.fr` n'en souffre pas.

**Mais une adresse « no reply » perd des messages.** Sur une vingtaine d'adhérentes, souvent peu à l'aise avec le numérique, certaines répondront au rappel J-2 pour dire « je ne peux pas venir jeudi » au lieu d'aller sur le site — c'est quasi certain. Sans traitement, ces réponses disparaissent, et Isabelle croira la personne présente.

Deux mesures, **obligatoires dès le premier envoi** :

- **`Reply-To: info@atelier-des-cousettes.fr` sur TOUS les envois, sans exception** — codes de connexion, confirmations, rappels, annulations. L'expéditeur reste le sous-domaine authentifié, mais une réponse arrive chez Isabelle. Coût : un en-tête. À poser dans la fonction d'envoi unique, jamais message par message : un en-tête recopié à cinq endroits finit par manquer au sixième.
- **Le dire dans le corps de l'e-mail** : « Pour libérer votre place, utilisez le lien ci-dessous — vous pouvez aussi simplement répondre à ce message. » Assumer le canal plutôt que le combattre.

Le `Reply-To` s'applique aussi aux e-mails émis par **Supabase Auth** (codes de connexion), qui passent par le SMTP Resend : il se configure dans le gabarit d'e-mail Supabase, pas dans le code applicatif. C'est l'envoi le plus facile à oublier, parce que c'est le seul que l'application n'écrit pas elle-même.

À noter au passage : la convention usuelle est `no-reply` avec un trait d'union ; `no_reply` avec un tiret bas est licite mais inhabituel, et quelques filtres naïfs le traitent mal. Modifiable tant que rien n'est envoyé.

> **Réserve à surveiller :** le palier Hobby de Vercel est destiné à un usage non commercial. Le site est celui d'une association à but non lucratif et aucun paiement n'y transite (tout se passe chez HelloAsso), ce qui plaide pour sa conformité. Si Vercel imposait un jour le passage en Pro (~20 $/mois), le budget de 5 €/mois serait dépassé à lui seul — c'est le principal risque financier de tout ce projet, et il ne vient pas de la base de données.

**M4 — Site public.** Places restantes sur `/ateliers-reguliers/`, planning rendu depuis la base.

**M5 — Provisionnement automatique HelloAsso.** *Nécessite un compte HelloAsso vérifié.* Réception du webhook `Order`, table de correspondance des tarifs, création automatique compte + participant + abonnement, file « à traiter ». Peut ensuite s'étendre au règlement en ligne des séances supplémentaires par intention de paiement (`SPEC-abonnements-credits.md` §7).

Le périmètre v1 demandé (adhérents + admin + e-mails) correspond à **M0 → M3**. M1 est placé avant M2 délibérément : il ne coûte presque rien de plus et permet de valider le modèle de données contre la réalité d'une vraie saison avant d'écrire l'authentification.

## 6. Articulation avec HelloAsso

Séparation stricte : **HelloAsso encaisse, l'application réserve.** Aucune synchronisation automatique, et surtout **aucune dépendance** : le compte HelloAsso de l'association n'est pas encore vérifié, et rien dans ce document ne l'attend.

**L'application est la source de vérité des comptes, des participants et des abonnements.** Isabelle crée un compte et son ou ses participants à la main, affecte à chacun son créneau d'origine et son nombre de séances mensuelles, et la saison fonctionne. Si HelloAsso n'existe jamais, tout continue de marcher ; elle encaisse comme elle le fait aujourd'hui et se sert de `monthly_price_cents` pour savoir qui doit quoi.

Quand la campagne HelloAsso sera en place, elle ajoutera deux choses :

- le **prélèvement mensuel automatique**, qui remplace l'encaissement manuel ;
- la **création automatique** du compte, du participant et de l'abonnement à la réception du webhook de commande.

### Création automatique par webhook

C'est la voie normale une fois HelloAsso en service, et elle remplace l'import CSV : à chaque nouvelle adhésion en ligne, la notification `Order` déclenche la création du compte, du participant et de l'abonnement, sans saisie.

**La création manuelle ne disparaît pas pour autant.** Elle reste la seule voie pour qui paie par chèque, ne veut pas de compte, ou s'inscrit de vive voix — d'où `participants.account_id` nullable (§4). Les deux voies coexistent et écrivent exactement les mêmes lignes.

#### Ce que la campagne HelloAsso doit obligatoirement collecter

C'est le point à trancher **avant** de créer la campagne, pas après. Une campagne construite sans ces champs rend la création automatique impossible, et la refaire en cours de saison signifie redemander à chaque adhérente de se réinscrire.

- **Le nom et le prénom du participant**, en champ complémentaire distinct du payeur. Sans cela, la fille inscrite par sa mère est créée sous le nom de sa mère. Le payeur alimente `accounts`, le champ complémentaire alimente `participants`.
- **Un tarif par formule**, et non un tarif par créneau. Le tarif choisi est ce qui détermine `home_creneau_id`, `credits_per_month` et `monthly_price_cents` — « Jeudi après-midi, 2 ateliers/mois, 55 € » est une formule ; « Jeudi après-midi » seul ne dit pas combien de séances sont incluses.

Une table de correspondance `helloasso_tiers (tier_id → creneau_id, credits_per_month, monthly_price_cents)`, éditable depuis l'admin, fait la traduction. Elle doit être remplie avant l'ouverture des inscriptions.

#### Règles de robustesse

- **Idempotence.** HelloAsso réémet une notification non acquittée pendant 48 h. Contrainte d'unicité sur `subscriptions.helloasso_order_id` : rejouer la même commande ne crée jamais de doublon.
- **Rattachement plutôt que création.** Si l'adresse e-mail correspond déjà à un compte, on s'y rattache. Si Isabelle a déjà créé le participant à la main en septembre, la commande doit lui être rattachée, pas en créer un second — le rapprochement par nom étant approximatif, un doublon suspecté part en file de traitement plutôt que d'être fusionné automatiquement.
- **File de traitement.** Toute commande non provisionnable — tarif inconnu, nom de participant manquant, homonyme douteux — atterrit dans une liste « à traiter » de l'admin, avec sa charge utile brute. **Aucune commande n'est jamais silencieusement ignorée** : quelqu'un qui a payé et qui n'apparaît nulle part est le pire échec possible de ce système.
- **Moment du provisionnement.** Une commande d'adhésion à prélèvement mensuel n'est validée qu'à l'acceptation du premier paiement. Le provisionnement se fait donc sur la commande, et les notifications `Payment` mensuelles suivantes alimentent le suivi décrit ci-dessous.

### Échec d'un prélèvement mensuel

HelloAsso émet une notification dédiée (`Paiement par échéance refusé`) et **gère lui-même la relance** : l'adhérente reçoit un e-mail contenant un lien de régularisation valable 30 jours. Cette application ne doit donc surtout pas construire sa propre relance — elle doit seulement savoir.

**Signaler, jamais sanctionner.** Un prélèvement échoué **ne bloque rien** : ni l'octroi des crédits, ni les réservations en cours, ni les réservations futures. Une carte expirée est l'explication la plus fréquente, et couper automatiquement l'accès d'une adhérente dans une association d'une vingtaine de personnes qui se connaissent toutes serait socialement désastreux — et systématiquement annulé à la main par Isabelle. C'est la même logique que le découvert de crédits (`SPEC-abonnements-credits.md` §5, règle 3) : on rend visible, on laisse décider.

Concrètement :

- Les notifications HelloAsso sont stockées **brutes** dans une table `helloasso_events` en ajout seul. Elle sert à trois choses d'un coup : idempotence des webhooks, file « à traiter », et piste d'audit quand un désaccord surgit sur ce qui a été payé.
- L'abonnement porte un état dérivé (`payment_status`, `payment_failed_at`). Un paiement réussi ultérieur sur le même abonnement **efface le drapeau** : un incident rattrapé en trois jours ne doit pas laisser de trace visible.
- L'admin affiche une liste « prélèvements en échec », triée par ancienneté, avec la date d'expiration du lien de régularisation HelloAsso (échec + 30 jours). C'est cette date qui mérite l'attention d'Isabelle, pas l'échec lui-même.
- Les paiements **contestés** et **remboursés** suivent exactement le même chemin : un drapeau, une ligne dans la liste, aucune action automatique.

#### Le levier, quand il faut vraiment agir

Il n'existe **aucune notion de « suspension »** dans le modèle, et il n'en faut pas : pour arrêter les droits d'une adhérente qui ne paie plus, Isabelle **avance sa date de fin d'abonnement** (`ends_on`). L'octroi cesse à cette date, mécaniquement, par la même arithmétique que tout le reste.

Conséquence à comprendre avant de s'en servir : réduire `ends_on` diminue l'octroi **rétroactivement**. Si l'adhérente a cessé de payer en janvier mais est venue en février et mars, ces séances deviennent des séances supplémentaires et apparaissent en facturation. C'est arithmétiquement juste, et c'est exactement le montant à réclamer — mais il faut le savoir plutôt que le découvrir.

Les phases 0 à 2 du plan HelloAsso (campagne d'adhésion, prélèvement mensuel, champs Keystatic, client API) restent valables, mais deviennent un chantier **parallèle et non bloquant**. Sa phase 3 — le badge « places restantes » alimenté par HelloAsso — est annulée : la disponibilité vient de la table `sessions`.

Les registres officiels de l'association (adhésion, obligations SIRET) resteront dans HelloAsso le jour où il sera en service ; cette application ne les remplace pas.

### Question ouverte : le suivi des paiements

Sans HelloAsso, personne ne sait dans le système qui a payé son mois. `monthly_price_cents` dit ce qui est *dû*, pas ce qui est *reçu*. Deux options, à trancher avant M1 :

- **Ne rien suivre** — Isabelle continue avec sa méthode actuelle (carnet, tableur). Zéro développement, mais l'application affichera des soldes de séances à des gens qui ne paient plus.
- **Un marqueur mensuel payé/non payé** par abonnement, saisi à la main. Une table et un écran de plus, et une saisie mensuelle pour elle.

Recommandation : **ne rien suivre en M1**. Ajouter de la comptabilité manuelle juste avant de brancher un système qui l'automatise serait du travail jetable — les notifications `Payment` de M5 répondent à la question sans aucune saisie (voir « Échec d'un prélèvement mensuel » ci-dessous).

À assumer d'ici là : entre M1 et M5, l'application affichera des crédits à des personnes qui ont peut-être cessé de payer. Sur une vingtaine d'adhérentes qu'Isabelle connaît toutes, un impayé se remarque sans logiciel.

## 7. Risques

| Risque | Traitement |
| --- | --- |
| Adhérents peu à l'aise avec le numérique | Rien à faire si on ne change pas ses habitudes (auto-inscription). Isabelle peut tout faire à leur place (M1 avant M2). |
| Compte Google avec une autre adresse que celle de HelloAsso | Aucun membre créé automatiquement : message explicite et rattachement manuel depuis l'admin. Cas d'erreur le plus probable en septembre. |
| Délivrabilité des e-mails de connexion | SMTP Resend dès M0, domaine authentifié (SPF/DKIM). Le code reste saisissable manuellement. |
| Dérive entre Keystatic et la base | `creneaux` est amorcé depuis Keystatic et testé ; les `sessions` n'existent qu'en base. Le champ `dates` en texte libre est retiré en M4. |
| Le site devient une application avec un état | Assumé. C'est le prix du modèle de flexibilité demandé. |
| Rush de septembre | M1 livré avant la rentrée permet à Isabelle de tout saisir manuellement si M2 n'est pas prêt. |

## 8. Vérification

- **Saison complète sans HelloAsso** : créer à la main un participant, lui affecter le créneau du jeudi après-midi et 2 séances par mois, vérifier qu'il est auto-inscrit aux bonnes dates et que son solde est juste — sans qu'aucune variable d'environnement HelloAsso ne soit définie.
- **Saison complète sans aucun compte** : le scénario précédent doit se dérouler intégralement avec la table `accounts` vide et `participants.account_id = NULL`.
- Rattacher a posteriori un compte à un participant existant ne doit changer ni son solde, ni ses abonnements, ni ses réservations.
- **Une mère et ses deux filles** : un compte, deux participants, deux abonnements sur le créneau enfants. Les deux filles occupent deux places sur chaque séance, leurs soldes évoluent indépendamment, et la mère bascule de l'une à l'autre après une seule connexion.
- Création manuelle : le formulaire doit refuser un e-mail de compte déjà utilisé, un créneau inexistant, et un `starts_on` postérieur à `ends_on`. Deux participants **homonymes** sur un même compte doivent en revanche être acceptés.
- Un abonnement créé à la main doit avoir `helloasso_order_id` à `NULL` et fonctionner exactement comme un abonnement importé.
- Cloisonnement : un compte ne doit pouvoir lire ni réserver pour un participant d'un autre compte — testé contre la politique RLS, requête directe à l'appui.
- Libération d'une place : vérifier que l'`UPDATE` affecte bien **une** ligne, et non zéro. Une politique `SELECT` manquante produirait un échec parfaitement silencieux.
- Aucune décision d'autorisation ne s'appuie sur `user_metadata` : modifier ce champ côté client ne doit donner aucun accès admin.
- Solde : un participant dont l'abonnement démarre en janvier avec 2 crédits/mois et qui a réservé 3 séances doit voir `(mois écoulés × 2) − 3`.
- Report : ne rien réserver en octobre puis réserver 4 séances en novembre doit fonctionner et laisser un solde cohérent.
- Capacité : la (N+1)ᵉ réservation sur une séance de N places doit échouer, y compris en concurrence — l'index unique et la vérification de capacité sont testés par deux requêtes simultanées.
- Auto-inscription : un forfait 1 séance/mois sur un créneau à 2 séances mensuelles ne doit générer qu'une réservation par mois.
- Dépassement : réserver à solde nul doit réussir et apparaître dans la liste à facturer d'Isabelle.
- Sans JavaScript : réserver et libérer une place doit fonctionner avec JS désactivé.
- Connexion Google : se connecter avec un compte Google dont l'adresse correspond à une ligne `accounts` doit ouvrir la session et rattacher l'identité.
- Connexion Google, adresse inconnue : doit afficher « Compte non reconnu » et **ne créer ni compte ni participant** — vérifier en base après la tentative.
- Double moyen de connexion : se connecter par code puis, plus tard, par Google avec la même adresse doit aboutir au **même** compte, pas à un doublon.
- Compte à un seul participant : aucun sélecteur de participant ne doit apparaître dans l'interface.
- CSP : `pnpm test` doit passer sans modification de `src/config/csp.js`, connexion Google comprise.

### E-mails (M3)

- **Chaque** type d'envoi porte `Reply-To: info@atelier-des-cousettes.fr` — vérifié par un test sur la fonction d'envoi, et **de visu sur un code de connexion réel**, puisque celui-ci est produit par Supabase Auth et non par le code applicatif.
- Répondre à un rappel J-2 depuis une vraie boîte doit arriver chez Isabelle, pas rebondir.
- L'expéditeur est `no_reply@portail.atelier-des-cousettes.fr` et le message passe SPF et DKIM — contrôler les en-têtes d'un message reçu, pas seulement le tableau de bord Resend.
- Aucun e-mail n'est produit pour un participant sans compte.

### Provisionnement automatique (M5)

- Rejouer deux fois la même notification de commande ne crée **qu'un seul** abonnement.
- Une commande dont l'adresse e-mail correspond à un compte existant s'y rattache au lieu d'en créer un second.
- Une commande au tarif inconnu de la table de correspondance atterrit dans la file « à traiter » — et **n'est pas perdue** : vérifier que la charge utile brute est consultable.
- Une commande sans nom de participant renseigné part en file de traitement plutôt que de créer un participant au nom du payeur.
- Une mère réglant pour sa fille produit un compte au nom de la mère et un participant au nom de la fille.
- Un prélèvement refusé lève le drapeau **sans** modifier le solde, ni annuler une réservation existante, ni empêcher une nouvelle réservation.
- Un paiement réussi reçu après un échec **efface** le drapeau.
- Avancer `ends_on` réduit l'octroi à due proportion et fait apparaître en facturation les séances déjà honorées au-delà de la nouvelle date.
- Une notification rejouée n'ajoute qu'une seule ligne dans `helloasso_events`.
