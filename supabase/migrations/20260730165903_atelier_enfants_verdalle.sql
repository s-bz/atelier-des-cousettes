-- Un atelier enfants à Verdalle, sans date pour l'instant.
--
-- Le groupe `verdalle-enfants` existait dans le code depuis des semaines sans
-- qu'aucun créneau ne le porte : la page publique n'avait donc jamais de quoi
-- l'afficher, et Verdalle n'apparaissait que pour les adultes. Une famille du
-- village en concluait qu'on n'y prend pas les enfants.
--
-- SANS DATE, ET C'EST VOULU. Le créneau s'affiche avec « Aucune date programmée
-- pour l'instant. Contactez Isabelle pour connaître les prochaines », comme
-- l'atelier adultes de Verdalle qui n'en a lui non plus aucune. Mieux vaut une
-- porte à laquelle frapper qu'une absence dont on déduit un refus.
--
-- Les valeurs par défaut suivent celles des ateliers enfants de Revel : 2 h,
-- 3 places, 35 € la séance hors forfait. L'horaire indiqué n'engage rien —
-- aucune séance ne s'en réclame — mais il fallait bien en poser un : la colonne
-- ne se laisse pas vide, et il servira de gabarit à la première date créée.

insert into creneaux (
  id, label, kind, audience, group_id,
  default_start_time, default_end_time, default_location,
  default_capacity, default_unit_price_cents, seances_par_stage,
  jour_semaine, places_attente
)
values (
  'atelier-enfants-verdalle',
  'Atelier enfants de Verdalle',
  'atelier',
  'enfants',
  'verdalle-enfants',
  '14:00:00',
  '16:00:00',
  'Verdalle',
  3,
  3500,
  1,
  null,
  0
);
