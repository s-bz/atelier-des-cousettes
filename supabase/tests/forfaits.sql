-- Forfaits en nombre de séances : octroi immédiat, auto-inscription étalée.

begin;

create temp table resultats (ordre serial, cas text, verdict text) on commit drop;

insert into creneaux (id, label, group_id, audience, default_start_time, default_end_time,
                      default_location, default_capacity, default_unit_price_cents)
values ('t-forf', 'Test forfait', 'revel-adultes', 'adultes', '14:00', '17:00', 'Revel', 20, 2500);

insert into participants (id, first_name, last_name, audience) values
  ('e1000000-0000-0000-0000-000000000001', 'Dix', 'Seances', 'adulte'),
  ('e1000000-0000-0000-0000-000000000002', 'Deux', 'ParMois', 'adulte');

-- Saison de dix mois à partir du mois courant.
insert into subscriptions (participant_id, season, total_credits, credits_per_month,
                           home_creneau_id, starts_on, ends_on)
values ('e1000000-0000-0000-0000-000000000001', 'test', 10, null, 't-forf',
        date_trunc('month', current_date)::date,
        (date_trunc('month', current_date) + interval '9 months' + interval '1 month - 1 day')::date);

insert into subscriptions (participant_id, season, total_credits, credits_per_month,
                           home_creneau_id, starts_on, ends_on)
values ('e1000000-0000-0000-0000-000000000002', 'test', null, 2, 't-forf',
        date_trunc('month', current_date)::date,
        (date_trunc('month', current_date) + interval '9 months' + interval '1 month - 1 day')::date);

-- ── 1. Le forfait est acquis en entier dès le premier jour ───────────────
insert into resultats(cas, verdict)
select '1 forfait acquis en entier',
       case when granted_credits('e1000000-0000-0000-0000-000000000001', current_date) = 10
            then 'OK' else 'ECHEC: '||granted_credits('e1000000-0000-0000-0000-000000000001', current_date) end;

insert into resultats(cas, verdict)
select '2 le mensuel reste mensuel',
       case when granted_credits('e1000000-0000-0000-0000-000000000002', current_date) = 2
            then 'OK' else 'ECHEC: '||granted_credits('e1000000-0000-0000-0000-000000000002', current_date) end;

-- ── 3. Un abonnement sans droit, ou avec les deux, est refusé ────────────
do $$
begin
  insert into subscriptions (participant_id, season, total_credits, credits_per_month,
                             home_creneau_id, starts_on, ends_on)
  values ('e1000000-0000-0000-0000-000000000001', 'test', 10, 2, 't-forf',
          current_date, current_date + 100);
  insert into resultats(cas, verdict) values ('3 les deux droits refuses', 'ECHEC: aucune exception');
exception when check_violation then
  insert into resultats(cas, verdict) values ('3 les deux droits refuses', 'OK');
end $$;

-- ── 4. L'auto-inscription étale, elle ne brûle pas ───────────────────────
-- Huit séances dans le mois courant : de quoi tout consommer d'un coup si la
-- répartition ne fonctionnait pas.
insert into sessions (creneau_id, starts_at, ends_at, location, capacity, unit_price_cents)
select 't-forf',
       current_date + n + time '14:00',
       current_date + n + time '17:00',
       'Revel', 20, 2500
from generate_series(1, 8) as n
where (current_date + n) < (date_trunc('month', current_date) + interval '1 month')::date;

select run_auto_enrolment(30);

insert into resultats(cas, verdict)
select '4 forfait etale, pas brule',
       case when count(*) <= 2 then 'OK — '||count(*)||' ce mois-ci'
            else 'ECHEC: '||count(*)||' posees d un coup' end
from bookings b join sessions s on s.id = b.session_id
where b.participant_id = 'e1000000-0000-0000-0000-000000000001' and b.status = 'booked';

insert into resultats(cas, verdict)
select '5 il reste du forfait pour la suite',
       case when balance('e1000000-0000-0000-0000-000000000001') >= 8
            then 'OK' else 'ECHEC: solde '||balance('e1000000-0000-0000-0000-000000000001') end;

select verdict, cas from resultats order by ordre;

rollback;
