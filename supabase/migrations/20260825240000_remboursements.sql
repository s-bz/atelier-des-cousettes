-- LES REMBOURSEMENTS, REPÉRÉS PUIS CONFIRMÉS.
--
-- Isabelle rembourse depuis le portail HelloAsso — l'API le permettrait, mais
-- `POST /payments/{id}/refund` exige une authentification forte qu'une clé
-- serveur ne sait pas satisfaire. Notre côté ne l'apprenait donc jamais : la
-- personne gardait ses places, son solde passait sous zéro, et elle
-- réapparaissait sur la liste « à facturer ». On remboursait puis on facturait.
--
-- CE QU'ON PEUT LIRE, EN REVANCHE : `GET /organizations/{slug}/payments`
-- accepte `states=Refunded&states=Refunding` et trie par `UpdateDate`. Chaque
-- paiement porte `order.id` — celui-là même que nous gardons dans
-- `helloasso_order_id` — son montant, et le détail de ses remboursements.
-- Aucune authentification forte pour LIRE. La tâche quotidienne suffit.
--
-- RIEN NE SE FAIT SANS ISABELLE. Un remboursement repéré est déposé ici et
-- attend sa confirmation : libérer les places de quelqu'un est irréversible
-- pour lui — sa date part à un autre — et un état mal lu chez HelloAsso ne doit
-- pas vider un planning tout seul.

create table remboursements (
  id             uuid primary key default gen_random_uuid(),

  -- La commande, telle que nous la gardons déjà sur l'abonnement ou la place.
  commande       text not null,
  paiement       text not null unique,

  montant_cents  integer not null,
  -- `Refunded` ou `Refunding` : on garde le mot de HelloAsso plutôt que de le
  -- traduire en booléen, qui perdrait la distinction.
  etat           text not null,

  repere_le      timestamptz not null default now(),
  -- Nul tant qu'Isabelle n'a pas tranché.
  confirme_le    timestamptz,
  -- Ce que la confirmation a fait, pour qu'on puisse le relire six mois plus tard.
  bilan          text
);

comment on table remboursements is
  'Remboursements reperes chez HelloAsso par la tache quotidienne, en attente '
  'de confirmation. La confirmation libere les seances a venir ; les seances '
  'deja suivies ne sont jamais touchees.';

create index remboursements_a_traiter on remboursements (repere_le) where confirme_le is null;

alter table remboursements enable row level security;

/**
 * Libère ce qui n'a pas encore eu lieu, après un remboursement confirmé.
 *
 * UN REMBOURSEMENT, MÊME PARTIEL, LIBÈRE LES SÉANCES NON SUIVIES. C'est la
 * règle posée par l'atelier, et elle a le mérite d'être la même dans les deux
 * cas : ce qui a été vécu reste, ce qui ne l'a pas été repart aux autres.
 *
 * LES SÉANCES PASSÉES NE SONT JAMAIS TOUCHÉES. Quelqu'un qui s'est rétracté en
 * décembre est venu de septembre à décembre ; ces places-là racontent une
 * présence, et les effacer réécrirait l'histoire des feuilles d'appel.
 *
 * SANS PÉNALITÉ. `release_booking` retient le crédit d'une libération à moins
 * de dix jours — c'est la règle du désistement tardif, qui n'a aucun sens ici :
 * la personne ne se désiste pas, elle a été remboursée.
 *
 * LE FORFAIT EST RAMENÉ À CE QUI A ÉTÉ CONSOMMÉ, pour que le solde retombe à
 * zéro. Le laisser à seize après avoir libéré treize places afficherait un
 * crédit qui ne correspond plus à rien, et le supprimer ferait basculer les
 * séances suivies dans « à facturer » — alors qu'elles ont été réglées, et que
 * c'est précisément ce que le remboursement partiel a retenu.
 */
create or replace function public.annuler_pour_remboursement(p_commande text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_liberees integer := 0;
  v_gardees  integer := 0;
  v_abo      record;
begin
  -- Les places à venir de cette commande — par l'abonnement qu'elle a payé,
  -- ou par la place elle-même quand c'est une séance à l'unité.
  with concernees as (
    select b.id, s.starts_at
    from bookings b
    join sessions s on s.id = b.session_id
    where b.status in ('booked', 'waiting')
      and (
        b.helloasso_order_id = p_commande
        or b.participant_id in (
          select sub.participant_id from subscriptions sub
          where sub.helloasso_order_id = p_commande
        )
      )
  )
  update bookings b
     set status = 'released',
         released_at = now(),
         credit_retenu = false      -- remboursé, donc sans pénalité
    from concernees c
   where b.id = c.id
     and c.starts_at > now();

  get diagnostics v_liberees = row_count;

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
    select id, participant_id, total_credits
    from subscriptions where helloasso_order_id = p_commande
  loop
    update subscriptions
       set total_credits = case when total_credits is not null then v_gardees else null end,
           credits_per_month = case when total_credits is null then 0 else null end,
           ends_on = least(ends_on, current_date)
     where id = v_abo.id;
  end loop;

  return jsonb_build_object('liberees', v_liberees, 'gardees', v_gardees);
end;
$function$;

revoke execute on function annuler_pour_remboursement(text) from public, anon, authenticated;
grant  execute on function annuler_pour_remboursement(text) to service_role;
