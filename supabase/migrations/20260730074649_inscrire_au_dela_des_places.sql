-- Isabelle peut inscrire au-delà des places.
--
-- La capacité protège d'un remplissage automatique déraisonnable : ni la
-- réservation en ligne ni l'inscription d'office ne doivent la dépasser. Mais
-- elle s'appliquait aussi à Isabelle, qui se retrouvait empêchée d'inscrire
-- quelqu'un dans sa propre salle — alors qu'elle seule sait si une quatrième
-- personne tient ce jour-là.
--
-- Le système ne décide donc plus à sa place ; il demande simplement que le
-- dépassement soit VOULU. Un paramètre explicite, pas une capacité qu'on
-- relèverait pour la circonstance puis qu'on oublierait de redescendre.
--
-- Le drapeau est réservé à l'administration : un adhérent qui l'enverrait
-- depuis son navigateur se verrait refuser. Sans ce contrôle, la capacité ne
-- vaudrait plus rien.

drop function if exists book_participant(uuid, uuid, text);

create function book_participant(
  p_session uuid,
  p_participant uuid,
  p_source text,
  p_forcer boolean default false
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
    if p_forcer then
      raise exception 'Seule l''administration peut inscrire au-delà des places';
    end if;
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
    update bookings set status = 'booked' where id = v_mienne;
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

  insert into bookings (session_id, participant_id, source, status)
  values (p_session, p_participant, p_source, v_etat)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function book_participant(uuid, uuid, text, boolean) from public, anon;
grant execute on function book_participant(uuid, uuid, text, boolean) to authenticated;
