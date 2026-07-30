-- Deux règles nouvelles : la liste d'attente, et l'annulation tardive.
--
-- LISTE D'ATTENTE. Une séance complète refusait purement et simplement. Or trois
-- places se libèrent souvent — un empêchement, un report — et personne ne le
-- savait à temps. Chaque créneau accepte donc X inscriptions au-delà de sa
-- capacité : elles attendent, et prennent la place dès qu'une se libère.
--
-- ANNULATION TARDIVE. Se désister la veille laisse une place vide qu'on ne
-- comble plus, et le crédit revenait quand même. Passé 48 h avant la séance, la
-- place est bien rendue — quelqu'un de la liste d'attente peut la prendre — mais
-- la séance reste due. C'est la règle usuelle, et la seule qui protège à la fois
-- l'atelier et celui qui attendait une place.

alter table creneaux
  add column places_attente integer not null default 0
    check (places_attente >= 0);

comment on column creneaux.places_attente is
  'Inscriptions acceptees AU-DELA de la capacite. Elles attendent qu''une place '
  'se libere, et sont promues automatiquement dans l''ordre d''arrivee. 0 : pas '
  'de liste d''attente, une seance complete refuse.';


-- « waiting » rejoint les statuts. Le crédit n'est PAS consommé tant qu'on
-- attend : on n'a pas de place, on ne paie donc rien.
alter table bookings drop constraint bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('booked', 'waiting', 'released'));

-- Une séance dont on s'est désisté trop tard reste due. Le drapeau porte cette
-- exception, plutôt qu'un quatrième statut : la ligne EST libérée — la place
-- repart — et seul le crédit ne revient pas.
alter table bookings
  add column credit_retenu boolean not null default false;

comment on column bookings.credit_retenu is
  'Seance due bien que la place ait ete rendue : desistement a moins de 48 h. '
  'Compte dans consumed_credits comme une place occupee.';

-- L'unicité couvre désormais les deux états actifs : on ne peut pas être à la
-- fois inscrit et en attente sur la même séance.
drop index bookings_one_active_per_session;
create unique index bookings_one_active_per_session
  on bookings (session_id, participant_id)
  where status in ('booked', 'waiting');


-- 1. Consommation — une annulation tardive compte comme une présence.
create or replace function consumed_credits(p_participant uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer
  from bookings b
  join sessions s on s.id = b.session_id
  join creneaux c on c.id = s.creneau_id
  where b.participant_id = p_participant
    and (b.status = 'booked' or b.credit_retenu)
    and s.status <> 'cancelled'
    and c.kind = 'atelier';
$$;


-- 2. Séances supplémentaires — même règle : ce qui est dû est facturable.
create or replace function extra_sessions(p_participant uuid)
returns table (
  booking_id       uuid,
  session_id       uuid,
  starts_at        timestamptz,
  creneau_label    text,
  unit_price_cents integer
)
language plpgsql
stable
set search_path = public
as $$
declare
  r record;
  v_consommes integer := 0;
begin
  for r in
    select b.id as booking_id,
           s.id as session_id,
           s.starts_at,
           c.label as creneau_label,
           s.unit_price_cents,
           granted_credits(p_participant, s.starts_at::date) as octroye_alors
    from bookings b
    join sessions s on s.id = b.session_id
    join creneaux c on c.id = s.creneau_id
    where b.participant_id = p_participant
      and (b.status = 'booked' or b.credit_retenu)
      and s.status <> 'cancelled'
      and c.kind = 'atelier'
    order by s.starts_at, b.id
  loop
    if v_consommes < r.octroye_alors then
      v_consommes := v_consommes + 1;
    else
      booking_id       := r.booking_id;
      session_id       := r.session_id;
      starts_at        := r.starts_at;
      creneau_label    := r.creneau_label;
      unit_price_cents := r.unit_price_cents;
      return next;
    end if;
  end loop;
end;
$$;


-- 3. Réserver, ou prendre rang.
--
-- Le verrou de ligne sur la séance sérialise le calcul : deux inscriptions
-- simultanées sur la dernière place doivent en voir une passer en attente, pas
-- les accepter toutes deux.
create or replace function book_participant(
  p_session uuid,
  p_participant uuid,
  p_source text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_status   text;
  v_attente  integer;
  v_prises   integer;
  v_en_file  integer;
  v_etat     text;
  v_id       uuid;
begin
  if auth.role() = 'authenticated' and not is_admin() then
    if p_participant not in (
      select id from participants where account_id = current_account_id()
    ) then
      raise exception 'Participant non rattaché à votre compte';
    end if;
  end if;

  select s.capacity, s.status, c.places_attente
    into v_capacity, v_status, v_attente
  from sessions s
  join creneaux c on c.id = s.creneau_id
  where s.id = p_session
  for update of s;

  if not found then
    raise exception 'Séance introuvable';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Séance annulée : réservation impossible';
  end if;

  select count(*) filter (where status = 'booked'),
         count(*) filter (where status = 'waiting')
    into v_prises, v_en_file
  from bookings where session_id = p_session;

  if v_prises < v_capacity then
    v_etat := 'booked';
  elsif v_en_file < v_attente then
    v_etat := 'waiting';
  else
    -- Le message distingue les deux causes : « complet » sans liste d'attente
    -- et « liste d'attente pleine » n'appellent pas la même réaction.
    if v_attente = 0 then
      raise exception 'Séance complète (% places)', v_capacity;
    else
      raise exception 'Séance complète, et la liste d''attente aussi (% en attente)', v_attente;
    end if;
  end if;

  insert into bookings (session_id, participant_id, source, status)
  values (p_session, p_participant, p_source, v_etat)
  returning id into v_id;

  return v_id;
end;
$$;


-- 4. Libérer : la règle des 48 h, et la promotion de la liste d'attente.
--
-- Le type de retour change — il faut dire ce qui s'est passé, l'appelant ne
-- pouvant pas le deviner : la séance est-elle due, et qui a pris la place ?
drop function if exists release_booking(uuid);

create function release_booking(p_booking uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant uuid;
  v_session     uuid;
  v_statut      text;
  v_debut       timestamptz;
  v_tardif      boolean;
  v_promu       uuid;
begin
  select b.participant_id, b.session_id, b.status, s.starts_at
    into v_participant, v_session, v_statut, v_debut
  from bookings b
  join sessions s on s.id = b.session_id
  where b.id = p_booking;

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  -- auth.role() et NON current_user : dans une fonction security definer,
  -- current_user vaut le propriétaire et ce contrôle ne ferait jamais rien.
  if auth.role() = 'authenticated' and not is_admin() then
    if v_participant not in (
      select id from participants where account_id = current_account_id()
    ) then
      raise exception 'Réservation non rattachée à votre compte';
    end if;
  end if;

  if v_statut <> 'booked' and v_statut <> 'waiting' then
    return jsonb_build_object('ok', false);
  end if;

  -- Une place en attente n'a jamais été due : s'en retirer ne coûte rien, quel
  -- que soit le délai.
  v_tardif := v_statut = 'booked' and v_debut - now() < interval '48 hours';

  update bookings
     set status = 'released',
         released_at = now(),
         credit_retenu = v_tardif
   where id = p_booking;

  -- La place rendue revient au premier de la file, même tardivement : c'est
  -- précisément quand une place se libère à la dernière minute qu'une liste
  -- d'attente sert à quelque chose.
  if v_statut = 'booked' then
    update bookings
       set status = 'booked'
     where id = (
       select id from bookings
       where session_id = v_session and status = 'waiting'
       order by created_at
       limit 1
     )
    returning participant_id into v_promu;
  end if;

  return jsonb_build_object(
    'ok', true,
    'tardif', v_tardif,
    'promu', v_promu
  );
end;
$$;


-- 5. Annuler une séance libère AUSSI la liste d'attente, et ne retient rien.
--
-- C'est l'atelier qui annule : le crédit revient intégralement, y compris à
-- quelqu'un qui se serait désisté tardivement d'une séance finalement annulée.
create or replace function cancel_session(p_session uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_released integer;
begin
  update sessions set status = 'cancelled' where id = p_session;

  if not found then
    raise exception 'Séance introuvable';
  end if;

  update bookings
     set status = 'released', released_at = now(), credit_retenu = false
   where session_id = p_session and status in ('booked', 'waiting');

  get diagnostics v_released = row_count;
  return v_released;
end;
$$;


revoke execute on function release_booking(uuid) from public, anon;
grant execute on function release_booking(uuid) to authenticated;


-- Le message annonçant qu'une place s'est libérée.
insert into email_templates (id, label, description, subject, body, variables) values
('promotion_attente',
 'Une place s''est libérée',
 'Envoyé automatiquement à la première personne de la liste d''attente lorsqu''une place se libère.',
 'Une place pour vous — {{date}}',
 'Bonjour,

Une place vient de se libérer : {{prenom}} était en liste d''attente pour
l''atelier du {{date}}, de {{heure_debut}} à {{heure_fin}}, à {{lieu}}.

L''inscription est faite, il n''y a rien à confirmer.

Un empêchement ? Libérez la place depuis votre espace :

{{lien_planning}}

À bientôt,
L''Atelier des Cousettes',
 array['prenom','date','heure_debut','heure_fin','lieu','lien_planning','lien_espace'])
on conflict (id) do nothing;

-- Le rappel passe à trois jours : à deux, il arrivait quand les 48 h étaient
-- déjà écoulées, et prévenir quelqu'un trop tard pour qu'il puisse changer de
-- date est pire que ne rien lui dire.
update email_templates
   set description = 'Envoyé automatiquement trois jours avant chaque séance réservée.',
       updated_at = now()
 where id = 'rappel';
