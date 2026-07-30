-- Le jour de la semaine d'un atelier régulier.
--
-- « Atelier du jeudi après-midi » disait le jour dans son nom, et nulle part
-- ailleurs. Créer ses vingt dates de la saison obligeait donc à les taper une à
-- une — vingt occasions de se tromper de jour, sans que rien ne le signale : un
-- atelier du jeudi posé un vendredi s'enregistrait sans un mot.
--
-- Le renseigner permet de PROPOSER les dates au lieu de les faire saisir : tous
-- les jeudis de la saison, à cocher.
--
-- Nullable, parce que tous les créneaux n'ont pas de jour fixe. Les stages n'en
-- ont pas : les leurs sont irrégulières par nature, et le forfait découverte
-- tient sur un mercredi, un jeudi et un vendredi de suite. Pour eux, la saisie
-- libre des dates reste la bonne réponse.
--
-- 0 = dimanche, comme extract(dow) en Postgres et getDay() en JavaScript.
-- Retenir une troisième convention aurait garanti une erreur de décalage.
alter table creneaux
  add column jour_semaine smallint
    check (jour_semaine between 0 and 6);

comment on column creneaux.jour_semaine is
  'Jour de la semaine d''un atelier regulier, 0 = dimanche (convention '
  'extract(dow) et getDay()). Vide pour un stage, dont les dates sont '
  'irregulieres.';

-- Renseigné depuis les séances existantes, mais SEULEMENT quand elles tombent
-- toutes le même jour. Un créneau dont les dates s'éparpillent n'a pas de jour
-- fixe, et lui en inventer un ferait proposer de mauvaises dates.
update creneaux c
   set jour_semaine = (
     select distinct extract(dow from s.starts_at at time zone 'Europe/Paris')::smallint
     from sessions s
     where s.creneau_id = c.id
   )
 where c.kind = 'atelier'
   and (
     select count(distinct extract(dow from s.starts_at at time zone 'Europe/Paris'))
     from sessions s
     where s.creneau_id = c.id
   ) = 1;
