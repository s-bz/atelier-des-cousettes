-- Le délai d'annulation passe de 48 heures à 10 jours.
--
-- Décision d'Isabelle. Une place rendue l'avant-veille ne se recomble pas :
-- les groupes sont de trois à six personnes, prévenues par e-mail, et personne
-- ne réorganise sa semaine en deux jours. Dix jours laissent le temps de
-- proposer la place et qu'elle soit prise.
--
-- CE N'EST PAS QU'UNE PHRASE, et c'est pourquoi cette migration existe : la
-- règle est APPLIQUÉE ici, dans `release_booking`, qui retient le crédit quand
-- la place revient trop tard. La changer dans la FAQ seule aurait fait dire à
-- la page « la séance reste due » à quelqu'un que la base n'aurait pas
-- décompté — un texte plus sévère que le système, ce qui se découvre au pire
-- moment.
--
-- Le rappel automatique suit dans le même changement, de 3 à 11 jours avant la
-- séance (src/pages/api/cron/quotidien.ts). Il avait été posé à trois jours
-- POUR arriver pendant que l'annulation restait libre ; à trois jours d'une
-- échéance à dix, il annoncerait l'échéance et son dépassement d'un même
-- souffle. Onze jours lui rendent son office : une journée pleine pour décider.
--
-- Les deux gabarits d'e-mail qui citaient les 48 h sont repris de même.
--
-- LE CORPS EST REPRIS DE `pg_get_functiondef`, non d'une migration : la leçon
-- de 20260824230000, où reprendre une ancienne définition avait ressuscité une
-- surcharge morte. Seul l'intervalle change.

CREATE OR REPLACE FUNCTION public.release_booking(p_booking uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
  v_tardif := v_statut = 'booked' and v_debut - now() < interval '10 days';

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

comment on column bookings.credit_retenu is
  'Seance due bien que la place ait ete rendue : desistement a moins de 10 '
  'jours. Isabelle peut en dispenser au cas par cas.';


-- ————————————————————————————————————————————————————————————————
-- LES CINQ GABARITS D'E-MAIL QUI CITAIENT LES 48 H
-- ————————————————————————————————————————————————————————————————
--
-- Remplacements CIBLÉS plutôt que réécriture des corps entiers : Isabelle peut
-- avoir retouché ces textes depuis l'écran des gabarits, et réécrire écraserait
-- ses corrections sans le dire.
--
-- Deux tournures disparaissent en plus du nombre. « À si peu de jours, une
-- place rendue trouve rarement preneur » disait vrai de 48 h et faux de dix :
-- c'est même l'inverse qui motive le changement — dix jours laissent le temps
-- de proposer la place. La phrase devient un constat de délai dépassé, sans
-- prétendre expliquer par la brièveté.

update email_templates set body = replace(body,
  'libérez au plus tard 48 h avant la séance',
  'libérez au plus tard 10 jours avant la séance')
where id = 'bienvenue';

update email_templates set body = replace(body,
  'Vous pouvez libérer une place jusqu''à 48 h avant la séance',
  'Vous pouvez libérer une place jusqu''à 10 jours avant la séance')
where id = 'confirmation';

update email_templates set body = replace(
  replace(body,
    'Vous pouvez libérer jusqu''à 48 h avant la séance',
    'Vous pouvez libérer jusqu''à 10 jours avant la séance'),
  ' — à si peu de jours, elle trouve rarement preneur', '')
where id = 'rappel';

update email_templates set body = replace(body,
  's''est désisté à moins de 48 h de la séance',
  's''est désisté à moins de 10 jours de la séance')
where id = 'admin_liberation_tardive';

update email_templates set body = replace(
  replace(body,
    'Le désistement arrivant à moins de 48 h de la séance',
    'Le désistement arrivant à moins de 10 jours de la séance'),
  'À si peu de jours, une place rendue trouve rarement preneur.',
  'Passé ce délai, une place rendue trouve rarement preneur.')
where id = 'liberation_tardive';
