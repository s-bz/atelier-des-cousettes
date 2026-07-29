-- Création groupée de séances à partir d'un créneau et d'une liste de dates.
--
-- Il n'y a PAS de moteur de récurrence, et il ne doit pas y en avoir : les
-- dates réelles sont irrégulières et choisies à la main (le jeudi après-midi
-- tombe les 18/09, 02 et 09/10, 06 et 20/11…, et le mardi ne suit aucune
-- règle). Modéliser une récurrence serait mentir sur les données.
--
-- L'HEURE EST COMPOSÉE ICI, ET NON DANS L'APPLICATION. « (date + heure) at
-- time zone 'Europe/Paris' » interprète l'instant en heure locale française et
-- tient compte du changement d'heure : un créneau de 14h vaut 12h00 UTC en
-- octobre et 13h00 UTC en novembre. Un décalage figé (+02:00) donnerait une
-- heure fausse sur la moitié de la saison, silencieusement.

-- Deux séances du même créneau ne peuvent pas commencer au même instant.
-- Rend la création rejouable : relancer avec les mêmes dates n'ajoute rien.
create unique index if not exists sessions_creneau_starts_at_unique
  on sessions (creneau_id, starts_at);

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
                        capacity, unit_price_cents)
  select c.id,
         (d + c.default_start_time) at time zone 'Europe/Paris',
         (d + c.default_end_time)   at time zone 'Europe/Paris',
         c.default_location,
         c.default_capacity,
         c.default_unit_price_cents
  from creneaux c, unnest(p_dates) as d
  where c.id = p_creneau
  on conflict (creneau_id, starts_at) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

comment on function create_sessions(text, date[]) is
  'Cree une seance par date, aux valeurs par defaut du creneau. Rejouable : '
  'les dates deja presentes sont ignorees, pas dupliquees.';

-- Geste d'administration : appelé avec la clé secrète, jamais par un adhérent.
revoke execute on function create_sessions(text, date[]) from public, anon, authenticated;
