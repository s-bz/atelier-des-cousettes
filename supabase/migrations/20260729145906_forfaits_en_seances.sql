-- Forfaits en nombre de séances, à côté des forfaits mensuels.
--
-- Les deux existent réellement dans les tarifs :
--   « 2 ateliers/mois, 55 €/mois »  → droit MENSUEL, deux séances chaque mois
--   « Forfait 10 séances, 33 €/mois » → PAQUET, dix séances pour la saison
--
-- Le paiement est mensuel dans les deux cas, mais c'est la trésorerie
-- d'Isabelle, pas le droit — et l'application n'encaisse rien.
--
-- La différence est réelle : avec un paquet, on peut en utiliser quatre en
-- octobre. Le modèle mensuel l'interdit, et l'approximer par « 1 par mois
-- pendant dix mois » supprimerait précisément la souplesse achetée.
--
-- Un même créneau porte souvent les deux : le samedi après-midi compte vingt
-- séances, et l'on y souscrit dix ou vingt. Ce n'est donc pas une propriété de
-- la séance mais de l'abonnement.

alter table subscriptions
  alter column credits_per_month drop not null,
  add column total_credits integer check (total_credits >= 0);

-- Exactement l'un des deux : un abonnement sans droit n'a pas de sens, et un
-- abonnement qui en porterait deux rendrait l'octroi ambigu.
alter table subscriptions
  add constraint subscription_un_seul_droit check (
    (credits_per_month is not null and total_credits is null)
 or (credits_per_month is null and total_credits is not null)
  );

comment on column subscriptions.total_credits is
  'Forfait en nombre de seances pour la saison entiere. Exclusif de '
  'credits_per_month. Acquis en totalite des le debut : c''est ce qui permet '
  'd''en utiliser plusieurs le meme mois.';

-- Octroi : mensuel comme avant, ou paquet acquis d'un coup.
--
-- Un paquet est ENTIÈREMENT acquis dès starts_on. C'est le sens de l'achat :
-- dix séances à placer où l'on veut dans la saison. L'étaler mois par mois
-- reviendrait à vendre un forfait mensuel sous un autre nom.
create or replace function granted_credits(p_participant uuid, p_at date)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(sum(
    case
      when s.total_credits is not null then s.total_credits
      else s.credits_per_month * (
            (extract(year  from least(p_at, s.ends_on))::int * 12
           + extract(month from least(p_at, s.ends_on))::int)
          - (extract(year  from s.starts_on)::int * 12
           + extract(month from s.starts_on)::int)
          + 1
        )
    end
  ), 0)::integer
  from subscriptions s
  where s.participant_id = p_participant
    and p_at >= s.starts_on;
$$;
