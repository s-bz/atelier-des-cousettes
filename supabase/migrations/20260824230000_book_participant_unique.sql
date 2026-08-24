-- Une seule `book_participant`, et c'est celle qui sert.
--
-- CE QUE J'AI CASSÉ. 20260824090000 a rétabli la vérification du public dans
-- `book_participant(uuid, uuid, text)` — la signature qu'il avait sous les yeux
-- dans la migration d'origine. Or celle-ci avait été SUPPRIMÉE le 30 juillet
-- (20260730074649), au profit d'une version à quatre arguments portant
-- `p_forcer`. `create or replace` n'a donc rien remplacé : il a ressuscité une
-- surcharge morte, à côté de la vivante.
--
-- DEUX CONSÉQUENCES, dont une immédiate :
--
--   • PostgREST ne pouvait plus choisir. L'espace membre appelle avec trois
--     arguments nommés, qui correspondent aux deux signatures — le quatrième
--     ayant une valeur par défaut. Toute réservation d'adhérent échouait sur
--     « Could not choose the best candidate function ». La réservation était
--     donc cassée depuis cette migration.
--
--   • La règle que je croyais rétablie ne s'appliquait pas. Elle vivait dans la
--     surcharge que personne n'appelle ; la fonction réellement exécutée n'a
--     jamais cessé d'accepter un enfant sur une séance adulte.
--
-- LA LEÇON : `create or replace function` ne remplace que la MÊME signature.
-- Reprendre le corps d'une ancienne migration sans vérifier ce que la base
-- porte réellement crée une surcharge au lieu de corriger. La définition vivante
-- se lit avec `pg_get_functiondef`, et c'est de là que le corps ci-dessous est
-- repris — inchangé, hormis la vérification insérée.

drop function if exists book_participant(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.book_participant(p_session uuid, p_participant uuid, p_source text, p_forcer boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
grant  execute on function book_participant(uuid, uuid, text, boolean) to authenticated;
