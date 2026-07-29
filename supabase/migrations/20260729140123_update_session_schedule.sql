-- Déplacer une séance : date, horaires, lieu.
--
-- La composition de l'instant reste en SQL, comme à la création : « (date +
-- heure) at time zone 'Europe/Paris' » tient compte du changement d'heure. Une
-- séance déplacée du 15 octobre au 5 novembre change de décalage UTC ; le
-- recalculer dans l'application obligerait à dupliquer cette règle, et à la
-- dupliquer juste.
--
-- Les réservations SUIVENT la séance : c'est la même séance à une autre date,
-- pas une annulation suivie d'une création. Personne ne perd sa place et aucun
-- crédit ne bouge.
create or replace function update_session_schedule(
  p_session  uuid,
  p_date     date,
  p_start    time,
  p_end      time,
  p_location text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if p_start >= p_end then
    raise exception 'L''heure de fin doit suivre l''heure de début';
  end if;

  select status into v_status from sessions where id = p_session;
  if not found then
    raise exception 'Séance introuvable';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Séance annulée : la déplacer n''aurait aucun effet';
  end if;

  update sessions
  set starts_at = (p_date + p_start) at time zone 'Europe/Paris',
      ends_at   = (p_date + p_end)   at time zone 'Europe/Paris',
      location  = p_location
  where id = p_session;

exception
  -- L'index unique (creneau_id, starts_at) interdit deux séances du même
  -- créneau au même instant. Le message brut de Postgres serait illisible.
  when unique_violation then
    raise exception 'Une séance de ce créneau existe déjà à cette date et cette heure';
end;
$$;

revoke execute on function update_session_schedule(uuid, date, time, time, text)
  from public, anon, authenticated;
