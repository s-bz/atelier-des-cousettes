-- Marque du rappel J-2 déjà envoyé.
--
-- Le cron s'exécute une fois par jour, mais rien ne garantit qu'il ne tourne
-- pas deux fois : un redéploiement, une relance manuelle, un incident côté
-- Vercel. Sans marque, chaque exécution renverrait le même rappel — et un
-- système qui écrit deux fois la même chose cesse d'être lu.
--
-- La marque porte sur la réservation et non sur la séance : deux personnes de
-- la même séance sont prévenues séparément, et l'une peut échouer sans
-- empêcher l'autre.
alter table bookings add column reminder_sent_at timestamptz;

comment on column bookings.reminder_sent_at is
  'Rappel J-2 envoye. Non nul = ne pas renvoyer, meme si le cron rejoue.';

-- Libérer puis reprendre la même place doit permettre un nouveau rappel : la
-- marque n'a de sens que pour une réservation active.
create index bookings_rappel_a_envoyer
  on bookings (session_id)
  where status = 'booked' and reminder_sent_at is null;
