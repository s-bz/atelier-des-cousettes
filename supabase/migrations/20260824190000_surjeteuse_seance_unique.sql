-- La surjeteuse redevient un stage d'une seule séance.
--
-- Elle portait `seances_par_stage = 2`, hérité de la saison passée : ses deux
-- dates étaient alors les 29 et 30 octobre, deux après-midi consécutifs de
-- 2 h 30 vendus ensemble 70 €. C'était exact.
--
-- LA SAISON 2026-2027 A CHANGÉ LA CHOSE SANS CHANGER LE NOMBRE. Les deux dates
-- sont désormais le 18 février et le 8 mai — quatre mois d'écart — et chacune
-- est un stage complet de 4 h à 60 €. Deux dates, toujours deux ; mais deux
-- offres indépendantes, et non plus un forfait en deux volets.
--
-- CE QUE LA PAGE ANNONÇAIT ENTRE-TEMPS : « Stage en 2 séances · 8 h » pour
-- 60 €, sous un titre « Dates du stage » qui présente les dates comme les
-- volets d'un même achat. Soit huit heures promises pour le prix de quatre, et
-- une inscription en février engageant aussi le mois de mai. Le nombre n'avait
-- pas bougé, donc rien ne s'était plaint — c'est précisément ce qu'un champ
-- déclaratif rend possible quand on met à jour les dates sans le relire.
--
-- Les six autres stages de la saison sont bien à 1 : chaque date y est un stage
-- entier. Aucun stage de cette saison ne se vend en plusieurs séances — le
-- dernier qui le faisait, le stage découverte, a été archivé le même jour
-- (20260824180100).

update creneaux
   set seances_par_stage = 1
 where id = 'stage-surjeteuse';
