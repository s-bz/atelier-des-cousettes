-- L'atelier enfants de Verdalle est supprimé, pas archivé.
--
-- Il avait été créé le 30 juillet (20260730165903) SANS DATE et délibérément :
-- le groupe `verdalle-enfants` existait dans le code depuis des semaines sans
-- qu'aucun créneau ne le porte, si bien que Verdalle n'apparaissait que pour
-- les adultes, et l'on pouvait en conclure qu'on n'y prend pas les enfants. Le
-- créneau était donc une porte à laquelle frapper — « contactez Isabelle ».
--
-- Personne n'a frappé, et la saison 2026-2027 ne prévoit rien à Verdalle. Une
-- porte qu'on n'ouvre jamais n'invite pas, elle fait attendre.
--
-- SUPPRIMÉ ET NON ARCHIVÉ, contrairement aux quatre créneaux arrêtés cette
-- saison. 20260729135310 a posé la distinction : on archive ce qui a tourné,
-- pour ne pas effacer les séances, les présences et les abonnements qui s'y
-- accrochent ; on supprime ce qui n'a jamais servi. Celui-ci n'a porté aucune
-- séance, aucune réservation, aucun abonnement — les clés étrangères le
-- confirment en laissant le delete passer. L'archiver aurait gardé dans la
-- liste des créneaux archivés une ligne qui ne raconte rien.

delete from creneaux where id = 'atelier-enfants-verdalle';
