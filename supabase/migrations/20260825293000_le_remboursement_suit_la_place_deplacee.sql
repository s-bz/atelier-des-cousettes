-- LE REMBOURSEMENT SUIT LA PLACE, MÊME QUAND ELLE A CHANGÉ DE DATE.
--
-- Suite de `20260825270000`, et le cas s'est produit le jour même. Celui-là
-- avait appris au remboursement à retrouver une place REPRISE SUR LA MÊME DATE.
-- Il restait aveugle à l'autre moitié du geste : une place REPLACÉE SUR UNE
-- AUTRE DATE du même stage.
--
--   · 10:42  un stage est acheté, place posée sur le 24 octobre ;
--   · 10:48  la place est libérée depuis l'administration ;
--   · 10:50  la personne est replacée sur le 21 novembre, même stage ;
--   · 11:08  le remboursement est confirmé : « 0 séance libérée ».
--
-- La portée cherchait la SÉANCE payée. Elle ne trouvait qu'une ligne libérée,
-- ne libérait rien, et n'écrivait donc à personne — l'écran ne prévient que
-- lorsqu'un planning a changé, ce qui est juste, mais ici il aurait dû changer.
-- L'adhérente gardait une place remboursée, sans un mot.
--
-- CE QUI IDENTIFIE LA PLACE PAYÉE, quand sa ligne d'origine est morte : même
-- personne, même créneau, et AUCUNE COMMANDE À ELLE. Cette dernière condition
-- porte tout le poids — quelqu'un peut avoir réglé deux dates du même stage en
-- deux commandes, et en rembourser une ne doit pas lui prendre l'autre. Une
-- seule place est reprise par commande, la plus proche.

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
  v_payee    record;
begin
  /*
   * CE QUE LA COMMANDE A PAYÉ, ligne par ligne.
   *
   * Les lignes libérées comptent : c'est souvent la seule qui porte encore
   * l'identifiant de commande, la place ayant été reprise ou replacée depuis.
   */
  create temp table _cible on commit drop as
  select b.id as booking_id, b.participant_id, b.session_id, s.creneau_id
  from bookings b
  join sessions s on s.id = b.session_id
  where b.helloasso_order_id = p_commande;

  -- La portée sert au décompte des séances déjà suivies et au destinataire :
  -- il faut pouvoir écrire même quand il n'y avait plus rien à rendre.
  create temp table _portee on commit drop as
  select sub.participant_id, null::uuid as session_id
  from subscriptions sub
  where sub.helloasso_order_id = p_commande
  union
  select participant_id, session_id from _cible;

  create temp table _rendues (id uuid, session_id uuid, participant_id uuid) on commit drop;

  -- UNE COMMANDE D'ABONNEMENT COUVRE LA SAISON : toutes les séances à venir.
  insert into _rendues
  select b.id, b.session_id, b.participant_id
  from bookings b
  join sessions s on s.id = b.session_id
  where b.status in ('booked', 'waiting')
    and s.starts_at > now()
    and exists (
      select 1 from subscriptions sub
      where sub.helloasso_order_id = p_commande
        and sub.participant_id = b.participant_id
    );

  -- UNE COMMANDE DE SÉANCE NE COUVRE QUE LA SIENNE : la place payée si elle
  -- tient encore, sinon celle qui l'a remplacée.
  for v_payee in select * from _cible loop
    insert into _rendues
    select b.id, b.session_id, b.participant_id
    from bookings b
    join sessions s on s.id = b.session_id
    where b.id = v_payee.booking_id
      and b.status in ('booked', 'waiting')
      and s.starts_at > now()
      and not exists (select 1 from _rendues r where r.id = b.id);

    if not found then
      insert into _rendues
      select b.id, b.session_id, b.participant_id
      from bookings b
      join sessions s on s.id = b.session_id
      where b.participant_id = v_payee.participant_id
        and s.creneau_id = v_payee.creneau_id
        and b.status in ('booked', 'waiting')
        and s.starts_at > now()
        -- SANS COMMANDE À ELLE : une place réglée à part reste à son
        -- propriétaire, et c'est ce qui empêche d'en prendre deux pour une.
        and b.helloasso_order_id is null
        and not exists (select 1 from _rendues r where r.id = b.id)
      order by s.starts_at
      limit 1;
    end if;
  end loop;

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
  from _portee o
  join participants p on p.id = o.participant_id
  left join accounts a on a.id = p.account_id
  limit 1;

  select count(*) into v_gardees
  from bookings b
  join sessions s on s.id = b.session_id
  join _portee p
    on p.participant_id = b.participant_id
   and (p.session_id is null or p.session_id = b.session_id)
  where b.status = 'booked' and s.starts_at <= now();

  for v_abo in
    select id, starts_on, total_credits from subscriptions
    where helloasso_order_id = p_commande
  loop
    update subscriptions
       set total_credits = case when total_credits is not null then v_gardees else null end,
           credits_per_month = case when total_credits is null then 0 else null end,
           -- Jamais avant le début : un forfait remboursé en août, pour une
           -- saison qui ouvre en septembre, se referme sur son premier jour.
           ends_on = greatest(v_abo.starts_on, least(ends_on, current_date))
     where id = v_abo.id;
  end loop;

  drop table if exists _rendues;
  drop table if exists _portee;
  drop table if exists _cible;

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
