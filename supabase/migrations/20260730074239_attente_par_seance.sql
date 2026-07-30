-- La liste d'attente descend sur la séance, comme la capacité.
--
-- Elle ne vivait que sur le créneau : book_participant y lisait la valeur du
-- moment, si bien que la changer redéfinissait rétroactivement toutes les
-- séances déjà programmées — y compris passées. C'était incohérent avec la
-- capacité, qui est recopiée à la création puis réglable séance par séance, et
-- surtout ingérable : une séance particulièrement demandée ne pouvait pas
-- accueillir plus d'attente que les autres sans les modifier toutes.
--
-- Le créneau garde la sienne : c'est la valeur par défaut, reprise à la
-- création. Exactement le rapport qu'entretiennent déjà default_capacity et
-- capacity.

alter table sessions
  add column places_attente integer not null default 0
    check (places_attente >= 0);

comment on column sessions.places_attente is
  'Inscriptions acceptees au-dela de capacity, pour CETTE seance. Reprise de '
  'creneaux.places_attente a la creation, puis reglable seance par seance.';

-- Report depuis le créneau pour les séances déjà programmées : c'est la valeur
-- qui s'appliquait jusqu'ici, la conserver évite un changement de comportement
-- silencieux.
update sessions s
   set places_attente = c.places_attente
  from creneaux c
 where c.id = s.creneau_id
   and c.places_attente > 0;


-- La création recopie la valeur du créneau, comme elle recopie déjà la
-- capacité, le lieu et le prix.
create or replace function create_sessions(p_creneau text, p_dates date[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_inserted integer;
begin
  if not exists (select 1 from creneaux where id = p_creneau) then
    raise exception 'Créneau inconnu : %', p_creneau;
  end if;

  insert into sessions (creneau_id, starts_at, ends_at, location,
                        capacity, places_attente, unit_price_cents)
  select c.id,
         (d + c.default_start_time) at time zone 'Europe/Paris',
         (d + c.default_end_time)   at time zone 'Europe/Paris',
         c.default_location,
         c.default_capacity,
         c.places_attente,
         c.default_unit_price_cents
  from creneaux c, unnest(p_dates) as d
  where c.id = p_creneau
  on conflict (creneau_id, starts_at) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;


-- Réserver lit désormais la valeur DE LA SÉANCE.
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
  v_mienne   uuid;
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

  select capacity, status, places_attente
    into v_capacity, v_status, v_attente
  from sessions where id = p_session for update;

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

  select id into v_mienne
  from bookings
  where session_id = p_session and participant_id = p_participant and status = 'waiting';

  -- Déjà en attente : on prend la place si elle existe, sinon on le dit
  -- clairement. « Séance complète » laisserait croire à une erreur alors que
  -- quelqu'un a simplement cliqué plus vite.
  if v_mienne is not null then
    if v_prises >= v_capacity then
      raise exception 'La place vient d''être prise. Vous restez sur la liste d''attente.';
    end if;
    update bookings set status = 'booked' where id = v_mienne;
    return v_mienne;
  end if;

  if v_prises < v_capacity then
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

  insert into bookings (session_id, participant_id, source, status)
  values (p_session, p_participant, p_source, v_etat)
  returning id into v_id;

  return v_id;
end;
$$;


-- Régler la liste d'attente d'une séance.
--
-- Descendre sous le nombre de personnes déjà en file est ACCEPTÉ : celles-ci
-- gardent leur rang, seules les suivantes sont refusées. Refuser reviendrait à
-- demander à Isabelle de retirer quelqu'un avant de pouvoir fermer la file, ce
-- qui n'a pas de sens — contrairement à la capacité, où la place existe ou
-- n'existe pas.
create or replace function set_session_waitlist(p_session uuid, p_places integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_places < 0 then
    raise exception 'La liste d''attente ne peut pas être négative';
  end if;

  update sessions set places_attente = p_places where id = p_session;
  if not found then
    raise exception 'Séance introuvable';
  end if;

  return p_places;
end;
$$;

revoke execute on function set_session_waitlist(uuid, integer) from public, anon, authenticated;
