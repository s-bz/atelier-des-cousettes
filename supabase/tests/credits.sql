-- Tests de l'arithmétique des crédits. Tout est annulé par le rollback final :
-- ce script ne laisse aucune donnée derrière lui et peut être rejoué.
-- Règles vérifiées : DOCS/SPEC-abonnements-credits.md §3, §5, §5 bis, §6.

begin;

insert into creneaux (id, label, group_id, default_start_time, default_end_time,
                      default_location, default_capacity, default_unit_price_cents)
values ('test-jeudi', 'Test jeudi', 'revel-adultes', '14:00', '17:00', 'Revel', 6, 2500);

insert into participants (id, first_name, last_name)
values ('11111111-1111-1111-1111-111111111111', 'Test', 'Bornes'),
       ('22222222-2222-2222-2222-222222222222', 'Test', 'Successifs'),
       ('33333333-3333-3333-3333-333333333333', 'Test', 'Consommation');

-- A. Un abonnement simple, 2 crédits/mois, octobre → juin.
insert into subscriptions (participant_id, season, credits_per_month,
                           starts_on, ends_on)
values ('11111111-1111-1111-1111-111111111111', '2026-2027', 2,
        '2026-10-01', '2027-06-30');

-- B. Changement de formule au 1er janvier : 1/mois puis 2/mois.
insert into subscriptions (participant_id, season, credits_per_month,
                           starts_on, ends_on)
values ('22222222-2222-2222-2222-222222222222', '2026-2027', 1,
        '2026-10-01', '2026-12-31'),
       ('22222222-2222-2222-2222-222222222222', '2026-2027', 2,
        '2027-01-01', '2027-06-30');

-- C. Consommation : une réservation active, une libérée, une sur séance annulée.
insert into subscriptions (participant_id, season, credits_per_month,
                           starts_on, ends_on)
values ('33333333-3333-3333-3333-333333333333', '2026-2027', 2,
        '2026-10-01', '2027-06-30');

insert into sessions (id, creneau_id, starts_at, ends_at, location,
                      capacity, unit_price_cents, status)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'test-jeudi',
        '2026-10-08 14:00+02', '2026-10-08 17:00+02', 'Revel', 6, 2500, 'scheduled'),
       ('aaaaaaaa-0000-0000-0000-000000000002', 'test-jeudi',
        '2026-10-22 14:00+02', '2026-10-22 17:00+02', 'Revel', 6, 2500, 'scheduled'),
       ('aaaaaaaa-0000-0000-0000-000000000003', 'test-jeudi',
        '2026-11-05 14:00+01', '2026-11-05 17:00+01', 'Revel', 6, 2500, 'cancelled');

insert into bookings (session_id, participant_id, source, status)
values ('aaaaaaaa-0000-0000-0000-000000000001',
        '33333333-3333-3333-3333-333333333333', 'auto', 'booked'),
       ('aaaaaaaa-0000-0000-0000-000000000002',
        '33333333-3333-3333-3333-333333333333', 'member', 'released'),
       ('aaaaaaaa-0000-0000-0000-000000000003',
        '33333333-3333-3333-3333-333333333333', 'auto', 'booked');

-- Assertions.
with resultats(cas, obtenu, attendu) as (
  values
    ('A1 veille du debut',            granted_credits('11111111-1111-1111-1111-111111111111','2026-09-30'),  0),
    ('A2 premier jour',               granted_credits('11111111-1111-1111-1111-111111111111','2026-10-01'),  2),
    ('A3 mi-decembre',                granted_credits('11111111-1111-1111-1111-111111111111','2026-12-15'),  6),
    ('A4 dernier jour',               granted_credits('11111111-1111-1111-1111-111111111111','2027-06-30'), 18),
    ('A5 apres la fin, fige',         granted_credits('11111111-1111-1111-1111-111111111111','2027-07-15'), 18),
    ('B1 deux abos successifs 3+12',  granted_credits('22222222-2222-2222-2222-222222222222','2027-06-30'), 15),
    ('B2 avant bascule = 3',          granted_credits('22222222-2222-2222-2222-222222222222','2026-12-31'),  3),
    ('C1 seule la resa active compte', consumed_credits('33333333-3333-3333-3333-333333333333'),             1),
    ('C2 solde au 15/10',             balance('33333333-3333-3333-3333-333333333333','2026-10-15'),          1),
    ('C3 sans abonnement = 0',        granted_credits('44444444-4444-4444-4444-444444444444','2027-01-01'),  0)
)
select case when obtenu = attendu then 'OK   ' else 'ECHEC' end as verdict,
       cas, obtenu, attendu
from resultats
order by cas;

rollback;
