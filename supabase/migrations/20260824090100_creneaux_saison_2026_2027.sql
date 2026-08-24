-- Les créneaux de la saison 2026-2027, tels qu'Isabelle les a arrêtés.
--
-- Deux ouvrent, deux s'arrêtent. Le calendrier lui-même — les 76 dates — ne
-- figure pas ici : il vit dans `sessions`, se règle depuis l'écran des séances
-- et se pose avec `scripts/saison-2026-2027.mjs`. Une migration qui écrirait
-- les dates ferait du dépôt et de l'écran d'administration deux propriétaires
-- du même calendrier, et le premier redéploiement les mettrait en désaccord.


-- L'ATELIER DU JEUDI MATIN — nouveau.
--
-- Adultes, 9h30-12h30, comme le samedi matin : trois heures, 45 € la séance
-- hors forfait. Il double le jeudi, dont l'après-midi affichait complet.
insert into creneaux (
  id, label, kind, audience, group_id,
  default_start_time, default_end_time, default_location,
  default_capacity, default_unit_price_cents, seances_par_stage,
  jour_semaine, places_attente
)
values (
  'atelier-du-jeudi-matin',
  'Atelier du jeudi matin',
  'atelier',
  'adultes',
  'revel-adultes',
  '09:30:00',
  '12:30:00',
  'Revel',
  3,
  4500,
  1,
  4,       -- jeudi (0 = dimanche, convention extract(dow))
  0
)
on conflict (id) do nothing;


-- L'ATELIER ADOS DU SAMEDI — nouveau, et premier créneau du public 'ados'.
--
-- 10h30-12h30, aux mêmes dix dates que l'atelier adultes du samedi matin : les
-- deux tournent en parallèle, l'adulte de 9h30 à 12h30 et l'ado de 10h30 à
-- 12h30.
--
-- 35 € LA SÉANCE HORS FORFAIT — ce chiffre est DÉDUIT, pas dicté. Isabelle a
-- donné les forfaits (250 € les 9 séances, 440 € les 18) sans le prix à
-- l'unité. Les deux autres publics facturent la séance isolée un quart de plus
-- que la séance au forfait — 36 → 45 € chez les adultes, 28 → 35 € chez les
-- enfants ; le même rapport appliqué aux 27,80 € du forfait ados donne 34,70 €,
-- arrondis à 35. C'est donc le montant le plus vraisemblable, et non un montant
-- confirmé : s'il est faux, il se corrige ici et sur la grille du CMS, où le
-- forfait ados est écrit à la main.
insert into creneaux (
  id, label, kind, audience, group_id,
  default_start_time, default_end_time, default_location,
  default_capacity, default_unit_price_cents, seances_par_stage,
  jour_semaine, places_attente
)
values (
  'atelier-ados-du-samedi',
  'Atelier ados du samedi',
  'atelier',
  'ados',
  'revel-ados',
  '10:30:00',
  '12:30:00',
  'Revel',
  3,
  3500,
  1,
  6,       -- samedi
  0
)
on conflict (id) do nothing;


-- DEUX CRÉNEAUX S'ARRÊTENT : le samedi après-midi et l'atelier enfants du
-- jeudi ne figurent pas au calendrier 2026-2027.
--
-- ARCHIVÉS, PAS SUPPRIMÉS, et la distinction est celle que 20260729135310 a
-- posée : leurs séances, leurs présences et les abonnements qui les désignent
-- comme créneau d'attache restent intacts et consultables. Les clés étrangères
-- l'imposeraient de toute façon, mais c'est aussi le bon geste — un groupe qui
-- s'arrête en fin de saison n'a jamais été une erreur de saisie.
--
-- Réversible d'une ligne : remettre archived_at à null les rend au programme.
update creneaux
   set archived_at = now()
 where id in ('atelier-du-samedi-apres-midi', 'atelier-du-jeudi-fin-de-journee')
   and archived_at is null;
