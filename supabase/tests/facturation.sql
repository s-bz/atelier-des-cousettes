-- Tests de l'identification des séances supplémentaires. Règle : SPEC §7.
-- Tout est annulé par le rollback final.

begin;

create temp table resultats (ordre serial, cas text, verdict text) on commit drop;

-- Deux créneaux à prix unitaires DIFFÉRENTS : c'est ce qui permet de vérifier
-- que chaque extra est facturé au prix de sa propre séance, et non à un prix
-- moyen ou à celui de la première.
insert into creneaux (id, label, group_id, default_start_time, default_end_time,
                      default_location, default_capacity, default_unit_price_cents)
values ('t-fact-a', 'Test 25 euros', 'revel-adultes', '14:00', '17:00', 'Revel', 6, 2500),
       ('t-fact-b', 'Test 40 euros', 'revel-adultes', '09:30', '12:30', 'Revel', 6, 4000);

insert into participants (id, first_name, last_name)
values ('d0000000-0000-0000-0000-000000000001', 'Test', 'Facturation');

-- 1 crédit par mois, d'octobre à décembre : 1 en octobre, 2 en novembre,
-- 3 en décembre.
insert into subscriptions (participant_id, season, credits_per_month,
                           starts_on, ends_on)
values ('d0000000-0000-0000-0000-000000000001', '2026-2027', 1,
        '2026-10-01', '2026-12-31');

-- Quatre séances : deux en octobre, deux en novembre.
insert into sessions (id, creneau_id, starts_at, ends_at, location,
                      capacity, unit_price_cents) values
  ('e0000000-0000-0000-0000-000000000001', 't-fact-a',
   '2026-10-08 14:00+02', '2026-10-08 17:00+02', 'Revel', 6, 2500),
  ('e0000000-0000-0000-0000-000000000002', 't-fact-b',
   '2026-10-15 09:30+02', '2026-10-15 12:30+02', 'Revel', 6, 4000),
  ('e0000000-0000-0000-0000-000000000003', 't-fact-a',
   '2026-11-05 14:00+01', '2026-11-05 17:00+01', 'Revel', 6, 2500),
  ('e0000000-0000-0000-0000-000000000004', 't-fact-b',
   '2026-11-19 09:30+01', '2026-11-19 12:30+01', 'Revel', 6, 4000);

-- Insertion VOLONTAIREMENT dans le désordre : le résultat ne doit pas en
-- dépendre.
insert into bookings (session_id, participant_id, source, status) values
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'member', 'booked'),
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'auto',   'booked'),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'member', 'booked'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'member', 'booked');

-- Octroi au jour de chaque séance : 08/10 → 1, 15/10 → 1, 05/11 → 2, 19/11 → 2.
-- Rangs chronologiques : 1, 2, 3, 4.
-- Extras = rang > octroi : le 15/10 (2 > 1) et le 19/11 (4 > 2).
insert into resultats(cas, verdict)
select '1 deux extras identifies',
       case when count(*) = 2 then 'OK' else 'ECHEC: '||count(*) end
from extra_sessions('d0000000-0000-0000-0000-000000000001');

insert into resultats(cas, verdict)
select '2 ce sont les bonnes seances',
       case when string_agg(to_char(starts_at at time zone 'Europe/Paris','DD/MM'), ', ' order by starts_at)
                 = '15/10, 19/11'
            then 'OK'
            else 'ECHEC: '||string_agg(to_char(starts_at at time zone 'Europe/Paris','DD/MM'), ', ' order by starts_at) end
from extra_sessions('d0000000-0000-0000-0000-000000000001');

-- Les deux extras sont sur le créneau à 40 € : le total doit valoir 80 €,
-- et non 2 × 25 € ni une moyenne des deux tarifs.
insert into resultats(cas, verdict)
select '3 total au prix de chaque seance',
       case when sum(unit_price_cents) = 8000
            then 'OK' else 'ECHEC: '||sum(unit_price_cents) end
from extra_sessions('d0000000-0000-0000-0000-000000000001');

-- Cohérence avec le solde : le nombre d'extras doit égaler -solde.
insert into resultats(cas, verdict)
select '4 coherent avec le solde',
       case when (select count(*) from extra_sessions('d0000000-0000-0000-0000-000000000001'))
                 = -balance('d0000000-0000-0000-0000-000000000001', '2026-11-30')
            then 'OK'
            else 'ECHEC: extras='||(select count(*) from extra_sessions('d0000000-0000-0000-0000-000000000001'))
                 ||' solde='||balance('d0000000-0000-0000-0000-000000000001','2026-11-30') end;

-- Une séance annulée par l'atelier ne se facture jamais.
update sessions set status = 'cancelled' where id = 'e0000000-0000-0000-0000-000000000004';
update bookings set status = 'released', released_at = now()
where session_id = 'e0000000-0000-0000-0000-000000000004';

insert into resultats(cas, verdict)
select '5 seance annulee non facturee',
       case when count(*) = 1 then 'OK' else 'ECHEC: '||count(*) end
from extra_sessions('d0000000-0000-0000-0000-000000000001');

-- Sans abonnement, tout est supplémentaire (créneau payé à la séance).
insert into participants (id, first_name, last_name)
values ('d0000000-0000-0000-0000-000000000002', 'Test', 'SansAbo');
insert into bookings (session_id, participant_id, source, status)
values ('e0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000002', 'admin', 'booked');

insert into resultats(cas, verdict)
select '6 sans abonnement, tout est facture',
       case when count(*) = 1 then 'OK' else 'ECHEC: '||count(*) end
from extra_sessions('d0000000-0000-0000-0000-000000000002');

select verdict, cas from resultats order by ordre;

rollback;
