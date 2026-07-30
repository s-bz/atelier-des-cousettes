-- L'initiation machine à coudre devient deux formules, comme le stage découverte.
--
-- Ses quatre dates n'ont jamais eu la même forme : trois séances de 2 h 30 en
-- fin de journée, et une de 3 h le samedi après-midi. L'ancienne page les
-- facturait d'ailleurs différemment — « [40 € pour 3h de cours] » et « [33 €
-- pour 2h30 de cours] », soit 45 € et 38 € l'adhésion comprise.
--
-- La base ne pouvait pas le dire : un créneau porte UN prix. La page affichait
-- donc 45 € pour tout le monde, et annonçait même 2 h 30 à qui venait le samedi
-- — la durée était lue sur la première date.
--
-- Le modèle sait pourtant exprimer cela, et le fait déjà pour le stage
-- découverte : deux créneaux, réunis à l'affichage sous un seul titre par ce qui
-- précède le tiret cadratin. Chacun porte alors sa durée, son prix et ses dates.
--
-- Aucune réservation sur ces quatre séances : le découpage ne déplace personne.
-- Les séances gardent leur identifiant, donc une réservation aurait suivi son
-- créneau sans rien perdre.

-- La formule de 3 h, extraite. Elle reprend tout de l'originale sauf ce qui la
-- distingue : son horaire, son prix, son nom.
insert into creneaux (
  id, label, kind, audience, group_id,
  default_start_time, default_end_time, default_location,
  default_capacity, default_unit_price_cents, seances_par_stage,
  jour_semaine, places_attente
)
select
  'stage-initiation-machine-3h',
  'Initiation machine à coudre — séance de 3 h',
  kind, audience, group_id,
  '14:00:00', '17:00:00', default_location,
  default_capacity, 4500, seances_par_stage,
  jour_semaine, places_attente
from creneaux
where id = 'stage-initiation-machine';

-- L'originale devient explicitement la formule courte, à son prix.
update creneaux
set label = 'Initiation machine à coudre — séance de 2 h 30',
    default_start_time = '17:15:00',
    default_end_time = '19:45:00',
    default_unit_price_cents = 3800
where id = 'stage-initiation-machine';

-- La séance du samedi rejoint sa formule. Repérée par sa DURÉE et non par sa
-- date : c'est la durée qui la distingue, et une date se déplace.
update sessions
set creneau_id = 'stage-initiation-machine-3h'
where creneau_id = 'stage-initiation-machine'
  and ends_at - starts_at = interval '3 hours';

-- Les prix des séances suivent ceux de leur créneau.
--
-- Ils ne servent à personne aujourd'hui : `extra_sessions` ne facture que les
-- ateliers, un stage étant réglé à l'achat. Mais les laisser à 33 € et 40 €
-- planterait deux anciens tarifs dans la base, prêts à ressortir le jour où
-- quelque chose les lira — et rien n'indiquerait alors qu'ils datent d'avant.
update sessions s
set unit_price_cents = c.default_unit_price_cents
from creneaux c
where c.id = s.creneau_id
  and c.id in ('stage-initiation-machine', 'stage-initiation-machine-3h');
