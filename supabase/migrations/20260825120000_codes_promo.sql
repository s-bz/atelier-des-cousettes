-- LES CODES DE RÉDUCTION.
--
-- Possibles parce que le site calcule lui-même ce qu'il facture : une intention
-- de paiement porte un montant, et HelloAsso ne connaît aucun catalogue. Une
-- campagne, elle, aurait exigé que HelloAsso sache gérer des codes — ce qu'elle
-- ne sait pas faire. C'est le premier avantage concret du Checkout au-delà de
-- la validation.
--
-- ILS NE PORTENT QUE SUR LE FORFAIT. L'adhésion est une cotisation à
-- l'association, pas un prix qu'on négocie : la remettre reviendrait à inscrire
-- quelqu'un sans qu'il adhère. Le plafond d'une réduction est donc le prix du
-- forfait, jamais le total réglé.
--
-- ILS VALENT PAR INSCRIPTION, NON PAR FAMILLE. Une mère qui inscrit ses deux
-- filles l'emploie deux fois : ce sont bien deux forfaits qu'elle règle.

create table codes_promo (
  id                 uuid primary key default gen_random_uuid(),

  -- Toujours en majuscules : un code se dit à l'oral et se recopie.
  code               text not null unique check (code = upper(code)),
  libelle            text,

  -- L'UN OU L'AUTRE, jamais les deux : « 10 % et 20 € » n'a pas de sens, et
  -- laisser les deux se remplir obligerait le code à trancher un ordre que
  -- personne n'aurait choisi.
  reduction_pourcent integer check (reduction_pourcent between 1 and 100),
  reduction_cents    integer check (reduction_cents > 0),
  constraint une_seule_reduction check (
    (reduction_pourcent is not null)::int + (reduction_cents is not null)::int = 1
  ),

  -- Nul : valable quelle que soit la saison.
  saison             text,
  -- Nul : sans limite de tirage.
  usages_max         integer check (usages_max > 0),
  usages             integer not null default 0 check (usages >= 0),
  -- Dernier jour de validité, inclus.
  expire_le          date,

  archived_at        timestamptz,
  cree_le            timestamptz not null default now()
);

comment on table codes_promo is
  'Reductions sur le forfait seul — jamais sur l''adhesion. Un code vaut par '
  'inscription, non par famille.';

comment on column codes_promo.usages is
  'Compte les usages PAYES : le provisionnement l''incremente, pas la creation '
  'de l''intention. Un panier abandonne ne consomme pas un code a tirage limite.';

create index codes_promo_actifs on codes_promo (code) where archived_at is null;

-- Personne ne lit cette table par le jeton de session : le contrôle d'un code
-- se fait côté serveur, sous la clé secrète. La laisser lisible reviendrait à
-- publier la liste des réductions en cours.
alter table codes_promo enable row level security;

/**
 * Compte un usage. Appelée par le provisionnement, une fois le paiement acquis.
 *
 * `security definer` pour écrire malgré le RLS, et l'exécution est retirée à
 * tout le monde sauf au serveur : un adhérent ne doit pas pouvoir épuiser un
 * code en appelant la fonction.
 */
create or replace function incrementer_usage_code(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update codes_promo set usages = usages + 1
  where code = upper(p_code) and archived_at is null;
$$;

revoke execute on function incrementer_usage_code(text) from public, anon, authenticated;
