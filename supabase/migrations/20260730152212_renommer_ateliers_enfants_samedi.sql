-- « Ateliers enfants samedi » devient « Ateliers enfants du samedi ».
--
-- Le pendant du jeudi, renommé juste avant : les deux ateliers d'enfants se
-- lisent désormais sur le même patron, « enfants du <jour> ».
--
-- Comme pour le jeudi, l'identifiant reste : `ateliers-enfants-samedi` porte
-- 16 séances et les réservations qui s'y accrochent. Et comme pour le jeudi, le
-- nom du CMS change dans le même commit — les deux sources se rapprochent par
-- le nom, et n'en renommer qu'une ferait disparaître les dates de la page.

update creneaux
set label = 'Ateliers enfants du samedi'
where id = 'ateliers-enfants-samedi';
