-- Verdalle passe à trois heures, comme tous les ateliers adultes.
--
-- Isabelle a tranché : une séance adulte dure 3 h, une séance enfant 2 h. Sans
-- exception. Verdalle était le seul créneau adulte à 2 h 30 (09:30–12:00), un
-- reste de la saison précédente que les données du site portaient encore.
--
-- La durée n'est pas un détail d'affichage : elle décide de l'heure de fin
-- annoncée dans le rappel à deux jours, et c'est sur cette heure-là que les
-- adhérentes organisent leur après-midi.

update creneaux
   set default_end_time = '12:30:00'
 where id = 'atelier-de-verdalle';

-- Les séances DÉJÀ PROGRAMMÉES mais pas encore commencées suivent. Les séances
-- passées ne sont pas touchées : elles ont eu lieu telles qu'elles ont eu lieu,
-- et réécrire un horaire révolu ferait mentir la feuille de présence.
update sessions
   set ends_at = starts_at + interval '3 hours'
 where creneau_id = 'atelier-de-verdalle'
   and starts_at > now()
   and ends_at - starts_at <> interval '3 hours';
