-- LA RÉSERVATION PAYÉE D'UNE PLACE À L'UNITÉ.
--
-- Stages et séances sans engagement se vendent à la date : une place, une
-- séance, un prix — celui de `sessions.unit_price_cents`. Rien à voir avec le
-- forfait, qui achète une saison entière et se provisionne en `subscriptions`.
--
-- L'ADHÉSION EST COMPRISE DANS CES PRIX. Les pages publiques l'écrivent noir
-- sur blanc — « il n'y a rien à régler en plus » — et le parcours d'achat ne
-- doit donc RIEN ajouter, ni demander. C'est la différence de fond avec le
-- forfait, où l'adhésion annuelle de la famille se pose sur le premier
-- versement.

-- ─────────────────────────────────────────────────────────────────────────────
-- De quoi rendre une réservation payée idempotente
-- ─────────────────────────────────────────────────────────────────────────────

alter table bookings add column helloasso_order_id text;

comment on column bookings.helloasso_order_id is
  'La commande qui a paye cette place. Nul pour les places posees par le '
  'forfait, par l''administration ou par l''adherent lui-meme.';

-- L'ANCRE D'IDEMPOTENCE, comme `subscriptions.helloasso_order_id`. Le retour du
-- payeur et la notification HelloAsso arrivent souvent tous les deux, parfois
-- en même temps : c'est la contrainte qui décide, pas l'ordre d'arrivée.
create unique index bookings_commande_unique
  on bookings (helloasso_order_id) where helloasso_order_id is not null;

-- 'achat' rejoint les trois sources existantes. Le distinguer de 'member'
-- importe : une place réglée en ligne ne se reprend pas comme une place posée
-- sur un crédit de forfait, et un remboursement doit pouvoir la retrouver.
alter table bookings drop constraint bookings_source_check;
alter table bookings add constraint bookings_source_check
  check (source = any (array['auto', 'member', 'admin', 'achat']));

-- ─────────────────────────────────────────────────────────────────────────────
-- book_participant porte désormais la commande
-- ─────────────────────────────────────────────────────────────────────────────
--
-- UNE SEULE IMPLÉMENTATION DE LA RÈGLE DES PLACES. Écrire une seconde fonction
-- pour le chemin payant aurait dupliqué le verrou, le contrôle du public, la
-- liste d'attente et le refus des séances annulées — quatre règles qui auraient
-- divergé au premier correctif porté d'un seul côté.
--
-- Le paramètre s'ajoute à la fin, avec une valeur par défaut : les appelants
-- existants (espace membre, administration, inscription d'office) ne changent
-- pas. Il faut passer par un `drop` parce qu'un `create or replace` ne peut pas
-- changer la liste des arguments.

drop function if exists book_participant(uuid, uuid, text, boolean);

create or replace function public.book_participant(
  p_session     uuid,
  p_participant uuid,
  p_source      text,
  p_forcer      boolean default false,
  p_commande    text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_capacity integer;
  v_status   text;
  v_attente  integer;
  v_prises   integer;
  v_en_file  integer;
  v_mienne   uuid;
  v_etat     text;
  v_id       uuid;
  v_public_seance text;
  v_public_pers   text;
begin
  if auth.role() = 'authenticated' and not is_admin() then
    if p_forcer then
      raise exception 'Seule l''administration peut inscrire au-delà des places';
    end if;
    if p_participant not in (
      select id from participants where account_id = current_account_id()
    ) then
      raise exception 'Participant non rattaché à votre compte';
    end if;
  end if;

  -- DÉJÀ PROVISIONNÉE : on rend la place existante sans rien réécrire. Vérifié
  -- avant tout le reste, car une commande rejouée sur une séance devenue
  -- complète doit rendre sa place, non une erreur de capacité.
  if p_commande is not null then
    select id into v_id from bookings where helloasso_order_id = p_commande;
    if found then
      return v_id;
    end if;
  end if;

  select c.audience into v_public_seance
  from sessions s join creneaux c on c.id = s.creneau_id
  where s.id = p_session;

  select audience into v_public_pers from participants where id = p_participant;

  -- 'adulte' → 'adultes' : le singulier décrit une personne, le pluriel un
  -- groupe. Vérifié AVANT le verrou : inutile de verrouiller une ligne pour la
  -- refuser.
  if v_public_seance is not null and v_public_pers is not null
     and v_public_seance <> (v_public_pers || 's') then
    raise exception 'Cette séance est réservée aux %', v_public_seance;
  end if;

  select capacity, status, places_attente
    into v_capacity, v_status, v_attente
  from sessions where id = p_session for update;

  if not found then
    raise exception 'Séance introuvable';
  end if;

  -- Une séance annulée reste refusée, même en forçant : la place n'existe pas,
  -- ce n'est pas une question de nombre.
  if v_status = 'cancelled' then
    raise exception 'Séance annulée : réservation impossible';
  end if;

  select count(*) filter (where status = 'booked'),
         count(*) filter (where status = 'waiting')
    into v_prises, v_en_file
  from bookings where session_id = p_session;

  select id into v_mienne
  from bookings
  where session_id = p_session and participant_id = p_participant and status = 'waiting';

  -- Déjà en attente : on prend la place si elle existe — ou si on force.
  if v_mienne is not null then
    if v_prises >= v_capacity and not p_forcer then
      raise exception 'La place vient d''être prise. Vous restez sur la liste d''attente.';
    end if;
    update bookings
       set status = 'booked',
           helloasso_order_id = coalesce(p_commande, helloasso_order_id)
     where id = v_mienne;
    return v_mienne;
  end if;

  -- Forcer inscrit toujours POUR DE BON, jamais en attente : le geste veut
  -- ajouter quelqu'un à la séance, pas à une file.
  if p_forcer or v_prises < v_capacity then
    v_etat := 'booked';
  elsif v_en_file < v_attente then
    v_etat := 'waiting';
  else
    if v_attente = 0 then
      raise exception 'Séance complète (% places)', v_capacity;
    else
      raise exception 'Séance complète, et la liste d''attente aussi (% en attente)', v_attente;
    end if;
  end if;

  insert into bookings (session_id, participant_id, source, status, helloasso_order_id)
  values (p_session, p_participant, p_source, v_etat, p_commande)
  returning id into v_id;

  return v_id;
end;
$function$;

-- LES DROITS SE REFONT À LA MAIN. Un `drop` emporte les siens, et une fonction
-- recréée revient avec le défaut de Postgres : EXECUTE pour PUBLIC. Ce serait
-- donner à `anon` — le rôle des visiteurs non connectés — l'exécution d'une
-- fonction `security definer` qui pose des inscriptions. On rétablit donc
-- exactement ce qui existait avant : l'adhérent connecté et le serveur.
revoke execute on function book_participant(uuid, uuid, text, boolean, text) from public, anon;
grant  execute on function book_participant(uuid, uuid, text, boolean, text)
  to authenticated, service_role;
