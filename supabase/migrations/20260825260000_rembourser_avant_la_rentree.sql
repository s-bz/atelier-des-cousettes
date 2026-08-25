-- REMBOURSER UN FORFAIT QUI N'A PAS ENCORE COMMENCÉ.
--
-- `annuler_pour_remboursement` refermait l'abonnement sur aujourd'hui :
--
--     ends_on = least(ends_on, current_date)
--
-- Ce qui suppose que la saison ait commencé. Or on s'inscrit en août pour une
-- saison qui ouvre le 1er septembre — c'est le cas le plus courant de l'année,
-- et c'est celui sur lequel la fonction s'est cassée au premier remboursement
-- réel : `starts_on` au 1er septembre, `ends_on` ramené au 25 août, et la
-- contrainte `subscription_dates_ordered` refusait la ligne. Isabelle a lu
-- « Libération impossible » et rien ne s'est libéré.
--
-- La borne ne descend donc pas sous le début : un abonnement remboursé avant
-- d'avoir commencé se referme sur son premier jour. Il ne couvre plus aucune
-- séance, ce qui est exactement ce qu'on veut dire.
--
-- LE TEST NE POUVAIT PAS LE VOIR : son abonnement commençait soixante jours
-- plus tôt. Il en gagne un second, qui commence le mois prochain.

create or replace function public.annuler_pour_remboursement(p_commande text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_liberees integer := 0;
  v_gardees  integer := 0;
  v_seances  jsonb;
  v_qui      jsonb;
  v_abo      record;
begin
  create temp table _rendues on commit drop as
  select b.id, b.session_id, b.participant_id
  from bookings b
  join sessions s on s.id = b.session_id
  where b.status in ('booked', 'waiting')
    and s.starts_at > now()
    and (
      b.helloasso_order_id = p_commande
      or b.participant_id in (
        select sub.participant_id from subscriptions sub
        where sub.helloasso_order_id = p_commande
      )
    );

  update bookings b
     set status = 'released',
         released_at = now(),
         credit_retenu = false      -- remboursé, donc sans pénalité
    from _rendues r
   where b.id = r.id;

  get diagnostics v_liberees = row_count;

  select coalesce(jsonb_agg(jsonb_build_object(
           'starts_at', s.starts_at,
           'ends_at',   s.ends_at,
           'location',  s.location,
           'attente',   coalesce((
             select jsonb_agg(a.participant_id order by a.created_at)
             from bookings a
             where a.session_id = s.id and a.status = 'waiting'
           ), '[]'::jsonb)
         ) order by s.starts_at), '[]'::jsonb)
    into v_seances
  from _rendues r
  join sessions s on s.id = r.session_id;

  select jsonb_build_object('prenom', p.first_name, 'email', a.email)
    into v_qui
  from _rendues r
  join participants p on p.id = r.participant_id
  left join accounts a on a.id = p.account_id
  limit 1;

  select count(*) into v_gardees
  from bookings b
  join sessions s on s.id = b.session_id
  where b.status = 'booked'
    and s.starts_at <= now()
    and (
      b.helloasso_order_id = p_commande
      or b.participant_id in (
        select sub.participant_id from subscriptions sub
        where sub.helloasso_order_id = p_commande
      )
    );

  for v_abo in
    select id, starts_on, total_credits from subscriptions
    where helloasso_order_id = p_commande
  loop
    update subscriptions
       set total_credits = case when total_credits is not null then v_gardees else null end,
           credits_per_month = case when total_credits is null then 0 else null end,
           -- JAMAIS AVANT LE DÉBUT : un forfait remboursé en août, pour une
           -- saison qui ouvre en septembre, se referme sur son premier jour.
           ends_on = greatest(v_abo.starts_on, least(ends_on, current_date))
     where id = v_abo.id;
  end loop;

  drop table if exists _rendues;

  return jsonb_build_object(
    'liberees', v_liberees,
    'gardees',  v_gardees,
    'seances',  coalesce(v_seances, '[]'::jsonb),
    'qui',      v_qui
  );
end;
$function$;

revoke execute on function annuler_pour_remboursement(text) from public, anon, authenticated;
grant  execute on function annuler_pour_remboursement(text) to service_role;
