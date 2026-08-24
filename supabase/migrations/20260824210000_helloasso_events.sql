-- LE JOURNAL DES NOTIFICATIONS HELLOASSO, en ajout seul.
--
-- Annoncé par PRD-espace-membre.md §6, et il sert trois choses d'un coup :
-- l'idempotence des webhooks, la file « à traiter » de l'admin, et la piste
-- d'audit le jour où un désaccord surgit sur ce qui a été payé.
--
-- IL S'ÉCRIT AVANT TOUTE INTERPRÉTATION. La charge utile est stockée telle
-- qu'elle est arrivée, sans être comprise : une notification d'un type qu'on
-- n'attendait pas, un tarif inconnu, un JSON malformé — tout atterrit ici. La
-- règle du PRD est qu'aucune commande n'est jamais silencieusement ignorée, et
-- une table qui refuserait ce qu'elle ne sait pas lire la violerait.

create table helloasso_events (
  id           uuid primary key default gen_random_uuid(),

  -- La clé d'idempotence, calculée par src/utils/helloasso.ts : « Order:12345 »
  -- quand la charge utile porte un identifiant, une empreinte de son contenu
  -- sinon. UNIQUE : c'est cette contrainte, et non le code applicatif, qui rend
  -- inoffensives les réémissions de HelloAsso pendant 48 h.
  cle          text not null unique,

  type         text not null,
  identifiant  text,

  -- Le jeton de l'URL de rappel était-il valable ? HelloAsso ne signant pas ses
  -- notifications, ce drapeau ne prouve rien de fort — il ne décide donc de
  -- rien. Une notification non authentifiée est stockée COMME LES AUTRES ; c'est
  -- le provisionnement qui devra relire la commande par l'API avant d'agir.
  authentifie  boolean not null default false,

  charge_utile jsonb not null,
  recu_le      timestamptz not null default now(),

  -- Nul tant que la notification n'a pas été provisionnée. C'est la file
  -- « à traiter » : ce qui reste nul et vieillit demande l'attention d'Isabelle.
  traite_le    timestamptz
);

comment on table helloasso_events is
  'Journal en ajout seul des notifications HelloAsso. Stocke la charge utile '
  'brute avant toute interpretation : aucune commande ne doit jamais etre '
  'silencieusement ignoree.';

comment on column helloasso_events.cle is
  'Cle d''idempotence. « Order:12345 » si la charge utile porte un identifiant, '
  'sinon une empreinte de son contenu — jamais une constante, qui ferait '
  'passer deux notifications illisibles distinctes pour un doublon.';

comment on column helloasso_events.authentifie is
  'Le jeton de l''URL de rappel etait-il valable. Ne conditionne pas '
  'l''enregistrement, seulement la confiance accordee ensuite.';

-- La file « à traiter », triée par ancienneté.
create index helloasso_events_a_traiter
  on helloasso_events (recu_le)
  where traite_le is null;

-- RLS active SANS AUCUNE POLITIQUE : personne n'y accède par le jeton de
-- session. Seule la clé secrète, côté serveur, lit et écrit cette table — elle
-- contient les données de paiement d'autrui.
alter table helloasso_events enable row level security;
