-- Une séance payée à l'unité n'entame pas le forfait.
--
-- Écrit après le premier achat réel : l'espace adhérent annonçait « -1 séance,
-- à régler avec Isabelle » à quelqu'un qui venait de payer par carte. Le solde
-- d'un forfait mesure ce qu'il reste d'un lot payé d'avance ; une place achetée
-- à part n'y entre pas plus qu'un billet de guichet n'entame un abonnement.

begin;
create temp table r (ordre serial, cas text, verdict text) on commit drop;

insert into accounts (id, email) values ('e0000000-0000-0000-0000-000000000001', 'payee@test.fr');
insert into participants (id, account_id, first_name, last_name, audience) values
  ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Sans', 'Forfait', 'adulte'),
  ('e1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Avec', 'Forfait', 'adulte');

-- Un créneau d'atelier doit porter un groupe : la contrainte
-- `creneau_atelier_a_un_groupe` l'exige, et c'est ce qui range la carte sous
-- « Revel — Adultes » sur la page publique.
insert into creneaux (id, label, audience, kind, group_id, a_l_unite, au_forfait, default_capacity,
                      default_unit_price_cents, default_start_time, default_end_time, default_location)
values ('t-payee', 'Atelier de test', 'adultes', 'atelier', 'revel-adultes', true, true, 5, 4500, '09:30', '12:30', 'Revel'),
       ('t-stage', 'Stage de test',   'adultes', 'stage',   null,            true, false, 5, 6000, '14:00', '17:00', 'Revel');

insert into sessions (id, creneau_id, starts_at, ends_at, location, capacity, unit_price_cents, status, places_attente)
values ('e2000000-0000-0000-0000-000000000001', 't-payee',
        now() + interval '20 days', now() + interval '20 days 3 hours', 'Revel', 5, 4500, 'scheduled', 0),
       ('e2000000-0000-0000-0000-000000000002', 't-payee',
        now() + interval '25 days', now() + interval '25 days 3 hours', 'Revel', 5, 4500, 'scheduled', 0),
       ('e2000000-0000-0000-0000-000000000003', 't-stage',
        now() + interval '30 days', now() + interval '30 days 3 hours', 'Revel', 5, 6000, 'scheduled', 0);

-- ── 1. Réglée et posée : le compte est nul ──────────────────────────────
-- Un crédit acheté, un crédit dépensé, dans la même seconde.
select book_participant('e2000000-0000-0000-0000-000000000001',
                        'e1000000-0000-0000-0000-000000000001', 'achat', false, 'Order:1');

insert into r(cas, verdict)
select '1 achetee et posee : solde nul',
       case when balance('e1000000-0000-0000-0000-000000000001') = 0
            then 'OK' else 'ECHEC: '||balance('e1000000-0000-0000-0000-000000000001') end;

-- ── 2. Elle n'est pas à facturer ────────────────────────────────────────
-- Sans quoi on réclamerait une seconde fois ce qui vient d'être réglé.
insert into r(cas, verdict)
select '2 achetee pas a facturer',
       case when count(*) = 0 then 'OK' else 'ECHEC: '||count(*) end
from extra_sessions('e1000000-0000-0000-0000-000000000001');

-- ── 3. LIBÉRÉE À TEMPS, LE CRÉDIT REVIENT ───────────────────────────────
-- C'est le cœur : quelqu'un a payé, ne peut pas venir, et doit pouvoir
-- rechoisir sa date. Un solde resté à zéro lui ferait payer deux fois.
update bookings set status = 'released', released_at = now()
where participant_id = 'e1000000-0000-0000-0000-000000000001' and source = 'achat';

insert into r(cas, verdict)
select '3 liberee a temps : credit rendu',
       case when balance('e1000000-0000-0000-0000-000000000001') = 1
            then 'OK' else 'ECHEC: '||balance('e1000000-0000-0000-0000-000000000001') end;

-- ── 4. Libérée trop tard, elle est perdue ───────────────────────────────
-- `credit_retenu` est la règle des annulations tardives, et elle vaut pour une
-- séance achetée comme pour une séance de forfait.
update bookings set credit_retenu = true
where participant_id = 'e1000000-0000-0000-0000-000000000001' and source = 'achat';

insert into r(cas, verdict)
select '4 liberee trop tard : perdue',
       case when balance('e1000000-0000-0000-0000-000000000001') = 0
            then 'OK' else 'ECHEC: '||balance('e1000000-0000-0000-0000-000000000001') end;

update bookings set credit_retenu = false
where participant_id = 'e1000000-0000-0000-0000-000000000001' and source = 'achat';

-- ── 5. Le crédit rendu se repose sur une autre date ─────────────────────
select book_participant('e2000000-0000-0000-0000-000000000002',
                        'e1000000-0000-0000-0000-000000000001', 'member');

insert into r(cas, verdict)
select '5 reposee ailleurs : solde nul, rien a facturer',
       case when balance('e1000000-0000-0000-0000-000000000001') = 0
             and (select count(*) from extra_sessions('e1000000-0000-0000-0000-000000000001')) = 0
            then 'OK'
            else 'ECHEC: solde '||balance('e1000000-0000-0000-0000-000000000001')
                 ||', a facturer '||(select count(*) from extra_sessions('e1000000-0000-0000-0000-000000000001'))::text end;

-- ── 6. Une place de forfait, sans crédit, reste à facturer ──────────────
-- La correction ne doit pas avoir désarmé le décompte.
select book_participant('e2000000-0000-0000-0000-000000000001',
                        'e1000000-0000-0000-0000-000000000002', 'auto');

insert into r(cas, verdict)
select '6 place sans credit a facturer',
       case when count(*) = 1 then 'OK' else 'ECHEC: '||count(*) end
from extra_sessions('e1000000-0000-0000-0000-000000000002');

-- ── 7. Un stage ne se facture jamais au forfait ─────────────────────────
-- Vendu à part, toujours réglé d'avance. `consumed_credits` l'écartait déjà ;
-- `extra_sessions` ne le faisait pas, et l'aurait facturé deux fois.
select book_participant('e2000000-0000-0000-0000-000000000003',
                        'e1000000-0000-0000-0000-000000000002', 'admin');

insert into r(cas, verdict)
select '7 stage pas a facturer',
       case when count(*) = 1 then 'OK' else 'ECHEC: '||count(*)||' (le stage y est entre)' end
from extra_sessions('e1000000-0000-0000-0000-000000000002');

select verdict, cas from r order by ordre;
rollback;
