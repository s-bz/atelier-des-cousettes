-- LIBÉRER SANS PRÉVENIR N'EST PAS LIBÉRER.
--
-- La confirmation d'un remboursement rendait les séances à venir, et personne
-- n'en savait rien : ni l'adhérent, qui voyait seize dates disparaître de son
-- planning sans un mot, ni les gens sur liste d'attente, à qui ces places
-- étaient pourtant destinées.
--
-- CE SILENCE VENAIT D'UN CONTOURNEMENT ASSUMÉ. `release_booking` retient le
-- crédit d'une libération à moins de dix jours — la règle du désistement
-- tardif, qui n'a aucun sens pour quelqu'un qui a été remboursé — alors la
-- fonction écrivait directement dans `bookings`. Ce faisant, elle a aussi sauté
-- ce que `release_booking` fait d'autre : recenser la liste d'attente.
--
-- La fonction rend désormais de quoi écrire à tout le monde : les séances
-- rendues, et pour chacune les personnes qui l'attendaient.

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
  -- Les places à venir de cette commande — par l'abonnement qu'elle a payé, ou
  -- par la place elle-même quand c'est une séance à l'unité.
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

  -- QUI ATTENDAIT CES PLACES. Recensé APRÈS la libération : c'est l'état que
  -- les personnes en attente vont trouver si elles cliquent.
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

  -- À QUI ÉCRIRE. Une commande ne concerne qu'une personne ; on prend la
  -- première, et son adresse est celle de son foyer.
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

  -- Le forfait retombe sur ce qui a été suivi : solde nul, rien à facturer.
  for v_abo in
    select id, total_credits from subscriptions where helloasso_order_id = p_commande
  loop
    update subscriptions
       set total_credits = case when total_credits is not null then v_gardees else null end,
           credits_per_month = case when total_credits is null then 0 else null end,
           ends_on = least(ends_on, current_date)
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Le mot qu'on doit à l'adhérent
-- ─────────────────────────────────────────────────────────────────────────────

insert into email_templates (id, label, description, subject, body, variables) values
(
  'remboursement',
  'Inscription annulée — après un remboursement',
  'Part à l''adhérent quand Isabelle confirme un remboursement. Il voit sinon ses dates disparaître de son planning sans explication.',
  'Votre inscription a été annulée',
  E'Bonjour,\n\nVotre remboursement est enregistré, et l''inscription de {{prenom}} prend fin.\n\n{{dates}}\n\nLes séances déjà suivies restent acquises : elles ne sont pas effacées de votre historique.\n\nUne question, ou l''envie de revenir ? Écrivez-nous, ce sera avec plaisir.',
  '{prenom,dates,lien_espace}'
);
