-- LE REMBOURSEMENT SUIT LA SÉANCE, PAS LA LIGNE DE RÉSERVATION.
--
-- Cas réel, et il ne se devine pas : quelqu'un achète une séance, la libère à
-- temps — son crédit lui revient — puis repose ce crédit sur LA MÊME DATE. La
-- nouvelle ligne est une réservation d'adhérent : `source = 'member'`, sans
-- identifiant de commande. Le remboursement arrive ensuite, et ne trouve rien :
-- il cherchait `helloasso_order_id = <commande>`, qui ne vit plus que sur la
-- ligne libérée.
--
-- Résultat : « 0 séance libérée », aucun courriel, et la personne garde une
-- place qu'on vient de lui rembourser.
--
-- ON REMONTE DONC À CE QUE LA COMMANDE A PAYÉ, et non à la ligne qui le portait :
--
--   · une commande d'ABONNEMENT couvre la saison — toutes les séances à venir
--     de cette personne s'en vont ;
--   · une commande de SÉANCE ne couvre que sa date — on libère la place de
--     cette personne SUR CETTE SÉANCE-LÀ, quelle qu'en soit l'origine, et on ne
--     touche pas aux autres séances qu'elle aurait réglées à part.
--
-- Cette seconde distinction n'est pas de la prudence gratuite : quelqu'un peut
-- avoir acheté trois séances en trois commandes. En rembourser une ne doit pas
-- lui prendre les deux autres.

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
  /*
   * CE QUE LA COMMANDE A PAYÉ.
   *
   * Les lignes libérées comptent : c'est souvent la seule qui porte encore
   * l'identifiant de commande, la place ayant été reprise depuis sous une autre
   * origine.
   */
  create temp table _portee on commit drop as
  -- Une commande d'abonnement : toute la personne.
  select sub.participant_id, null::uuid as session_id
  from subscriptions sub
  where sub.helloasso_order_id = p_commande
  union
  -- Une commande de séance : cette personne, sur cette séance.
  select b.participant_id, b.session_id
  from bookings b
  where b.helloasso_order_id = p_commande;

  create temp table _rendues on commit drop as
  select b.id, b.session_id, b.participant_id
  from bookings b
  join sessions s on s.id = b.session_id
  join _portee p
    on p.participant_id = b.participant_id
   and (p.session_id is null or p.session_id = b.session_id)
  where b.status in ('booked', 'waiting')
    and s.starts_at > now();

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

  -- À QUI ÉCRIRE. Depuis la portée, et non depuis ce qui a été libéré : il faut
  -- pouvoir prévenir même quand il n'y avait plus rien à rendre.
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
