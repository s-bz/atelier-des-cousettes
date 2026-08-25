-- UN REMBOURSEMENT REPREND LE CRÉDIT QU'IL AVAIT DONNÉ.
--
-- `20260825180000` a posé le bon modèle : payer une séance, c'est acheter un
-- crédit ; le poser sur une date, c'est le dépenser. Libérer à temps rend donc
-- le crédit, et l'on rechoisit sa date.
--
-- IL MANQUAIT LA SORTIE. Une fois remboursé, ce crédit n'a plus lieu d'être —
-- on n'a plus rien payé. Constaté sur le premier remboursement de séance : la
-- place libérée, la file vide, le bilan juste… et un solde de 1. La personne
-- gardait une séance à venir prendre, réglée par un argent qu'on venait de lui
-- rendre.
--
-- L'OCTROI SUIT DONC LE REMBOURSEMENT, en lisant `remboursements` : une place
-- achetée dont la commande a été remboursée et confirmée n'octroie plus rien.
-- La ligne reste, avec son identifiant de commande — c'est elle qui raconte ce
-- qui s'est passé.

create or replace function public.granted_credits(p_participant uuid, p_at date)
returns integer
language sql
stable
set search_path to 'public'
as $function$
  select (
    coalesce((
      select sum(
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
      )
      from subscriptions s
      where s.participant_id = p_participant
        and (s.total_credits is not null or p_at >= s.starts_on)
    ), 0)
    +
    -- Chaque séance achetée à l'unité octroie son crédit, à compter du jour où
    -- elle a été payée. Une séance annulée par l'atelier ne l'octroie plus :
    -- elle se rembourse, elle ne se reporte pas.
    coalesce((
      select count(*)
      from bookings b
      join sessions s2 on s2.id = b.session_id
      join creneaux c2 on c2.id = s2.creneau_id
      where b.participant_id = p_participant
        and b.source = 'achat'
        and s2.status <> 'cancelled'
        and c2.kind = 'atelier'
        and b.created_at::date <= p_at
        -- NI UNE SÉANCE REMBOURSÉE : le crédit qu'elle avait donné s'en va
        -- avec l'argent. La ligne demeure, elle raconte ce qui s'est passé.
        and not exists (
          select 1 from remboursements r
          where r.commande = b.helloasso_order_id
            and r.confirme_le is not null
        )
    ), 0)
  )::integer;
$function$;
