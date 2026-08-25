-- Ce qu'un remboursement libère, et ce qu'il ne touche pas.
--
-- La règle de l'atelier : un remboursement, même partiel, libère les séances
-- NON SUIVIES. Ce qui a été vécu reste — ces places-là racontent une présence,
-- et les effacer réécrirait les feuilles d'appel.

begin;
create temp table r (ordre serial, cas text, verdict text) on commit drop;

insert into accounts (id, email) values ('f0000000-0000-0000-0000-000000000001', 'rembourse@test.fr');
insert into participants (id, account_id, first_name, last_name, audience)
values ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
        'Rendu', 'Argent', 'adulte');

insert into creneaux (id, label, audience, kind, group_id, a_l_unite, au_forfait,
                      default_capacity, default_unit_price_cents,
                      default_start_time, default_end_time, default_location)
values ('t-remb', 'Atelier de test', 'adultes', 'atelier', 'revel-adultes', false, true,
        5, 4500, '14:00', '17:00', 'Revel');

-- Deux séances passées, trois à venir.
insert into sessions (id, creneau_id, starts_at, ends_at, location, capacity, unit_price_cents, status, places_attente)
values ('f2000000-0000-0000-0000-000000000001', 't-remb', now() - interval '20 days', now() - interval '20 days' + interval '3 hours', 'Revel', 5, 4500, 'scheduled', 0),
       ('f2000000-0000-0000-0000-000000000002', 't-remb', now() - interval '10 days', now() - interval '10 days' + interval '3 hours', 'Revel', 5, 4500, 'scheduled', 0),
       ('f2000000-0000-0000-0000-000000000003', 't-remb', now() + interval '5 days',  now() + interval '5 days'  + interval '3 hours', 'Revel', 5, 4500, 'scheduled', 0),
       ('f2000000-0000-0000-0000-000000000004', 't-remb', now() + interval '20 days', now() + interval '20 days' + interval '3 hours', 'Revel', 5, 4500, 'scheduled', 0),
       ('f2000000-0000-0000-0000-000000000005', 't-remb', now() + interval '40 days', now() + interval '40 days' + interval '3 hours', 'Revel', 5, 4500, 'scheduled', 0);

insert into subscriptions (participant_id, season, total_credits, home_creneau_id,
                           starts_on, ends_on, helloasso_order_id)
values ('f1000000-0000-0000-0000-000000000001', 'test', 5, 't-remb',
        (current_date - 60), (current_date + 300), 'Order:REMB');

insert into bookings (session_id, participant_id, source, status)
select id, 'f1000000-0000-0000-0000-000000000001', 'auto', 'booked'
from sessions where creneau_id = 't-remb';

-- ── Avant ────────────────────────────────────────────────────────────────
insert into r(cas, verdict)
select '0 depart : 5 places, solde nul',
       case when count(*) = 5 and balance('f1000000-0000-0000-0000-000000000001') = 0
            then 'OK' else 'ECHEC: '||count(*)||' places, solde '
                 ||balance('f1000000-0000-0000-0000-000000000001') end
from bookings where participant_id = 'f1000000-0000-0000-0000-000000000001' and status = 'booked';

select annuler_pour_remboursement('Order:REMB');

-- ── 1. Les séances à venir sont rendues ─────────────────────────────────
insert into r(cas, verdict)
select '1 les trois seances a venir liberees',
       case when count(*) = 3 then 'OK' else 'ECHEC: '||count(*)||' liberees' end
from bookings b join sessions s on s.id = b.session_id
where b.participant_id = 'f1000000-0000-0000-0000-000000000001'
  and b.status = 'released' and s.starts_at > now();

-- ── 2. Les séances suivies restent ──────────────────────────────────────
insert into r(cas, verdict)
select '2 les deux seances suivies conservees',
       case when count(*) = 2 then 'OK' else 'ECHEC: '||count(*)||' conservees' end
from bookings b join sessions s on s.id = b.session_id
where b.participant_id = 'f1000000-0000-0000-0000-000000000001'
  and b.status = 'booked' and s.starts_at <= now();

-- ── 3. Sans pénalité ────────────────────────────────────────────────────
-- Une libération à moins de dix jours retient normalement le crédit. La
-- personne ne se désiste pas : elle a été remboursée.
insert into r(cas, verdict)
select '3 aucune penalite de desistement tardif',
       case when count(*) = 0 then 'OK' else 'ECHEC: '||count(*)||' credit(s) retenu(s)' end
from bookings where participant_id = 'f1000000-0000-0000-0000-000000000001' and credit_retenu;

-- ── 4. Le solde retombe à zéro ──────────────────────────────────────────
insert into r(cas, verdict)
select '4 solde nul apres remboursement',
       case when balance('f1000000-0000-0000-0000-000000000001') = 0 then 'OK'
            else 'ECHEC: solde '||balance('f1000000-0000-0000-0000-000000000001') end;

-- ── 5. Et rien ne part en facturation ───────────────────────────────────
-- C'est la faute que tout ceci corrige : on remboursait, puis on facturait.
insert into r(cas, verdict)
select '5 rien a facturer',
       case when count(*) = 0 then 'OK' else 'ECHEC: '||count(*)||' a facturer' end
from extra_sessions('f1000000-0000-0000-0000-000000000001');

-- ── 6. Les places libérées repartent aux autres ─────────────────────────
insert into r(cas, verdict)
select '6 les places sont rendues au creneau',
       case when count(*) = 3 then 'OK' else 'ECHEC: '||count(*)||' places libres' end
from sessions s
where s.creneau_id = 't-remb' and s.starts_at > now()
  and (select count(*) from bookings b where b.session_id = s.id and b.status = 'booked') = 0;

select verdict, cas from r order by ordre;
rollback;
