-- Un jeton par compte, pour s'abonner au calendrier des séances.
--
-- Google, Apple et Outlook vont chercher un calendrier partagé par une simple
-- requête HTTP, sans cookie ni en-tête d'authentification : le secret ne peut
-- donc vivre que dans l'URL. C'est ainsi que Google lui-même distribue
-- l'« adresse secrète au format iCal » de ses propres agendas.
--
-- CE FLUX PORTE DES NOMS DE PERSONNES. Le jeton est donc un uuid v4 tiré au
-- hasard — pas l'identifiant du compte, qui se devine dès qu'on l'a vu ailleurs
-- — et il est propre à chaque compte, ce qui permet de le renouveler pour l'une
-- sans couper l'abonnement de l'autre.
--
-- Un abonnement fuité se révoque en une ligne :
--   update accounts set calendar_token = gen_random_uuid() where email = '…';

alter table accounts
  add column calendar_token uuid not null default gen_random_uuid();

comment on column accounts.calendar_token is
  'Secret de l''URL d''abonnement au calendrier des seances. '
  'Le renouveler revoque les abonnements existants de ce compte.';

-- Recherché à chaque rafraîchissement du calendrier, soit plusieurs fois par
-- jour et par abonné.
create unique index accounts_calendar_token on accounts (calendar_token);
