-- Combien de séances compte UN stage : un nombre déclaré, non plus déduit.
--
-- Jusqu'ici le système comptait les dates du créneau et en concluait la taille du
-- stage. Il ne pouvait donc rien vérifier : créer deux des trois matinées du
-- stage découverte en faisait un forfait de deux dates, toujours affiché à 90 €,
-- sans que rien ne s'en aperçoive. Le prix et le nombre de dates étaient deux
-- faits posés côte à côte, que rien ne reliait.
--
-- Ce nombre REMPLACE dates_groupees, et ne s'y ajoute pas. « Groupé » n'était que
-- « plus d'une séance » : garder les deux permettrait de les contredire —
-- groupé à une seule séance, ou trois séances non groupées — exactement le
-- piège qu'on venait de retirer du trio groupe / lieu / public.
--
--   seances_par_stage = 1  → chaque date est une offre indépendante, à son prix.
--                            Sept samedis de patronage à 40 € l'unité.
--   seances_par_stage > 1  → les dates se vendent et se suivent ensemble, le prix
--                            du créneau couvrant l'ensemble. Trois matinées à 90 €.

alter table creneaux
  add column seances_par_stage integer not null default 1
    check (seances_par_stage > 0);

comment on column creneaux.seances_par_stage is
  'Nombre de seances que compte un stage. 1 : chaque date est une offre '
  'independante a son prix. Plus de 1 : les dates se reservent ensemble et le '
  'prix du creneau couvre l''ensemble. Remplace l''ancien dates_groupees, dont '
  'la valeur se deduisait de ce nombre.';

-- Report depuis l'ancien drapeau, en s'appuyant sur les dates réellement
-- créées : c'est bien ce nombre-là qui était vendu comme un tout.
update creneaux c
   set seances_par_stage = greatest(1, (
         select count(*) from sessions s where s.creneau_id = c.id
       ))
 where c.dates_groupees;

alter table creneaux drop column dates_groupees;
