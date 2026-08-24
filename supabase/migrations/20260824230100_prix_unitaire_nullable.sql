-- Un créneau qui ne se vend pas à l'unité n'a PAS de prix à l'unité.
--
-- Les ateliers ados, enfants et ceux de Verdalle portaient 35 € ou 45 € dans
-- `default_unit_price_cents`. Ce montant est un vestige : il datait de l'époque
-- où l'on pouvait y venir une fois, ce qu'Isabelle ne propose plus.
--
-- IL NE S'AFFICHAIT DÉJÀ PLUS — les pages filtrent sur `a_l_unite` — et il ne
-- facturait plus les dépassements, réglés au prix divisé du forfait depuis
-- 20260824200000. Restait un seul chemin par lequel il pouvait sortir : un
-- abonnement SANS formule, sur lequel `extra_sessions` retombe faute de mieux.
-- La séance en trop s'y facturait 35 € — un tarif que personne ne pratique et
-- que rien n'annonce.
--
-- ZÉRO AURAIT ÉTÉ PIRE QUE 35 €. J'avais écarté cette piste en documentant la
-- colonne (20260824220000) : un zéro se lit « gratuit » partout où un filtre
-- vient à manquer. Mais documenter ne suffisait pas — le montant continuait de
-- pouvoir sortir. NULL dit ce qui est vrai : il n'y a pas de prix.
--
-- CE QUE ÇA CHANGE À LA FACTURATION. Une séance en dépassement dont ni la
-- formule ni le créneau ne donnent de tarif ressort désormais SANS montant.
-- C'est voulu : elle se voit alors sur l'écran « à facturer », et se règle en
-- rattachant l'abonnement à sa formule. Un 35 € plausible, lui, passait en
-- facturation sans que personne ne le remarque.

alter table creneaux  alter column default_unit_price_cents drop not null;
alter table sessions  alter column unit_price_cents          drop not null;

-- Les créneaux concernés perdent leur montant fantôme, et leurs séances avec.
update creneaux set default_unit_price_cents = null
 where kind = 'atelier' and not a_l_unite;

update sessions s set unit_price_cents = null
  from creneaux c
 where c.id = s.creneau_id
   and c.kind = 'atelier'
   and not c.a_l_unite;

comment on column creneaux.default_unit_price_cents is
  'Prix d''UNE seance ou d''UN stage, quand il s''en vend une seule. Pour un '
  'stage, son prix. Pour un atelier vendu a l''unite, le tarif d''une seance '
  'sans engagement. NUL sur un creneau qui ne se prend qu''au forfait : il n''y '
  'a alors pas de prix a la seance, et un depassement se facture au prix divise '
  'de la formule achetee.';

comment on column sessions.unit_price_cents is
  'Prix de CETTE seance, recopie du creneau a la creation. Nul si le creneau ne '
  'se vend pas a l''unite.';
