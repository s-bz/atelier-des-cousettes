-- Correction de la correction précédente.
--
-- La migration 20260729122131 gardait les fonctions par
-- « if current_user = 'authenticated' then … ». C'était sans effet :
-- DANS une fonction SECURITY DEFINER, current_user vaut le PROPRIÉTAIRE de la
-- fonction, jamais l'appelant. La condition n'était donc jamais vraie et la
-- vérification d'appartenance ne s'exécutait pas — la faille restait ouverte.
--
-- Le test supabase/tests/autorisation.sql l'a révélé : la tentative de
-- réservation pour le participant d'un autre compte réussissait.
--
-- On s'appuie désormais sur auth.role(), qui lit la revendication « role » du
-- JWT porté par la requête :
--   'authenticated' → un adhérent connecté, on vérifie l'appartenance
--   'service_role'  → appel serveur avec la clé secrète, déjà privilégié
--   NULL            → SQL direct (migrations, console), non concerné

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
  if auth.role() = 'authenticated' and not is_admin() then
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

  if auth.role() = 'authenticated' and not is_admin() then
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

revoke execute on function book_participant(uuid, uuid, text) from public, anon;
revoke execute on function release_booking(uuid)              from public, anon;
grant  execute on function book_participant(uuid, uuid, text) to authenticated;
grant  execute on function release_booking(uuid)              to authenticated;
