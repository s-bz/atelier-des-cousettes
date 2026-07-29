# M0 — Fondations : plan d'implémentation

> **Pour l'agent qui exécute :** utiliser `superpowers:subagent-driven-development` ou `superpowers:executing-plans`, tâche par tâche. Les étapes sont cochables (`- [ ]`).

**But :** poser le schéma, les droits, l'arithmétique des crédits et le client Supabase côté serveur, de sorte que M1 n'ait plus qu'à construire des écrans.

**Architecture :** Supabase Postgres accessible **uniquement côté serveur** depuis Astro en rendu hybride. Le solde de crédits est une fonction SQL, jamais une colonne. RLS activé partout, `GRANT` au seul rôle `authenticated`.

**Pile :** Astro 7 + `@astrojs/vercel`, Supabase (Postgres + Auth), `@supabase/supabase-js`, vitest, Supabase CLI 2.95.4.

**Livrable :** un schéma migré et testé, les 7 créneaux amorcés, et `balance()` prouvée sur les cas limites. Aucune interface.

## Contraintes globales

- Tout texte destiné à l'utilisateur est en **français**, avec accents corrects.
- **Aucune modification** de `src/config/csp.js` ni de `vercel.json`. `pnpm test` doit continuer à passer `csp.test.ts` sans changement.
- Aucune variable d'environnement préfixée `PUBLIC_` : rien de Supabase ne doit atteindre le navigateur.
- `GRANT` au rôle `authenticated` uniquement, **jamais** à `anon`.
- Les tests vivent dans `src/utils/__tests__/`, exécutés par `pnpm test` (vitest, pas de fichier de config).
- `pnpm check` doit passer après chaque tâche.
- Toute table du schéma `public` a RLS activé, sans exception.

Références de conception : `DOCS/PRD-espace-membre.md` et `DOCS/SPEC-abonnements-credits.md`. En cas de doute sur une règle métier, la SPEC fait foi.

---

## Task 1 : Initialiser Supabase et lier le projet

**Fichiers :**
- Créer : `supabase/config.toml` (généré)
- Modifier : `.gitignore`

**Produit :** un dossier `supabase/migrations/` prêt, et `supabase migration list` qui répond.

- [ ] **Étape 1 — Initialiser**

```bash
supabase init
```

- [ ] **Étape 2 — Lier au projet distant**

Récupérer la référence du projet depuis `SUPABASE_URL` (`https://<ref>.supabase.co`), puis :

```bash
supabase link --project-ref <ref>
```

- [ ] **Étape 3 — Vérifier**

```bash
supabase migration list
```

Attendu : une table vide, sans erreur d'authentification.

- [ ] **Étape 4 — Ignorer les fichiers locaux**

Ajouter à `.gitignore` :

```
supabase/.branches
supabase/.temp
```

- [ ] **Étape 5 — Commit**

```bash
git add supabase .gitignore
git commit -m "chore: initialise Supabase CLI et lie le projet"
```

---

## Task 2 : Schéma des tables

**Fichiers :**
- Créer : `supabase/migrations/<timestamp>_schema_initial.sql`

**Interfaces produites :** les tables `accounts`, `participants`, `creneaux`, `subscriptions`, `sessions`, `bookings`, consommées par toutes les tâches suivantes.

- [ ] **Étape 1 — Créer le fichier de migration**

```bash
supabase migration new schema_initial
```

Ne jamais inventer le nom du fichier : la commande le génère.

- [ ] **Étape 2 — Écrire le schéma**

Contenu du fichier généré :

```sql
create table accounts (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  email         text not null unique,
  phone         text,
  role          text not null default 'member' check (role in ('member','admin')),
  notes         text,
  created_at    timestamptz not null default now()
);

create table participants (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid references accounts(id) on delete set null,
  first_name  text not null,
  last_name   text not null,
  birthdate   date,
  notes       text,
  created_at  timestamptz not null default now()
);

create table creneaux (
  id                        text primary key,
  label                     text not null,
  group_id                  text not null,
  default_start_time        time not null,
  default_end_time          time not null,
  default_location          text not null,
  default_capacity          integer not null check (default_capacity > 0),
  default_unit_price_cents  integer not null check (default_unit_price_cents >= 0)
);

create table subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  participant_id       uuid not null references participants(id) on delete cascade,
  season               text not null,
  home_creneau_id      text references creneaux(id),
  credits_per_month    integer not null check (credits_per_month >= 0),
  monthly_price_cents  integer not null check (monthly_price_cents >= 0),
  starts_on            date not null,
  ends_on              date not null,
  helloasso_order_id   text unique,
  created_at           timestamptz not null default now(),
  constraint subscription_dates_ordered check (starts_on <= ends_on)
);

create table sessions (
  id                uuid primary key default gen_random_uuid(),
  creneau_id        text not null references creneaux(id),
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  location          text not null,
  capacity          integer not null check (capacity > 0),
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  status            text not null default 'scheduled'
                    check (status in ('scheduled','cancelled')),
  created_at        timestamptz not null default now(),
  constraint session_times_ordered check (starts_at < ends_at)
);

create table bookings (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references sessions(id) on delete cascade,
  participant_id  uuid not null references participants(id) on delete cascade,
  source          text not null check (source in ('auto','member','admin')),
  status          text not null default 'booked' check (status in ('booked','released')),
  created_at      timestamptz not null default now(),
  released_at     timestamptz
);

-- Une même personne ne peut occuper qu'une place par séance.
-- Partiel : les lignes 'released' sont des pierres tombales (SPEC §9),
-- conservées pour empêcher l'auto-inscription de ressusciter une place libérée.
create unique index bookings_one_active_per_session
  on bookings (session_id, participant_id)
  where status = 'booked';

create index bookings_participant_status on bookings (participant_id, status);
create index sessions_creneau_starts_at  on sessions (creneau_id, starts_at);
create index subscriptions_participant   on subscriptions (participant_id);
```

- [ ] **Étape 3 — Appliquer**

```bash
supabase db push
```

- [ ] **Étape 4 — Vérifier que la contrainte clé tient**

```bash
supabase db query "
  insert into creneaux values ('t','T','g','14:00','17:00','R',6,2500);
  insert into sessions (creneau_id,starts_at,ends_at,location,capacity,unit_price_cents)
    values ('t', now(), now() + interval '3 hours', 'R', 6, 2500);
  insert into participants (first_name,last_name) values ('A','B');
"
```

Puis, en réutilisant les identifiants obtenus, insérer **deux fois** la même `(session_id, participant_id)` en `status='booked'`.
Attendu : la seconde échoue avec `duplicate key value violates unique constraint \"bookings_one_active_per_session\"`.

Nettoyer ensuite :

```bash
supabase db query "delete from bookings; delete from sessions; delete from participants; delete from creneaux;"
```

- [ ] **Étape 5 — Commit**

```bash
git add supabase/migrations
git commit -m "feat: schéma initial espace membre"
```

---

## Task 3 : RLS, GRANT et politiques

**Fichiers :**
- Créer : `supabase/migrations/<timestamp>_rls_policies.sql`

**Pourquoi cette tâche est séparée :** un `GRANT` manquant et une politique manquante produisent le **même** symptôme (`401` / zéro ligne) pour des causes opposées. Les isoler rend le diagnostic possible.

- [ ] **Étape 1 — Créer la migration**

```bash
supabase migration new rls_policies
```

- [ ] **Étape 2 — Écrire les droits et politiques**

```sql
-- 1. RLS partout, sans exception.
alter table accounts      enable row level security;
alter table participants  enable row level security;
alter table creneaux      enable row level security;
alter table subscriptions enable row level security;
alter table sessions      enable row level security;
alter table bookings      enable row level security;

-- 2. GRANT explicite : activer le RLS n'expose pas une table.
--    'authenticated' uniquement — jamais 'anon'.
grant usage on schema public to authenticated;
grant select on creneaux, sessions to authenticated;
grant select on accounts, participants, subscriptions to authenticated;
grant select, insert, update on bookings to authenticated;

-- 3. Le compte courant, résolu depuis le JWT.
create or replace function current_account_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from accounts where auth_user_id = auth.uid();
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from accounts where auth_user_id = auth.uid()), false);
$$;

-- 4. Politiques.
create policy accounts_self_read on accounts for select
  using (auth_user_id = auth.uid() or is_admin());

create policy participants_own_read on participants for select
  using (account_id = current_account_id() or is_admin());

create policy subscriptions_own_read on subscriptions for select
  using (participant_id in (select id from participants
                            where account_id = current_account_id())
         or is_admin());

-- Le catalogue est lisible par tout utilisateur connecté.
create policy creneaux_read on creneaux for select using (true);
create policy sessions_read on sessions for select using (true);

-- Réservations : lecture, création et libération limitées à ses participants.
create policy bookings_own_read on bookings for select
  using (participant_id in (select id from participants
                            where account_id = current_account_id())
         or is_admin());

create policy bookings_own_insert on bookings for insert
  with check (participant_id in (select id from participants
                                 where account_id = current_account_id()));

-- ATTENTION : un UPDATE exige AUSSI une politique SELECT (ci-dessus).
-- Sans elle, la libération d'une place n'échoue pas : elle affecte zéro ligne,
-- silencieusement. C'est le bug le plus difficile à diagnostiquer de ce schéma.
create policy bookings_own_update on bookings for update
  using (participant_id in (select id from participants
                            where account_id = current_account_id()))
  with check (participant_id in (select id from participants
                                 where account_id = current_account_id()));
```

- [ ] **Étape 3 — Appliquer**

```bash
supabase db push
```

- [ ] **Étape 4 — Vérifier que `anon` reste dehors**

```bash
set -a; . ./.env.local; set +a
curl -s -o /dev/null -w "%{http_code}\n" \
  "$SUPABASE_URL/rest/v1/participants?select=id" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY"
```

Attendu : `401`. Un `200` signifierait que `anon` a reçu des droits — à corriger immédiatement.

- [ ] **Étape 5 — Lancer les advisors**

```bash
supabase db advisors
```

Corriger tout ce qui est signalé en `security` avant de continuer.

- [ ] **Étape 6 — Commit**

```bash
git add supabase/migrations
git commit -m "feat: RLS, GRANT authenticated et politiques d'accès"
```

---

## Task 4 : L'arithmétique des crédits en SQL

**Fichiers :**
- Créer : `supabase/migrations/<timestamp>_credits_functions.sql`

**Interfaces produites :** `granted_credits(uuid, date)`, `consumed_credits(uuid)`, `balance(uuid, date)` — consommées par M1 et M2.

Règles appliquées : `SPEC-abonnements-credits.md` §3 (octroi), §5 (consommation), §6 (abonnements multiples).

- [ ] **Étape 1 — Créer la migration**

```bash
supabase migration new credits_functions
```

- [ ] **Étape 2 — Écrire les fonctions**

```sql
-- Octroi : somme sur TOUS les abonnements de la saison (SPEC §6).
-- Un mois entamé est dû en entier ; l'octroi cesse à ends_on.
create or replace function granted_credits(p_participant uuid, p_at date)
returns integer language sql stable as $$
  select coalesce(sum(
    s.credits_per_month * (
        (extract(year  from least(p_at, s.ends_on))::int * 12
       + extract(month from least(p_at, s.ends_on))::int)
      - (extract(year  from s.starts_on)::int * 12
       + extract(month from s.starts_on)::int)
      + 1
    )
  ), 0)::integer
  from subscriptions s
  where s.participant_id = p_participant
    and p_at >= s.starts_on;
$$;

-- Consommation : un COMPTE de réservations actives, jamais un journal de débits.
-- Annuler ne demande donc aucune écriture compensatoire (SPEC §5, règle 1).
-- Les séances annulées par l'atelier ne consomment rien (SPEC §5 bis).
-- NON borné à la fenêtre d'abonnement : les crédits capitalisés restent
-- utilisables après ends_on (SPEC §6 bis), et ces réservations doivent compter.
create or replace function consumed_credits(p_participant uuid)
returns integer language sql stable as $$
  select count(*)::integer
  from bookings b
  join sessions s on s.id = b.session_id
  where b.participant_id = p_participant
    and b.status = 'booked'
    and s.status <> 'cancelled';
$$;

create or replace function balance(p_participant uuid, p_at date default current_date)
returns integer language sql stable as $$
  select granted_credits(p_participant, p_at) - consumed_credits(p_participant);
$$;
```

- [ ] **Étape 3 — Appliquer**

```bash
supabase db push
```

- [ ] **Étape 4 — Écrire le test des bornes d'octroi**

Créer `supabase/tests/credits.sql` :

```sql
begin;
insert into participants (id, first_name, last_name)
  values ('11111111-1111-1111-1111-111111111111','Test','Bornes');
insert into subscriptions (participant_id, season, credits_per_month,
                           monthly_price_cents, starts_on, ends_on)
  values ('11111111-1111-1111-1111-111111111111','2026-2027',2,5500,
          '2026-10-01','2027-06-30');

-- La veille du début : aucun octroi.
select case when granted_credits('11111111-1111-1111-1111-111111111111','2026-09-30') = 0
       then 'OK  veille' else 'FAIL veille' end;
-- Le premier jour : un mois octroyé.
select case when granted_credits('11111111-1111-1111-1111-111111111111','2026-10-01') = 2
       then 'OK  jour 1' else 'FAIL jour 1' end;
-- Mi-décembre : trois mois.
select case when granted_credits('11111111-1111-1111-1111-111111111111','2026-12-15') = 6
       then 'OK  décembre' else 'FAIL décembre' end;
-- Dernier jour : neuf mois.
select case when granted_credits('11111111-1111-1111-1111-111111111111','2027-06-30') = 18
       then 'OK  fin' else 'FAIL fin' end;
-- Après la fin : figé, pas de croissance.
select case when granted_credits('11111111-1111-1111-1111-111111111111','2027-07-15') = 18
       then 'OK  après' else 'FAIL après' end;
rollback;
```

- [ ] **Étape 5 — Exécuter le test**

```bash
supabase db query "$(cat supabase/tests/credits.sql)"
```

Attendu : cinq lignes `OK`. Le `rollback` garantit qu'aucune donnée de test ne subsiste.

- [ ] **Étape 6 — Tester deux abonnements successifs**

Ajouter à `supabase/tests/credits.sql`, dans une seconde transaction : un abonnement à 1 crédit/mois du 2026-10-01 au 2026-12-31, puis un à 2 crédits/mois du 2027-01-01 au 2027-06-30.
Attendu au 2027-06-30 : `3 + 12 = 15`.

- [ ] **Étape 7 — Commit**

```bash
git add supabase/migrations supabase/tests
git commit -m "feat: fonctions granted_credits, consumed_credits et balance"
```

---

## Task 5 : Client Supabase côté serveur

**Fichiers :**
- Créer : `src/lib/supabase.ts`
- Créer : `src/utils/__tests__/supabase-env.test.ts`
- Modifier : `package.json`

**Interfaces produites :** `getServerClient(accessToken?)` et `getAdminClient()`, consommées par toutes les routes de M1 et M2.

- [ ] **Étape 1 — Installer la dépendance**

```bash
pnpm add @supabase/supabase-js
```

- [ ] **Étape 2 — Écrire le test d'abord**

`src/utils/__tests__/supabase-env.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('client Supabase', () => {
  it('n’expose aucune variable Supabase au navigateur', () => {
    const source = readFileSync('src/lib/supabase.ts', 'utf8');
    expect(source).not.toMatch(/PUBLIC_/);
  });

  it('n’utilise pas les clés héritées anon / service_role', () => {
    const source = readFileSync('src/lib/supabase.ts', 'utf8');
    expect(source).not.toMatch(/ANON_KEY|SERVICE_ROLE/);
  });
});
```

- [ ] **Étape 3 — Lancer le test, vérifier qu'il échoue**

```bash
pnpm test src/utils/__tests__/supabase-env.test.ts
```

Attendu : ÉCHEC — `src/lib/supabase.ts` n'existe pas.

- [ ] **Étape 4 — Écrire le client**

`src/lib/supabase.ts` :

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Accès Supabase strictement côté serveur.
 * Aucun préfixe PUBLIC_ : Astro n'expose au navigateur que les variables
 * préfixées ainsi, donc le nommage seul garantit qu'aucune clé ne fuit.
 */
function requireEnv(name: string): string {
  const value = import.meta.env[name] ?? process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

/** Client porté par la session de l'adhérent. Le RLS s'applique. */
export function getServerClient(accessToken?: string): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

/** Client d'administration. Contourne le RLS — réservé aux routes admin. */
export function getAdminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

Note : `Authorization` porte le **JWT de l'utilisateur**, jamais la clé publishable — les nouvelles clés ne sont pas des JWT et y seraient refusées.

- [ ] **Étape 5 — Relancer le test**

```bash
pnpm test src/utils/__tests__/supabase-env.test.ts && pnpm check
```

Attendu : PASS, et aucune erreur de types.

- [ ] **Étape 6 — Commit**

```bash
git add src/lib/supabase.ts src/utils/__tests__/supabase-env.test.ts package.json pnpm-lock.yaml
git commit -m "feat: client Supabase côté serveur"
```

---

## Task 6 : Amorcer les créneaux depuis Keystatic

**Fichiers :**
- Créer : `scripts/seed-creneaux.mjs`
- Créer : `src/utils/__tests__/creneaux-seed.test.ts`

**Consomme :** `getAdminClient()` de la Task 5, la table `creneaux` de la Task 2.

**Source :** `src/content/pages/ateliers-reguliers/index.yaml`, dont les champs `day` et `time` sont du **texte libre** (`"jeudi"`, `"14h – 17h"`). Le script doit donc analyser `time`.

**Décision assumée :** `default_capacity` vaut **6** pour tous les créneaux. La capacité réelle n'existe nulle part dans le contenu et n'a pas encore été fournie par Isabelle (question ouverte n°8). Elle corrigera chaque créneau dans l'écran de M1 ; ce 6 n'est qu'un point de départ, jamais une vérité.

- [ ] **Étape 1 — Écrire le test de l'analyseur d'horaires**

`src/utils/__tests__/creneaux-seed.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { parseTimeRange } from '../../../scripts/seed-creneaux.mjs';

describe('parseTimeRange', () => {
  it('lit un intervalle avec tiret demi-cadratin', () => {
    expect(parseTimeRange('14h – 17h')).toEqual({ start: '14:00', end: '17:00' });
  });

  it('lit un intervalle avec minutes', () => {
    expect(parseTimeRange('9h30 – 12h30')).toEqual({ start: '09:30', end: '12:30' });
  });

  it('lit un intervalle avec tiret simple et sans espaces', () => {
    expect(parseTimeRange('17h30-19h30')).toEqual({ start: '17:30', end: '19:30' });
  });

  it('lève une erreur explicite sur une valeur illisible', () => {
    expect(() => parseTimeRange('me contacter')).toThrow(/illisible/i);
  });
});
```

- [ ] **Étape 2 — Lancer le test, vérifier qu'il échoue**

```bash
pnpm test src/utils/__tests__/creneaux-seed.test.ts
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Étape 3 — Écrire l'analyseur et le script**

`scripts/seed-creneaux.mjs` :

```js
export function parseTimeRange(raw) {
  const match = String(raw).match(/(\d{1,2})h(\d{2})?\s*[–—-]\s*(\d{1,2})h(\d{2})?/);
  if (!match) throw new Error(`Horaire illisible : « ${raw} »`);
  const pad = (h, m) => `${String(h).padStart(2, '0')}:${m ?? '00'}`;
  return { start: pad(match[1], match[2]), end: pad(match[3], match[4]) };
}
```

Puis, dans le même fichier, la partie exécutable : lire le YAML via `reader.singletons.ateliersReguliers.read()`, construire une ligne par créneau (`id = toSlug(name)`, `label = name`, `group_id = group`, horaires analysés, `default_location = location`, `default_capacity = 6`, `default_unit_price_cents = 2500`), et faire un `upsert` sur `creneaux` avec `getAdminClient()`.

Un créneau dont l'horaire est illisible doit **interrompre le script** en nommant le créneau fautif, plutôt que d'insérer une ligne fausse.

- [ ] **Étape 4 — Relancer le test**

```bash
pnpm test src/utils/__tests__/creneaux-seed.test.ts
```

Attendu : PASS.

- [ ] **Étape 5 — Exécuter l'amorçage**

```bash
node --env-file=.env.local scripts/seed-creneaux.mjs
```

- [ ] **Étape 6 — Vérifier**

```bash
supabase db query "select id, label, default_start_time, default_end_time, default_capacity from creneaux order by id;"
```

Attendu : **7 lignes**, correspondant aux 7 créneaux du YAML, horaires cohérents avec le contenu.

- [ ] **Étape 7 — Commit**

```bash
git add scripts/seed-creneaux.mjs src/utils/__tests__/creneaux-seed.test.ts
git commit -m "feat: amorçage des créneaux depuis Keystatic"
```

---

## Task 7 : Rendu hybride et non-régression

**Fichiers :**
- Modifier : `astro.config.mjs` (seulement si nécessaire)

**But :** confirmer que les pages publiques restent prérendues et qu'aucune régression n'est introduite.

- [ ] **Étape 1 — Vérifier que le rendu hybride est déjà actif**

Le build précédent émettait déjà `^/_server-islands/…` : l'adaptateur Vercel est en place et `output` reste `static` avec dérogation par page. Aucune modification n'est attendue — **vérifier avant de changer quoi que ce soit**.

- [ ] **Étape 2 — Construire**

```bash
pnpm build
```

- [ ] **Étape 3 — Vérifier que les pages publiques sont toujours statiques**

```bash
ls .vercel/output/static/ateliers-reguliers/index.html
```

Attendu : le fichier existe. S'il a disparu, une page a basculé en rendu serveur par erreur.

- [ ] **Étape 4 — Vérifier la non-régression complète**

```bash
pnpm test && pnpm check
```

Attendu : tout passe, **`csp.test.ts` compris et sans modification de `src/config/csp.js`** — preuve que l'accès strictement côté serveur ne coûte aucun assouplissement de la politique de sécurité.

- [ ] **Étape 5 — Commit**

```bash
git commit --allow-empty -m "test: vérifie la non-régression du rendu statique et de la CSP"
```

---

## Ce que M0 ne fait pas

Aucune séance n'est créée : elles naissent dans l'interface de M1 (`PRD-espace-membre.md`, « La création des séances »). Aucun compte n'est créé, y compris admin — l'amorçage des deux adresses administratrices appartient à M1, avec l'authentification. Aucune interface, aucune route, aucun e-mail.

## Vérification de fin de jalon

- [ ] `supabase migration list` montre les trois migrations appliquées.
- [ ] `supabase db advisors` ne signale aucun problème de sécurité.
- [ ] Une requête REST avec la clé publishable et sans session répond `401` sur `participants`.
- [ ] `granted_credits` est juste sur les cinq bornes et sur deux abonnements successifs.
- [ ] Les 7 créneaux sont en base avec des horaires exacts.
- [ ] `pnpm build`, `pnpm test` et `pnpm check` passent ; `/ateliers-reguliers/` reste prérendue.
- [ ] `git status` est propre et `.env.local` n'est pas suivi.
