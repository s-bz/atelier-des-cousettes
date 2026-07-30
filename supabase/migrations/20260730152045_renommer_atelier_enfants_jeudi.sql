-- « Atelier du jeudi fin de journée » devient « Atelier enfants du jeudi ».
--
-- L'ancien nom disait l'heure et taisait le public, ce qui a coûté cher : le
-- contenu l'a longtemps classé chez les adultes quand la base le tenait pour un
-- atelier d'enfants, et la page publique l'a annoncé au mauvais public jusqu'à
-- ce que la comparaison des deux sources le révèle. Le nommer pour ce qu'il est
-- referme la porte à cette confusion ; l'horaire, lui, se lit déjà en tête de
-- sa carte.
--
-- L'IDENTIFIANT NE BOUGE PAS. `atelier-du-jeudi-fin-de-journee` est référencé
-- par ses 19 séances, donc par les réservations qui s'y accrochent ; le changer
-- imposerait une cascade pour un simple confort de lecture. Un identifiant est
-- une adresse, pas une description.
--
-- Le nom du CMS suit dans le même commit, et c'est indispensable : les deux
-- sources se rapprochent PAR LE NOM, faute d'identifiant commun. Renommer d'un
-- seul côté aurait fait disparaître les dates de ce créneau de la page, sous un
-- « ce créneau n'existe pas encore en base » parfaitement trompeur.

update creneaux
set label = 'Atelier enfants du jeudi'
where id = 'atelier-du-jeudi-fin-de-journee';
