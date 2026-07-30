-- Un stage n'appartient à aucun groupe d'ateliers.
--
-- `group_id` sert à présenter ensemble les créneaux d'un même lieu et d'un même
-- public sur la page publique — « verdalle », « revel-adultes »,
-- « revel-enfants ». Un stage n'a rien à y faire : il vit sur sa propre page,
-- avec ses propres dates et son propre prix.
--
-- La colonne devient donc facultative, mais SEULEMENT pour les stages : la
-- contrainte reporte l'exigence sur les ateliers, pour lesquels rien ne change.
-- Rendre la colonne simplement nullable aurait laissé passer un atelier sans
-- groupe, qui disparaîtrait silencieusement de la page publique.

alter table creneaux alter column group_id drop not null;

alter table creneaux add constraint creneau_atelier_a_un_groupe
  check (kind <> 'atelier' or group_id is not null);

comment on column creneaux.group_id is
  'Regroupement d''affichage sur la page publique des ateliers. Obligatoire '
  'pour un atelier, toujours vide pour un stage.';
