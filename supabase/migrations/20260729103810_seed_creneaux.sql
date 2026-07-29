-- Amorçage des créneaux, repris de src/content/pages/ateliers-reguliers/index.yaml.
--
-- Les identifiants suivent toSlug() (src/utils/strings.ts) appliqué au nom, afin
-- de rester alignés avec les ancres déjà utilisées sur le site public.
--
-- Deux valeurs sont des ESTIMATIONS, pas des faits :
--   • default_capacity = 6 — la capacité réelle n'existe nulle part dans le
--     contenu et n'a pas encore été fournie par Isabelle. Elle la corrigera
--     créneau par créneau dans l'écran de M1.
--   • default_unit_price_cents = 2500 — tarif d'une séance isolée, d'après
--     schemaOffers « Atelier 2h (une séance) : 25 ». Sert à facturer une séance
--     supplémentaire.
--
-- Idempotent : rejouable sans doublon, et ne réécrit pas ce qu'Isabelle a
-- corrigé depuis l'interface.

insert into creneaux (id, label, group_id, default_start_time, default_end_time,
                      default_location, default_capacity, default_unit_price_cents)
values
  ('atelier-de-verdalle',             'Atelier de Verdalle',
   'verdalle',      '09:30', '12:00', 'Verdalle', 6, 2500),

  ('atelier-du-mardi-apres-midi',     'Atelier du mardi après-midi',
   'revel-adultes', '14:00', '17:00', 'Revel',    6, 2500),

  ('atelier-du-jeudi-apres-midi',     'Atelier du jeudi après-midi',
   'revel-adultes', '14:00', '17:00', 'Revel',    6, 2500),

  ('atelier-du-jeudi-fin-de-journee', 'Atelier du jeudi fin de journée',
   'revel-adultes', '17:30', '19:30', 'Revel',    6, 2500),

  ('atelier-du-samedi-matin',         'Atelier du samedi matin',
   'revel-adultes', '09:30', '12:30', 'Revel',    6, 2500),

  ('atelier-du-samedi-apres-midi',    'Atelier du samedi après-midi',
   'revel-adultes', '14:00', '17:00', 'Revel',    6, 2500),

  ('ateliers-enfants-samedi',         'Ateliers enfants samedi',
   'revel-enfants', '10:00', '12:00', 'Revel',    6, 2500)
on conflict (id) do nothing;
