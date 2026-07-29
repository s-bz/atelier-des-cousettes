-- Correction de sécurité : autorisation à l'intérieur des fonctions.
--
-- Constat vérifié après coup. Deux failles cumulées :
--
-- 1. « revoke execute ... from public, anon » ne suffisait pas. Supabase
--    applique des privilèges PAR DÉFAUT qui accordent EXECUTE sur toute
--    nouvelle fonction à anon ET à authenticated. La migration
--    harden_privileges ne les avait retirés que pour anon. Résultat :
--    cancel_session et set_session_capacity, délibérément non accordées,
--    étaient malgré tout appelables par n'importe quel adhérent connecté.
--
-- 2. Plus grave : book_participant et release_booking sont SECURITY DEFINER
--    — indispensable pour poser le verrou et compter toutes les réservations
--    — et accordées à authenticated. Elles contournent donc le RLS. Un
--    adhérent pouvait réserver au nom d'un autre participant, libérer la
--    place de quelqu'un d'autre, ou annuler toute la saison.
--
-- Une fonction SECURITY DEFINER doit porter sa propre autorisation : le RLS
-- ne la protège pas, c'est précisément ce qu'elle contourne.

-- 1. Fermer la porte des privilèges par défaut, pour les deux rôles cette fois.
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- 2. Retirer ce qui n'aurait jamais dû être accordé. Ces deux gestes sont
--    réservés à l'administration, appelée avec la clé secrète.
revoke execute on function cancel_session(uuid)                from public, anon, authenticated;
revoke execute on function set_session_capacity(uuid, integer) from public, anon, authenticated;

-- 3. Autorisation interne pour les deux fonctions que l'adhérent appelle.
--
--    La contrainte ne s'applique qu'au rôle « authenticated ». Les appels
--    faits avec la clé secrète (rôle service_role) ou en console
--    d'administration passent outre : ce sont des contextes déjà privilégiés,
--    et l'écran d'admin vérifie le rôle en base avant d'y arriver.

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
  v_taken    integer;
  v_id       uuid;
begin
  -- Autorisation : un adhérent ne réserve que pour ses propres participants.
  if current_user = 'authenticated' and not is_admin() then
    if p_participant not in (
      select id from participants where account_id = current_account_id()
    ) then
      raise exception 'Participant non rattaché à votre compte';
    end if;
  end if;

  select capacity, status into v_capacity, v_status
  from sessions where id = p_session for update;

  if not found then
    raise exception 'Séance introuvable';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Séance annulée : réservation impossible';
  end if;

  select count(*) into v_taken
  from bookings
  where session_id = p_session and status = 'booked';

  if v_taken >= v_capacity then
    raise exception 'Séance complète (% places)', v_capacity;
  end if;

  insert into bookings (session_id, participant_id, source, status)
  values (p_session, p_participant, p_source, 'booked')
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function release_booking(p_booking uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_participant uuid;
begin
  select participant_id into v_participant from bookings where id = p_booking;
  if not found then
    return false;
  end if;

  -- Autorisation : un adhérent ne libère que les places de ses participants.
  if current_user = 'authenticated' and not is_admin() then
    if v_participant not in (
      select id from participants where account_id = current_account_id()
    ) then
      raise exception 'Réservation non rattachée à votre compte';
    end if;
  end if;

  update bookings
  set status = 'released', released_at = now()
  where id = p_booking and status = 'booked';

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- 4. Réaccorder explicitement, après le create or replace qui a pu remettre
--    les privilèges par défaut.
revoke execute on function book_participant(uuid, uuid, text) from public, anon;
revoke execute on function release_booking(uuid)              from public, anon;
grant  execute on function book_participant(uuid, uuid, text) to authenticated;
grant  execute on function release_booking(uuid)              to authenticated;
