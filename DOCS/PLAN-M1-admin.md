# M1 — Admin d'Isabelle : plan d'implémentation

> **Pour l'agent qui exécute :** utiliser `superpowers:subagent-driven-development` ou `superpowers:executing-plans`, tâche par tâche. Les étapes sont cochables (`- [ ]`).

**But :** permettre à Isabelle de piloter une saison entière depuis un écran — créer les séances, les participants, leurs abonnements, et gérer les présences — **sans HelloAsso et sans qu'aucun adhérent n'ait de compte**.

**Architecture :** routes Astro en `prerender = false` sous `/espace-membre/`. Authentification par code à 6 chiffres (Supabase Auth OTP), session en cookie httpOnly gérée côté serveur. Les opérations qui doivent être atomiques (réserver, annuler une séance) sont des fonctions SQL, pas des séquences d'appels applicatifs.

**Pile :** Astro 7, `@supabase/supabase-js`, `@supabase/ssr`, vitest.

**Prérequis :** M0 terminé (six migrations appliquées, créneaux amorcés).

## Contraintes globales

- Tout texte visible est en **français**, accents corrects.
- **Aucune modification** de `src/config/csp.js` ni de `vercel.json`. Si une tâche semble l'exiger, c'est que du JavaScript client contacte Supabase — corriger l'approche, pas la CSP.
- Aucune variable `PUBLIC_*`.
- Les formulaires sont des `<form method="post">` classiques et doivent fonctionner **sans JavaScript**.
- Tous les liens internes se terminent par `/` (`scripts/lint-trailing-slash.mjs` s'exécute au commit).
- Les pages publiques existantes doivent rester prérendues.
- `pnpm check` et `pnpm test` passent après chaque tâche.

Règles métier : `DOCS/SPEC-abonnements-credits.md` fait foi. En particulier §5 (consommation), §5 bis (annulation par l'atelier), §6 (changement de formule).

---

## Task 1 : Opérations atomiques en SQL

**Fichiers :** `supabase/migrations/<ts>_booking_operations.sql`, `supabase/tests/bookings.sql`

**Pourquoi en SQL :** vérifier la capacité puis insérer depuis l'application est *racy* — deux requêtes simultanées peuvent chacune voir « 5 places sur 6 » et insérer toutes les deux. Le verrou de ligne sur la séance sérialise les candidats.

**Produit :** `book_participant()`, `release_booking()`, `cancel_session()`.

- [ ] **Étape 1 — Créer la migration**

```bash
supabase migration new booking_operations
```

- [ ] **Étape 2 — Écrire les fonctions**

```sql
-- Réserve une place. Le verrou de ligne sur la séance sérialise les
-- réservations concurrentes : sans lui, deux requêtes simultanées peuvent
-- toutes deux constater « il reste une place » et insérer.
-- Le dépassement de crédits est AUTORISÉ (SPEC §5 règle 3) : seule la capacité
-- physique bloque.
create or replace function book_participant(
  p_session uuid, p_participant uuid, p_source text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_taken    integer;
  v_status   text;
  v_id       uuid;
begin
  select capacity, status into v_capacity, v_status
  from sessions where id = p_session for update;

  if not found then raise exception 'Séance introuvable'; end if;
  if v_status = 'cancelled' then raise exception 'Séance annulée'; end if;

  select count(*) into v_taken
  from bookings where session_id = p_session and status = 'booked';

  if v_taken >= v_capacity then
    raise exception 'Séance complète (% places)', v_capacity;
  end if;

  insert into bookings (session_id, participant_id, source, status)
  values (p_session, p_participant, p_source, 'booked')
  returning id into v_id;
  return v_id;
end;
$$;

-- Libérer rend le crédit sans écriture compensatoire : la ligne sort du compte
-- des réservations actives (SPEC §5 règle 1). Elle n'est JAMAIS supprimée —
-- elle sert de pierre tombale contre la ré-inscription automatique.
create or replace function release_booking(p_booking uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update bookings set status = 'released', released_at = now()
  where id = p_booking and status = 'booked';
$$;

-- Annulation par l'atelier : libère TOUTES les réservations, les crédits
-- reviennent (SPEC §5 bis). La place n'ayant pas été tenue à disposition,
-- c'est la seule exception à « ne pas venir consomme le crédit ».
create or replace function cancel_session(p_session uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_released integer;
begin
  update sessions set status = 'cancelled' where id = p_session;
  update bookings set status = 'released', released_at = now()
  where session_id = p_session and status = 'booked';
  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

-- Refuse de réduire la capacité sous le nombre de réservations actives :
-- le système ne choisit jamais qui exclure.
create or replace function set_session_capacity(p_session uuid, p_capacity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_taken integer;
begin
  select count(*) into v_taken
  from bookings where session_id = p_session and status = 'booked';
  if p_capacity < v_taken then
    raise exception 'Capacité % inférieure aux % réservations en cours',
      p_capacity, v_taken;
  end if;
  update sessions set capacity = p_capacity where id = p_session;
end;
$$;

revoke execute on function book_participant(uuid, uuid, text)   from public, anon;
revoke execute on function release_booking(uuid)                from public, anon;
revoke execute on function cancel_session(uuid)                 from public, anon;
revoke execute on function set_session_capacity(uuid, integer)  from public, anon;
grant  execute on function book_participant(uuid, uuid, text)   to authenticated;
grant  execute on function release_booking(uuid)                to authenticated;
```

`cancel_session` et `set_session_capacity` ne sont **pas** accordées à `authenticated` : ce sont des gestes d'administration, appelés avec la clé secrète.

- [ ] **Étape 3 — Appliquer et relancer les advisors**

```bash
supabase db push --yes
supabase db advisors --linked
```

Attendu : aucun nouvel avertissement hors celui déjà assumé.

- [ ] **Étape 4 — Écrire les tests**

`supabase/tests/bookings.sql`, sur le modèle de `credits.sql` (transaction + rollback). Assertions :

| Cas | Attendu |
| --- | --- |
| Réserver sur une séance de 1 place, deux participants | la 2ᵉ lève « Séance complète » |
| Réserver deux fois le même participant | violation de l'index unique |
| Libérer puis réserver à nouveau | réussit, solde inchangé |
| `cancel_session` sur une séance à 3 réservations | renvoie 3, `consumed_credits` retombe |
| `set_session_capacity` à 1 avec 3 réservations | lève une exception, capacité inchangée |
| Réserver à solde nul | **réussit**, solde négatif |

- [ ] **Étape 5 — Exécuter**

```bash
supabase db query --linked -f supabase/tests/bookings.sql
```

- [ ] **Étape 6 — Commit**

---

## Task 2 : Amorçage des comptes administrateurs

**Fichiers :** `scripts/bootstrap-admins.mjs`

**Pourquoi un script et non une migration :** les adresses e-mail sont des données personnelles ; elles n'ont pas à figurer dans l'historique Git. Le script les lit dans l'environnement.

- [ ] **Étape 1 — Ajouter la variable**

Dans `.env.local` puis dans Vercel :

```
ADMIN_EMAILS=isabelle@exemple.fr,sam@exemple.fr
```

- [ ] **Étape 2 — Écrire le script**

`scripts/bootstrap-admins.mjs` : pour chaque adresse, `upsert` dans `accounts` avec `role = 'admin'` via `getAdminClient()`, sur conflit d'`email` mettre à jour `role` uniquement. Idempotent.

Le compte est créé **sans `auth_user_id`** : il sera rattaché à la première connexion, en comparant l'adresse. Un compte admin n'a besoin d'aucun participant.

- [ ] **Étape 3 — Exécuter et vérifier**

```bash
node --env-file=.env.local scripts/bootstrap-admins.mjs
supabase db query --linked "select email, role from accounts order by email;"
```

- [ ] **Étape 4 — Commit**

---

## Task 3 : Authentification par code à 6 chiffres

**Fichiers :** `src/middleware.ts`, `src/utils/auth.ts`, `src/pages/espace-membre/connexion.astro`, `src/pages/espace-membre/deconnexion.ts`, `src/env.d.ts`

**Pourquoi un code et non un lien magique :** les scanners antivirus de certains fournisseurs préchargent les liens des e-mails et consomment le lien avant l'adhérente. Un code fonctionne aussi quand l'e-mail est ouvert sur le téléphone et le site sur l'ordinateur.

- [ ] **Étape 1 — Installer**

```bash
pnpm add @supabase/ssr
```

- [ ] **Étape 2 — Middleware**

`src/middleware.ts` : lit les cookies de session, construit un client serveur, et place dans `Astro.locals` : `session`, `account` (ligne `accounts` correspondante) et `isAdmin`. **Le rôle est lu en base**, jamais dans le jeton.

Déclarer les types dans `src/env.d.ts`.

- [ ] **Étape 3 — Page de connexion**

Deux étapes dans une même page, sans JavaScript :

1. `POST` avec l'e-mail → `signInWithOtp({ email, options: { shouldCreateUser: false } })`.
   `shouldCreateUser: false` est **essentiel** : aucun compte ne doit naître d'une tentative de connexion. Si l'adresse est inconnue, afficher « Compte non reconnu, contactez Isabelle ».
2. `POST` avec le code → `verifyOtp({ email, token, type: 'email' })`, puis pose des cookies httpOnly et redirige.

Au premier succès, si `accounts.auth_user_id` est nul, le renseigner en comparant l'e-mail.

- [ ] **Étape 4 — Test**

Vérifier que `shouldCreateUser: false` est présent dans la source — une régression sur ce point créerait des comptes fantômes à chaque faute de frappe.

- [ ] **Étape 5 — Vérifier manuellement**

```bash
pnpm dev
```

Se connecter avec une adresse de `ADMIN_EMAILS`, puis avec une adresse inconnue : la seconde doit refuser **sans créer de ligne**. Vérifier en base.

- [ ] **Étape 6 — Commit**

---

## Task 4 : Garde d'administration et gabarit

**Fichiers :** `src/layouts/AdminLayout.astro`, `src/utils/guards.ts`

- [ ] **Étape 1 — Garde**

`requireAdmin(Astro)` : redirige vers `/espace-membre/connexion/` si absent de session, renvoie 403 si `locals.isAdmin` est faux. Appelée en tête de **chaque** page d'admin.

- [ ] **Étape 2 — Gabarit**

Navigation : Séances · Participants · À facturer. Style repris de l'existant (`--color-*`, `--font-heading`), sans dupliquer `BaseLayout`.

- [ ] **Étape 3 — Test**

Une page d'admin demandée sans session redirige ; avec une session non admin renvoie 403.

- [ ] **Étape 4 — Commit**

---

## Task 5 : Création des séances

**Fichiers :** `src/pages/espace-membre/admin/seances/index.astro`, `.../nouvelles.astro`

**C'est l'écran qui rend M1 utile.** Une saison compte 100 à 140 séances ; les créer une par une serait décourageant.

- [ ] **Étape 1 — Écran de création groupée**

1. choisir un créneau — horaires, lieu, capacité et prix unitaire préremplis depuis `creneaux.default_*` ;
2. saisir plusieurs dates (champ `<input type="date">` répété, ajout par bouton — **fonctionnel sans JS** grâce à un bouton `name="add"` qui repasse par le serveur) ;
3. valider → une ligne `sessions` par date.

`starts_at` / `ends_at` sont composés de la date et des horaires par défaut, **en heure de Paris** — attention au passage à l'heure d'hiver : une séance de novembre n'a pas le même décalage UTC qu'une séance d'octobre. Stocker en `timestamptz` et composer via `AT TIME ZONE 'Europe/Paris'` plutôt qu'en ajoutant un décalage fixe.

- [ ] **Étape 2 — Test de la composition des horaires**

Cas obligatoire : le même créneau `14:00–17:00` les 8 octobre 2026 et 5 novembre 2026 doit donner `12:00Z–15:00Z` puis `13:00Z–16:00Z`. Un décalage figé produirait une heure fausse sur la moitié de la saison.

- [ ] **Étape 3 — Liste des séances**

Par créneau puis par date : date, horaire, lieu, `réservées/capacité`, état. Les séances complètes et annulées sont visuellement distinctes.

- [ ] **Étape 4 — Commit**

---

## Task 6 : Modifier, annuler une séance

**Fichiers :** `src/pages/espace-membre/admin/seances/[id].astro`

- [ ] **Étape 1 — Édition**

Horaires, lieu, prix unitaire modifiables. La capacité passe par `set_session_capacity()` : en cas d'exception, afficher le message tel quel — il indique déjà le nombre de réservations en cours.

- [ ] **Étape 2 — Annulation**

Bouton d'annulation avec **confirmation explicite indiquant le nombre de personnes concernées** (« 4 personnes seront prévenues et récupéreront leur séance »). Appelle `cancel_session()`.

- [ ] **Étape 3 — Test**

Après annulation : `status = 'cancelled'`, zéro réservation active, et le solde de chaque participant a augmenté d'exactement 1.

- [ ] **Étape 4 — Commit**

---

## Task 7 : Participants, comptes, abonnements

**Fichiers :** `src/pages/espace-membre/admin/participants/index.astro`, `.../nouveau.astro`, `.../[id].astro`

- [ ] **Étape 1 — Créer un participant**

Nom, prénom, date de naissance (facultative), notes. **Le compte est facultatif** : une case « créer aussi un accès » révèle un champ e-mail. Sans e-mail, `account_id` reste nul et la personne n'aura jamais de compte — c'est un cas normal, pas une erreur.

Rattacher un participant existant à un compte, et créer un compte seul, sont deux gestes distincts du même écran.

- [ ] **Étape 2 — Créer un abonnement**

Créneau d'origine, séances incluses par mois, montant mensuel, dates de début et de fin. Pré-remplir la saison courante.

**Ne jamais proposer de modifier `credits_per_month` d'un abonnement existant** (SPEC §6) : l'écran offre « clore et créer un nouvel abonnement », qui renseigne `ends_on` sur l'ancien et ouvre le suivant. Un champ modifiable réécrirait rétroactivement l'octroi des mois déjà consommés.

- [ ] **Étape 3 — Fiche participant**

Solde (`balance()`), abonnements successifs, réservations à venir et passées. Un bandeau signale visiblement **« aucun compte — cette personne ne recevra aucun e-mail »**, pour qu'un silence ne passe pas pour une panne.

- [ ] **Étape 4 — Tests**

Deux participants sur un même compte ont des soldes indépendants ; un abonnement créé à la main a `helloasso_order_id` nul ; `starts_on > ends_on` est refusé par la contrainte.

- [ ] **Étape 5 — Commit**

---

## Task 8 : Feuille de présence

**Fichiers :** `src/pages/espace-membre/admin/seances/[id].astro` (section)

- [ ] **Étape 1 — Liste des inscrits**

Nom, origine (`auto` / `member` / `admin`), solde du participant. Bouton « libérer la place » → `release_booking()`.

- [ ] **Étape 2 — Ajouter quelqu'un**

Recherche par nom, puis `book_participant(..., 'admin')`. Si le solde est négatif ou nul, **avertir sans bloquer** : « séance supplémentaire, sera facturée ». Si la séance est complète, l'exception remonte telle quelle.

- [ ] **Étape 3 — Test**

Ajouter au-delà de la capacité échoue ; ajouter à solde nul réussit et fait apparaître la personne dans la liste à facturer.

- [ ] **Étape 4 — Commit**

---

## Task 9 : Liste à facturer

**Fichiers :** `src/pages/espace-membre/admin/a-facturer.astro`

- [ ] **Étape 1 — Écran**

Participants à solde négatif, **groupés par compte** avec un total par compte (SPEC §7 : c'est le parent qui règle pour ses filles). **Ne jamais additionner les soldes de plusieurs participants en un seul chiffre** — un solde positif de l'une masquerait le découvert de l'autre.

Le détail liste les séances concernées avec leur `unit_price_cents`.

- [ ] **Étape 2 — Identification des séances supplémentaires**

Appliquer la règle chronologique de la SPEC §7 : parcourir les réservations actives par date de séance croissante en maintenant un solde courant ; celles qui font passer ce solde sous zéro sont les séances supplémentaires, facturées au prix de leur propre séance.

À implémenter comme fonction SQL `extra_sessions(participant_id)` renvoyant les lignes concernées.

- [ ] **Étape 3 — Test**

Avec des séances à prix unitaires différents, les séances facturées sont les **dernières** dans l'ordre chronologique, et le total emploie le prix de chacune — pas un prix moyen. Le résultat ne dépend pas de l'ordre d'insertion.

- [ ] **Étape 4 — Commit**

---

## Vérification de fin de jalon

Le scénario complet, sans HelloAsso et sans aucun compte adhérent :

- [ ] Créer un participant sans compte, lui donner un abonnement 2 séances/mois sur le jeudi après-midi.
- [ ] Créer 4 séances de jeudi sur deux mois.
- [ ] L'inscrire à 3 d'entre elles, en libérer une, vérifier que le solde correspond à `SPEC §3`.
- [ ] Annuler une séance : les crédits reviennent, les inscrits redeviennent libres.
- [ ] Tenter de réduire une capacité sous le nombre d'inscrits : refusé.
- [ ] Créer une mère avec deux filles, chacune son abonnement : soldes indépendants, deux places occupées sur la même séance.
- [ ] Inscrire quelqu'un à solde nul : réussit, apparaît à facturer.
- [ ] Refaire les gestes principaux **avec JavaScript désactivé**.
- [ ] `pnpm test`, `pnpm check`, `pnpm build` passent ; `/ateliers-reguliers/` reste prérendue ; `src/config/csp.js` inchangé.

## Ce que M1 ne fait pas

Aucun accès adhérent (M2), aucun e-mail (M3), aucune auto-inscription (M2), aucun affichage public des places (M4), aucune intégration HelloAsso (M5).
