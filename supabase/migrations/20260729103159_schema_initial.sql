-- Espace membre — schéma initial.
-- Conception : DOCS/PRD-espace-membre.md et DOCS/SPEC-abonnements-credits.md.
--
-- Deux principes structurants :
--   1. Le compte se connecte, le participant vient à l'atelier. Abonnements,
--      réservations et solde portent sur le participant, jamais sur le compte.
--   2. Le solde de crédits n'est JAMAIS stocké : il se calcule (migration
--      credits_functions). Aucune colonne « balance », aucun grand-livre.

create table accounts (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  email         text not null unique,
  phone         text,
  role          text not null default 'member' check (role in ('member','admin')),
  notes         text,
  created_at    timestamptz not null default now()
);

comment on column accounts.role is
  'Source de verite du role. Lu en base a chaque requete, jamais depuis un jeton : '
  'user_metadata est modifiable par l''utilisateur et serait falsifiable.';

-- account_id est NULLABLE et c'est central : une adhérente qui ne veut pas de
-- compte existe quand même. Isabelle la crée, l'abonne et réserve pour elle.
-- Exiger une adresse e-mail obligerait à inventer des adresses factices.
create table participants (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid references accounts(id) on delete set null,
  first_name  text not null,
  last_name   text not null,
  birthdate   date,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Reflète src/content/pages/ateliers-reguliers/index.yaml.
-- Les default_* servent de préremplissage à la création des séances : le
-- calendrier réel est irrégulier et saisi à la main, il n'y a pas de récurrence.
create table creneaux (
  id                        text primary key,
  label                     text not null,
  group_id                  text not null,
  default_start_time        time not null,
  default_end_time          time not null,
  default_location          text not null,
  default_capacity          integer not null check (default_capacity > 0),
  default_unit_price_cents  integer not null check (default_unit_price_cents >= 0),
  constraint creneau_times_ordered check (default_start_time < default_end_time)
);

-- Un participant peut cumuler plusieurs abonnements sur une saison : c'est ainsi
-- qu'on modélise un changement de formule ou une interruption. Ne JAMAIS modifier
-- credits_per_month d'un abonnement existant — cela réécrirait rétroactivement
-- l'octroi des mois déjà consommés.
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

comment on column subscriptions.helloasso_order_id is
  'Nullable : un abonnement saisi a la main n''en a pas et n''en aura peut-etre '
  'jamais. Rien dans le modele ne depend de HelloAsso. Unique pour rendre le '
  'provisionnement par webhook idempotent.';

comment on column subscriptions.credits_per_month is
  '0 est valide : modelise le creneau paye a la seance, sans traitement special.';

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

comment on table bookings is
  'Une reservation liberee n''est JAMAIS supprimee : la ligne released sert de '
  'pierre tombale. L''auto-inscription ecarte toute seance ayant deja une ligne, '
  'quel que soit son statut — sans quoi une place liberee lundi reapparaitrait '
  'mardi.';

-- Partiel sur status='booked' : une même personne n'occupe qu'une place par
-- séance, mais deux sœurs sur la même séance restent deux lignes valides.
create unique index bookings_one_active_per_session
  on bookings (session_id, participant_id)
  where status = 'booked';

create index bookings_participant_status on bookings (participant_id, status);
create index bookings_session            on bookings (session_id);
create index sessions_creneau_starts_at  on sessions (creneau_id, starts_at);
create index subscriptions_participant   on subscriptions (participant_id);
create index participants_account        on participants (account_id);
