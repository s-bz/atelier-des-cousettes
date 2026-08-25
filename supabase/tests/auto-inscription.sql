-- Tests de l'auto-inscription. Règles : SPEC §9.
--
-- Les séances sont posées dans les jours à venir, relativement à la date du
-- jour : la fonction ne travaille que sur un horizon glissant, des dates figées
-- rendraient le test caduc au bout de quelques semaines.

begin;

create temp table resultats (ordre serial, cas text, verdict text) on commit drop;

insert into creneaux (id, label, group_id, default_start_time, default_end_time,
                      default_location, default_capacity, default_unit_price_cents)
values ('t-auto', 'Test auto', 'revel-adultes', '14:00', '17:00', 'Revel', 2, 2500);

insert into participants (id, first_name, last_name) values
  ('a1000000-0000-0000-0000-000000000001', 'Deux', 'ParMois'),
  ('a1000000-0000-0000-0000-000000000002', 'Une', 'ParMois'),
  ('a1000000-0000-0000-0000-000000000003', 'Sans', 'Creneau');

-- Abonnements couvrant le mois courant.
insert into subscriptions (participant_id, season, credits_per_month,
                           home_creneau_id, starts_on, ends_on)
values ('a1000000-0000-0000-0000-000000000001', 'test', 2, 't-auto',
        date_trunc('month', current_date)::date, current_date + 200),
       ('a1000000-0000-0000-0000-000000000002', 'test', 1, 't-auto',
        date_trunc('month', current_date)::date, current_date + 200),
       -- Sans créneau habituel : ne doit jamais être auto-inscrit.
       ('a1000000-0000-0000-0000-000000000003', 'test', 2, null,
        date_trunc('month', current_date)::date, current_date + 200);

-- Trois séances À VENIR ET DANS LE MÊME MOIS.
--
-- Elles étaient posées à J+3, J+5 et J+7 : trois jours qui tombent dans deux
-- mois différents dès qu'on approche de la fin du mois. Or les crédits d'un
-- forfait se comptent PAR MOIS — une séance passée de l'autre côté du 1er
-- ouvre une réserve neuve, et le cas 6 voyait alors l'auto-inscription poser
-- une place qu'il attendait absente. La suite échouait donc les six ou sept
-- derniers jours de chaque mois, et passait le reste du temps.
--
-- L'horizon reste glissant — c'est ce que la fonction traite — mais il est
-- ancré au mois suivant, où les trois dates tombent forcément ensemble : les 4,
-- 6 et 8, toujours à venir et toujours dans les soixante jours.
insert into sessions (id, creneau_id, starts_at, ends_at, location, capacity, unit_price_cents)
values ('b1000000-0000-0000-0000-000000000001', 't-auto',
        date_trunc('month', current_date + interval '1 month')::date + 3 + time '14:00',
        date_trunc('month', current_date + interval '1 month')::date + 3 + time '17:00',
        'Revel', 2, 2500),
       ('b1000000-0000-0000-0000-000000000002', 't-auto',
        date_trunc('month', current_date + interval '1 month')::date + 5 + time '14:00',
        date_trunc('month', current_date + interval '1 month')::date + 5 + time '17:00',
        'Revel', 2, 2500),
       ('b1000000-0000-0000-0000-000000000003', 't-auto',
        date_trunc('month', current_date + interval '1 month')::date + 7 + time '14:00',
        date_trunc('month', current_date + interval '1 month')::date + 7 + time '17:00',
        'Revel', 2, 2500);

-- ── 1. Premier passage ───────────────────────────────────────────────────
insert into resultats(cas, verdict)
select '1 deux credits donnent deux places',
       case when run_auto_enrolment(60) >= 3 then 'OK' else 'ECHEC' end;

insert into resultats(cas, verdict)
select '2 le forfait 2/mois a bien 2 places',
       case when count(*) = 2 then 'OK' else 'ECHEC: '||count(*) end
from bookings where participant_id = 'a1000000-0000-0000-0000-000000000001'
  and status = 'booked';

insert into resultats(cas, verdict)
select '3 le forfait 1/mois n a qu une place',
       case when count(*) = 1 then 'OK' else 'ECHEC: '||count(*) end
from bookings where participant_id = 'a1000000-0000-0000-0000-000000000002'
  and status = 'booked';

insert into resultats(cas, verdict)
select '4 sans creneau habituel, rien',
       case when count(*) = 0 then 'OK' else 'ECHEC: '||count(*) end
from bookings where participant_id = 'a1000000-0000-0000-0000-000000000003';

-- ── 5. Idempotence ───────────────────────────────────────────────────────
insert into resultats(cas, verdict)
select '5 relancer ne cree rien',
       case when run_auto_enrolment(60) = 0 then 'OK' else 'ECHEC' end;

-- ── 6. Une place libérée ne ressuscite pas ───────────────────────────────
update bookings set status = 'released', released_at = now()
where participant_id = 'a1000000-0000-0000-0000-000000000001'
  and session_id = 'b1000000-0000-0000-0000-000000000001';

insert into resultats(cas, verdict)
select '6 la place liberee ne revient pas',
       case when run_auto_enrolment(60) = 0
             and not exists (select 1 from bookings
                             where participant_id = 'a1000000-0000-0000-0000-000000000001'
                               and session_id = 'b1000000-0000-0000-0000-000000000001'
                               and status = 'booked')
            then 'OK' else 'ECHEC' end;

-- ── 7. Capacité respectée ────────────────────────────────────────────────
-- La séance du +7 a 2 places ; on en occupe deux avec d'autres personnes.
insert into participants (id, first_name, last_name) values
  ('a1000000-0000-0000-0000-000000000004', 'Bloque', 'Un'),
  ('a1000000-0000-0000-0000-000000000005', 'Bloque', 'Deux');
insert into bookings (session_id, participant_id, source, status) values
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000004', 'admin', 'booked'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000005', 'admin', 'booked');

insert into participants (id, first_name, last_name)
values ('a1000000-0000-0000-0000-000000000006', 'Arrive', 'Tard');
insert into subscriptions (participant_id, season, credits_per_month,
                           home_creneau_id, starts_on, ends_on)
values ('a1000000-0000-0000-0000-000000000006', 'test', 2, 't-auto',
        date_trunc('month', current_date)::date, current_date + 200);

select run_auto_enrolment(60);

insert into resultats(cas, verdict)
select '7 seance complete ignoree sans erreur',
       case when not exists (
         select 1 from bookings
         where participant_id = 'a1000000-0000-0000-0000-000000000006'
           and session_id = 'b1000000-0000-0000-0000-000000000003')
       then 'OK' else 'ECHEC: inscrit sur une seance complete' end;

-- ── 8. Aucun solde négatif produit ───────────────────────────────────────
insert into resultats(cas, verdict)
select '8 aucun solde negatif cree',
       case when count(*) = 0 then 'OK'
            else 'ECHEC: '||count(*)||' solde(s) negatif(s)' end
from participants p
where balance(p.id) < 0
  and p.id in ('a1000000-0000-0000-0000-000000000001',
               'a1000000-0000-0000-0000-000000000002',
               'a1000000-0000-0000-0000-000000000006');

select verdict, cas from resultats order by ordre;

rollback;
