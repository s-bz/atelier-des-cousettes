-- Le samedi après-midi rouvre, pour deux publics.
--
-- Il avait été archivé quelques heures plus tôt (20260824090100) : il ne
-- figurait pas dans le calendrier qu'Isabelle venait d'arrêter, et un créneau
-- sans date au programme n'a rien à faire sur la page. Ses dates sont arrivées
-- ensuite, accompagnées d'un second groupe.
--
-- L'ARCHIVAGE A SERVI EXACTEMENT À ÇA. Supprimer le créneau aurait effacé son
-- identifiant, et le recréer lui aurait donné une ligne neuve — sans lien avec
-- les abonnements qui le désignent comme créneau d'attache, ni avec les ancres
-- `#detail-atelier-du-samedi-apres-midi` déjà en circulation. Le rendre au
-- programme tient en une colonne remise à null, ce qui est tout l'intérêt de
-- la distinction posée par 20260729135310.

update creneaux
   set archived_at = null
 where id = 'atelier-du-samedi-apres-midi';


-- L'ATELIER ADOS DU SAMEDI APRÈS-MIDI — deuxième créneau du public 'ados'.
--
-- Mêmes dates que l'atelier adultes, en parallèle, comme le samedi matin. Mais
-- DEUX HEURES, DE 14 H À 16 H, quand les adultes en font trois : c'est la même
-- règle qu'au samedi matin, où les ados entrent une heure après les adultes et
-- sortent avec eux. La grille tarifaire annonce « Ados — Séances de 2 h » sans
-- nuance ; un créneau ados de 3 h l'aurait rendue fausse pour moitié.
--
-- CE CRÉNEAU REND LE FORFAIT 18 SÉANCES CONSOMMABLE. Les ados n'avaient que les
-- 10 dates du samedi matin, et les crédits ne circulent qu'à l'intérieur d'un
-- public : la formule à 18 séances promettait huit séances qui n'existaient
-- nulle part. Avec les 19 dates de l'après-midi, le public ados en compte 29.
--
-- 35 € la séance hors forfait, comme l'atelier ados du matin — même public,
-- même durée. Ce montant reste une déduction non confirmée (voir
-- 20260824090100) ; s'il change, les deux créneaux ados changent ensemble.
insert into creneaux (
  id, label, kind, audience, group_id,
  default_start_time, default_end_time, default_location,
  default_capacity, default_unit_price_cents, seances_par_stage,
  jour_semaine, places_attente
)
values (
  'atelier-ados-du-samedi-apres-midi',
  'Atelier ados du samedi après-midi',
  'atelier',
  'ados',
  'revel-ados',
  '14:00:00',
  '16:00:00',
  'Revel',
  3,
  3500,
  1,
  6,       -- samedi
  0
)
on conflict (id) do nothing;


-- « Atelier ados du samedi » devient « Atelier ados du samedi matin ».
--
-- Le nom se suffisait tant qu'il n'y en avait qu'un. Deux créneaux ados le
-- même jour, et il désigne aussi bien celui de 10h30 que celui de 14 h : sur la
-- page, deux cartes voisines auraient porté un titre pour l'une et un titre
-- ambigu pour l'autre. Les ateliers adultes se distinguent déjà ainsi —
-- « du samedi matin » et « du samedi après-midi ».
--
-- L'IDENTIFIANT NE BOUGE PAS : `atelier-ados-du-samedi` porte ses 10 séances,
-- et un identifiant est une adresse, pas une description. C'est la règle suivie
-- aux trois renommages du 30 juillet.
--
-- Le nom du CMS change dans le même commit, et c'est indispensable : les deux
-- sources se rapprochent PAR LE NOM, faute d'identifiant commun. N'en renommer
-- qu'une ferait disparaître les dates de ce créneau de la page publique, sous
-- un « ce créneau n'existe pas encore en base » parfaitement trompeur.
update creneaux
   set label = 'Atelier ados du samedi matin'
 where id = 'atelier-ados-du-samedi';
