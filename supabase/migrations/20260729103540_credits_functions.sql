-- L'arithmétique des crédits. Règles : DOCS/SPEC-abonnements-credits.md §3, §5, §6.
--
-- Le solde n'est jamais stocké. Il se déduit de deux faits déjà en base :
-- les abonnements et les réservations actives. Un solde stocké dérive
-- (annulation sans écriture compensatoire, job rejoué, migration relancée) ;
-- ici il est recalculable à tout instant et ne peut donc pas être « faux ».
-- Le report de saison n'est pas une fonctionnalité : c'est une conséquence.

-- Octroi : somme sur TOUS les abonnements de la saison (§6), ce qui rend un
-- changement de formule ou une interruption exacts sans traitement particulier.
-- Un mois entamé est dû en entier (§3) ; l'octroi cesse à ends_on.
create or replace function granted_credits(p_participant uuid, p_at date)
returns integer
language sql
stable
as $$
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
-- Conséquence : annuler ne demande aucune écriture compensatoire (§5 règle 1),
-- et aucun chemin de code ne peut rendre un crédit deux fois.
--
-- Une séance annulée par l'atelier ne consomme rien (§5 bis) : la place n'a pas
-- été tenue à disposition.
--
-- DÉLIBÉRÉMENT non borné à la fenêtre d'abonnement : après une résiliation, les
-- crédits déjà payés restent utilisables jusqu'en juin (§6 bis), donc sur des
-- séances postérieures à ends_on. Les exclure ferait que le solde ne
-- diminuerait plus jamais pour qui a résilié — une fuite silencieuse.
create or replace function consumed_credits(p_participant uuid)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from bookings b
  join sessions s on s.id = b.session_id
  where b.participant_id = p_participant
    and b.status = 'booked'
    and s.status <> 'cancelled';
$$;

create or replace function balance(p_participant uuid, p_at date default current_date)
returns integer
language sql
stable
as $$
  select granted_credits(p_participant, p_at) - consumed_credits(p_participant);
$$;

comment on function balance(uuid, date) is
  'Solde de credits d''un participant. Negatif = seances supplementaires a '
  'facturer : reserver a solde nul est autorise et signale, jamais bloque.';

grant execute on function granted_credits(uuid, date)  to authenticated;
grant execute on function consumed_credits(uuid)       to authenticated;
grant execute on function balance(uuid, date)          to authenticated;
