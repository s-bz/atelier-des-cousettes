-- La liste d'attente PRÉVIENT, elle n'inscrit pas.
--
-- La première version promouvait d'office le premier de la file dès qu'une
-- place se libérait. C'était présumer de sa réponse : trois semaines après
-- s'être inscrit en attente, on peut avoir pris un autre engagement, et se
-- retrouver inscrit — donc décompté — à une séance qu'on ne peut plus faire.
--
-- Désormais tout le monde est prévenu qu'une place est libre, et le premier qui
-- la réserve la prend. Personne n'est engagé sans l'avoir voulu, et la place
-- part à qui la veut vraiment plutôt qu'à qui s'est inscrit le plus tôt.
--
-- Conséquence sur la concurrence : plusieurs personnes peuvent cliquer en même
-- temps. Le verrou de ligne de book_participant les sérialise, et celles qui
-- arrivent trop tard reçoivent un refus explicite plutôt qu'une seconde place
-- qui n'existe pas.

-- 1. Libérer ne promeut plus. La fonction rend la liste des personnes en
--    attente, pour que l'appelant les prévienne — elle ne peut pas envoyer
--    d'e-mail elle-même, et l'appelant ne peut pas deviner qui attendait.
create or replace function release_booking(p_booking uuid)
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
  v_attente     uuid[];
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

  if v_statut not in ('booked', 'waiting') then
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

  -- Qui prévenir : seulement si une place s'est réellement ouverte, donc si
  -- c'était une place occupée qu'on vient de rendre.
  if v_statut = 'booked' then
    select coalesce(array_agg(participant_id order by created_at), '{}')
      into v_attente
    from bookings
    where session_id = v_session and status = 'waiting';
  else
    v_attente := '{}';
  end if;

  return jsonb_build_object(
    'ok', true,
    'tardif', v_tardif,
    'session', v_session,
    'attente', v_attente
  );
end;
$$;


-- 2. Réserver depuis la liste d'attente : on convertit sa propre ligne.
--
-- Sans cela, l'index unique sur (séance, personne) refuserait la réservation de
-- quelqu'un qui attend déjà — il faudrait se retirer de la file avant de
-- pouvoir prendre la place qu'on y attendait, ce qui n'a aucun sens.
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


-- 3. Le message change de sens : il annonce une place à prendre, pas une
--    inscription faite.
update email_templates
   set label = 'Une place s''est libérée',
       description = 'Envoyé à toutes les personnes en liste d''attente lorsqu''une place se libère. Premier arrivé, premier servi : personne n''est inscrit d''office.',
       subject = 'Une place s''est libérée — {{date}}',
       body = 'Bonjour,

Une place vient de se libérer pour l''atelier du {{date}}, de {{heure_debut}} à
{{heure_fin}}, à {{lieu}}. {{prenom}} est sur la liste d''attente.

Elle n''est réservée à personne : la première personne qui la prend l''obtient.

{{lien_planning}}

Si vous ne faites rien, vous restez simplement sur la liste d''attente pour les
prochaines fois, et rien ne vous est décompté.

À bientôt,
L''Atelier des Cousettes',
       updated_at = now()
 where id = 'promotion_attente';
