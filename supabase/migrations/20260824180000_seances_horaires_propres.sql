-- Créer des séances dont chacune a SON horaire.
--
-- `create_sessions` recopie les horaires par défaut du créneau sur toutes les
-- dates. C'était exact pour un atelier régulier — le mardi après-midi est à
-- 14 h, les douze fois — et ça devient faux dès qu'on regarde les stages de la
-- saison 2026-2027 :
--
--   • la surjeteuse se tient de 9 h à 13 h le 18 février, et de 14 h à 18 h le
--     8 mai ;
--   • la trousse de 9h30 à 12h30 le 24 octobre, de 14 h à 17 h le 29 décembre ;
--   • le sac de 9h30 à 12h30 deux fois, et de 14 h à 17 h la troisième.
--
-- Un stage n'a pas d'heure habituelle : il se pose là où la salle est libre.
-- Lui en imposer une aurait affiché « 14 h » sur une séance de 9 h, et — plus
-- grave — l'aurait ENVOYÉE À 14 H dans le calendrier iCal et les rappels.
--
-- LE FORMAT EST DU JSONB, et non trois tableaux parallèles. `p_dates date[]`,
-- `p_debuts time[]`, `p_fins time[]` auraient marché tant que les trois
-- gardent la même longueur et le même ordre ; le jour où l'un décale, chaque
-- séance prend l'horaire de sa voisine sans qu'aucune contrainte ne s'y oppose.
-- Un objet par séance rend ce décalage impossible à écrire.
--
-- `create_sessions` DEMEURE, inchangée : les ateliers réguliers ont bien un
-- horaire habituel, et le leur redire date par date serait douze occasions de
-- se tromper là où il n'y en avait aucune.

create or replace function create_sessions_horaires(p_creneau text, p_seances jsonb)
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

  if jsonb_typeof(p_seances) <> 'array' then
    raise exception 'p_seances doit être un tableau JSON';
  end if;

  -- L'heure est composée ICI, comme dans create_sessions, et pour la même
  -- raison : « (date + heure) at time zone 'Europe/Paris' » tient compte du
  -- changement d'heure. Un décalage figé donnerait une heure fausse sur la
  -- moitié de la saison, en silence.
  insert into sessions (creneau_id, starts_at, ends_at, location,
                        capacity, places_attente, unit_price_cents)
  select c.id,
         ((s->>'date')::date + (s->>'debut')::time) at time zone 'Europe/Paris',
         ((s->>'date')::date + (s->>'fin')::time)   at time zone 'Europe/Paris',
         c.default_location,
         c.default_capacity,
         c.places_attente,
         c.default_unit_price_cents
  from creneaux c, jsonb_array_elements(p_seances) as s
  where c.id = p_creneau
  on conflict (creneau_id, starts_at) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

comment on function create_sessions_horaires(text, jsonb) is
  'Cree une seance par entree {date, debut, fin}, chacune avec son horaire. '
  'Pour les stages, dont l''heure varie d''une date a l''autre. Rejouable : '
  'les seances deja presentes sont ignorees, pas dupliquees.';

-- Geste d'administration : appelé avec la clé secrète, jamais par un adhérent.
revoke execute on function create_sessions_horaires(text, jsonb) from public, anon, authenticated;
