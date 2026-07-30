-- « Ateliers enfants du samedi » au singulier, comme celui du jeudi.
--
-- Le pluriel était un reste de l'ancien nom. Les deux ateliers d'enfants se
-- suivent sur la page ; l'un au singulier et l'autre au pluriel, la différence
-- se remarquait sans rien vouloir dire.
--
-- Un créneau est UN atelier qui revient : le singulier est aussi le plus juste.
--
-- Comme aux deux renommages précédents, l'identifiant ne bouge pas et le nom du
-- CMS change dans le même commit — les deux sources se rapprochent par le nom.

update creneaux
set label = 'Atelier enfants du samedi'
where id = 'ateliers-enfants-samedi';
