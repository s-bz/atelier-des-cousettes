-- Opérations de réservation. Règles : DOCS/SPEC-abonnements-credits.md §5, §5 bis.
--
-- Pourquoi ces opérations sont en SQL et non dans l'application : vérifier la
-- capacité puis insérer depuis Astro est une séquence non atomique. Deux
-- requêtes simultanées peuvent chacune constater « il reste une place » et
-- insérer toutes les deux. Le verrou de ligne pris sur la séance sérialise les
-- candidats — c'est la seule façon de rendre la capacité réellement opposable.

-- Réserve une place.
--
-- Le dépassement de crédits est AUTORISÉ et non bloqué (§5 règle 3) : quelqu'un
-- qui veut venir une fois de plus doit pouvoir le faire, quitte à être facturé.
-- Seule la capacité physique de l'atelier s'y oppose.
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
  -- « for update » verrouille la ligne jusqu'à la fin de la transaction :
  -- une seconde réservation concurrente sur la même séance attend ici.
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

-- Libère une place. Le crédit revient sans écriture compensatoire : la ligne
-- sort simplement du compte des réservations actives (§5 règle 1).
--
-- La ligne n'est JAMAIS supprimée. Elle sert de pierre tombale : l'auto-
-- inscription écarte toute séance ayant déjà une ligne, quel que soit son
-- statut. Sans cela, une place libérée lundi réapparaîtrait mardi.
create or replace function release_booking(p_booking uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  update bookings
  set status = 'released', released_at = now()
  where id = p_booking and status = 'booked';

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- Annulation d'une séance par l'atelier : libère TOUTES les réservations, les
-- crédits reviennent intégralement (§5 bis).
--
-- C'est la seule exception à « ne pas venir consomme le crédit » : le crédit
-- n'est dû que si la place a réellement été tenue à disposition, ce qui n'est
-- pas le cas ici. Renvoie le nombre de personnes concernées, pour que l'écran
-- d'admin puisse l'annoncer avant de confirmer.
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
  set status = 'released', released_at = now()
  where session_id = p_session and status = 'booked';

  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

-- Modifie la capacité d'une séance, en refusant de descendre sous le nombre de
-- réservations actives. Le système ne choisit jamais qui exclure : c'est à
-- Isabelle de libérer quelqu'un d'abord, en connaissance de cause.
create or replace function set_session_capacity(p_session uuid, p_capacity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_taken integer;
begin
  select count(*) into v_taken
  from bookings
  where session_id = p_session and status = 'booked';

  if p_capacity < v_taken then
    raise exception 'Capacité % inférieure aux % réservations en cours',
      p_capacity, v_taken;
  end if;

  update sessions set capacity = p_capacity where id = p_session;

  if not found then
    raise exception 'Séance introuvable';
  end if;
end;
$$;

-- Droits. Postgres accorde EXECUTE au pseudo-rôle PUBLIC par défaut : révoquer
-- pour « anon » seul ne suffirait pas.
revoke execute on function book_participant(uuid, uuid, text)  from public, anon;
revoke execute on function release_booking(uuid)               from public, anon;
revoke execute on function cancel_session(uuid)                from public, anon;
revoke execute on function set_session_capacity(uuid, integer) from public, anon;

-- L'adhérent réserve et libère ses propres places ; le RLS de « bookings »
-- reste opposable, la fonction étant security definer mais insérant une ligne
-- soumise aux politiques applicatives via l'écran appelant.
grant execute on function book_participant(uuid, uuid, text) to authenticated;
grant execute on function release_booking(uuid)              to authenticated;

-- Annuler une séance et modifier une capacité sont des gestes d'administration,
-- appelés avec la clé secrète. Volontairement NON accordés à « authenticated ».
