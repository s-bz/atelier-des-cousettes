-- Les stages thématiques de la saison 2026-2027.
--
-- Sept stages, contre huit produits en base jusqu'ici. Le catalogue ne s'est pas
-- seulement allongé : il s'est réorganisé, et trois des huit disparaissent.


-- ————————————————————————————————————————————————————————————————
-- CE QUI S'ARRÊTE
-- ————————————————————————————————————————————————————————————————
--
-- Le stage découverte de la couture, ses deux formules. Il occupait cinq dates
-- — trois à la Toussaint, deux au printemps — et 95 € était le prix le plus
-- élevé du catalogue. Sa disparition abaisse donc le haut de la fourchette
-- affichée partout, de 95 € à 80 € ; c'est calculé, pas écrit, et suit tout
-- seul.
--
-- L'initiation à la machine en 2 h 30 à 38 €, doublon de celle de 3 h à 45 €
-- depuis que la saison ne retient que la seconde. Elle portait le prix le plus
-- BAS du catalogue : la fourchette se resserre donc des deux côtés, à 45–80 €.
--
-- ARCHIVÉS, PAS SUPPRIMÉS : leurs séances et les réservations qui s'y
-- accrochent restent consultables, et un `archived_at` remis à null les rend au
-- programme. C'est la distinction posée par 20260729135310.
update creneaux
   set archived_at = now()
 where id in (
     'stage-decouverte-couture-complete',
     'stage-decouverte-couture-courte',
     'stage-initiation-machine'
   )
   and archived_at is null;


-- ————————————————————————————————————————————————————————————————
-- CE QUI EST RENOMMÉ
-- ————————————————————————————————————————————————————————————————
--
-- « Initiation machine à coudre — séance de 3 h » perd son suffixe : il ne
-- distinguait cette formule que de celle de 2 h 30, qui vient d'être archivée.
-- Un nom qui départage deux choses n'a plus lieu d'être quand il n'en reste
-- qu'une, et « — séance de 3 h » redit d'ailleurs ce que ses horaires disent.
--
-- L'IDENTIFIANT NE BOUGE PAS. `stage-initiation-machine-3h` garde son « 3h »
-- alors que le nom le perd, et c'est voulu : un identifiant est une adresse,
-- pas une description. Il porte ses séances et les réservations qui s'y
-- accrochent.
update creneaux
   set label = 'Initiation machine à coudre'
 where id = 'stage-initiation-machine-3h';

-- « Stage patronage » devient « Stage patronage de jupe ».
--
-- Ce n'est pas une précision de vocabulaire mais un CONTENU DIFFÉRENT : l'ancien
-- traçait un buste de base en 3 h pour 45 €, le nouveau une jupe en 8 h pour
-- 80 €. Le nom change parce que la chose a changé ; la fiche du CMS est
-- réécrite dans le même commit, sa description parlant encore du buste.
--
-- Les deux sources se rapprochent par le NOM sur cette page comme ailleurs —
-- par préfixe ici (`prixStage`), ce qui aurait d'ailleurs laissé « Stage
-- patronage » continuer d'apparier. Raison de plus pour renommer les deux : un
-- appariement qui survit à l'incohérence ne la signale pas.
update creneaux
   set label = 'Stage patronage de jupe',
       default_start_time = '10:00:00',
       default_end_time   = '18:00:00',
       default_unit_price_cents = 8000
 where id = 'stage-patronage';


-- ————————————————————————————————————————————————————————————————
-- LES PRIX ET LES DURÉES QUI CHANGENT
-- ————————————————————————————————————————————————————————————————
--
-- Écrits valeur par valeur, avec le prix d'avant en commentaire, plutôt qu'en
-- « + 500 » : une relecture peut alors vérifier les deux, et la migration est
-- rejouable sans risque.
--
-- L'adhésion ponctuelle reste COMPRISE dans ces montants — c'est ce que dit la
-- grille dictée, et c'est ce que 20260730112806 avait déjà posé.

-- Banane : 55 € → 60 €. Horaires inchangés (14 h – 18 h, 4 h).
update creneaux
   set default_unit_price_cents = 6000
 where id = 'stage-banane';

-- Surjeteuse : 70 € → 60 €, et la durée passe de 2 h 30 à 4 h.
--
-- L'horaire par défaut prend celui de la séance de mai (14 h – 18 h) ; celle de
-- février se tient de 9 h à 13 h et porte le sien, séance par séance. Le défaut
-- ne sert qu'à afficher une durée et à préremplir une création : les deux font
-- bien 4 h, ce que la page annonce.
update creneaux
   set default_unit_price_cents = 6000,
       default_start_time = '14:00:00',
       default_end_time   = '18:00:00'
 where id = 'stage-surjeteuse';

-- Sac et tote bag : 45 €, inchangé. Horaires inchangés (9h30 – 12h30, 3 h).


-- ————————————————————————————————————————————————————————————————
-- LES DEUX STAGES NEUFS
-- ————————————————————————————————————————————————————————————————
--
-- Ni l'un ni l'autre n'a de `group_id` : un stage n'appartient à aucun groupe
-- d'atelier, il vit sur sa propre page (contrainte posée par 20260729203731).
--
-- `seances_par_stage` vaut 1 : chaque date est un stage complet, et non une
-- séance d'un cycle. C'est le cas des sept stages de cette saison — le seul qui
-- s'étalait sur plusieurs jours, le stage découverte, vient d'être archivé.
--
-- Capacité 6, comme tous les stages : un stage se tient à plus qu'un atelier,
-- chacun travaillant sur le même exercice.

-- La trousse — 3 h, 45 €. 9h30-12h30 le 24 octobre, 14 h-17 h le 29 décembre.
insert into creneaux (
  id, label, kind, audience, group_id,
  default_start_time, default_end_time, default_location,
  default_capacity, default_unit_price_cents, seances_par_stage,
  jour_semaine, places_attente, au_forfait, a_l_unite
)
values (
  'stage-trousse',
  'Stage trousse',
  'stage',
  'adultes',
  null,
  '09:30:00',
  '12:30:00',
  'Revel',
  6,
  4500,
  1,
  -- Pas de jour fixe : un samedi et un mardi. C'est précisément le cas que
  -- 20260730065231 laissait nullable — proposer « tous les samedis » à la
  -- création ferait manquer le mardi.
  null,
  0,
  false,   -- un stage ne se pose sur aucun forfait
  true
)
on conflict (id) do nothing;

-- Le gilet de berger réversible — 4 h, 60 €. Deux samedis, 14 h-18 h.
insert into creneaux (
  id, label, kind, audience, group_id,
  default_start_time, default_end_time, default_location,
  default_capacity, default_unit_price_cents, seances_par_stage,
  jour_semaine, places_attente, au_forfait, a_l_unite
)
values (
  'stage-gilet-de-berger',
  'Stage gilet de berger réversible',
  'stage',
  'adultes',
  null,
  '14:00:00',
  '18:00:00',
  'Revel',
  6,
  6000,
  1,
  6,       -- samedi : ses deux dates en sont
  0,
  false,
  true
)
on conflict (id) do nothing;


-- LES STAGES NE SE VENDENT PAS AU FORFAIT, et ne l'ont jamais fait : un stage
-- se règle à l'achat, hors crédits (20260729203513). Les colonnes posées ce
-- matin (20260824160000) sont vraies par défaut ; on remet donc les stages
-- existants à ce qu'ils sont réellement, faute de quoi un abonnement pourrait
-- les prendre pour créneau d'attache.
update creneaux
   set au_forfait = false
 where kind = 'stage'
   and au_forfait;
