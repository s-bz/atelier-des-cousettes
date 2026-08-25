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

-- ── 4 et 5. L'auto-inscription étale SUR LES DATES, pas sur les mois ─────
--
-- L'ancienne version étalait sur les mois, à raison de `crédits ÷ mois` : un
-- pack de seize séances sur une saison de dix mois visait 1,6 par mois, et les
-- mois à deux dates n'en plaçaient qu'une. Un achat réel en a perdu deux.
--
-- Trois mois de dates, à raison de huit par mois — vingt-quatre en tout pour
-- dix crédits. Ancrées au mois suivant : à J+n, les huit premières
-- déborderaient sur le mois d'après dès qu'on approche de la fin du mois, et la
-- suite virerait au rouge une semaine par mois.
insert into sessions (creneau_id, starts_at, ends_at, location, capacity, unit_price_cents)
-- UN CALENDRIER INÉGAL, ET C'EST TOUT L'INTÉRÊT : trois dates le premier mois,
-- une le deuxième, une le troisième. Réparti également (huit, huit, huit), le
-- calcul par mois et le calcul par dates donnent le même résultat, et le test
-- ne prouve rien. C'est le déséquilibre qui les sépare — celui du vrai
-- calendrier, deux séances certains mois et une les autres.
--
-- `::date` après l'ajout de mois : sinon on additionne un entier à un
-- timestamp, ce que Postgres refuse.
select 't-forf',
       ((date_trunc('month', current_date + interval '1 month') + (m * interval '1 month'))::date + n)
         + time '14:00',
       ((date_trunc('month', current_date + interval '1 month') + (m * interval '1 month'))::date + n)
         + time '17:00',
       'Revel', 20, 2500
from (values (0, 1), (0, 2), (0, 3), (1, 1), (2, 1)) as v(m, n);

update subscriptions
   set total_credits = 3,
       credits_per_month = null,
       starts_on = date_trunc('month', current_date + interval '1 month')::date,
       ends_on   = (date_trunc('month', current_date + interval '4 months') - interval '1 day')::date
 where participant_id = 'e1000000-0000-0000-0000-000000000001';

select run_auto_enrolment(200);

-- TROIS CRÉDITS SUR CINQ DATES : ce qu'on vérifie est qu'il en reste pour la
-- fin. Prendre les trois premières — toutes dans le premier mois — laisserait
-- l'adhérent sans rien de novembre à janvier, ce qui est précisément ce qu'un
-- forfait de saison ne doit pas faire.
--
-- On n'exige pas un mois servi sur trois : avec trois dates sur cinq dans le
-- premier mois, une répartition régulière en pose deux là et une à la fin. Ce
-- qui compte est que la DERNIÈRE date soit tenue.
insert into resultats(cas, verdict)
select '4 forfait etale, la fin est servie',
       case when max(s.starts_at) >= date_trunc('month', current_date + interval '3 months')
            then 'OK'
            else 'ECHEC: rien apres '||to_char(max(s.starts_at), 'DD/MM') end
from bookings b join sessions s on s.id = b.session_id
where b.participant_id = 'e1000000-0000-0000-0000-000000000001' and b.status = 'booked';

insert into resultats(cas, verdict)
select '5 tous les credits places, aucun de plus',
       case when count(*) = 3 then 'OK'
            else 'ECHEC: '||count(*)||' places pour 3 credits' end
from bookings b
where b.participant_id = 'e1000000-0000-0000-0000-000000000001' and b.status = 'booked';

-- ── 5 bis. AUTANT DE DATES QUE DE CRÉDITS : ON LES PREND TOUTES ─────────
-- C'est le cas de l'achat réel — seize séances, seize dates au calendrier — où
-- la répartition par mois n'en plaçait que quatorze.
insert into participants (id, first_name, last_name, audience)
values ('e1000000-0000-0000-0000-000000000009', 'Juste', 'Assez', 'adulte');

insert into subscriptions (participant_id, season, total_credits, home_creneau_id, starts_on, ends_on)
values ('e1000000-0000-0000-0000-000000000009', 'test', 5, 't-forf',
        date_trunc('month', current_date + interval '1 month')::date,
        (date_trunc('month', current_date + interval '4 months') - interval '1 day')::date);

select run_auto_enrolment(200);

insert into resultats(cas, verdict)
select '5bis autant de dates que de credits : toutes prises',
       case when count(*) = 5 then 'OK'
            else 'ECHEC: '||count(*)||' places sur 5 dates' end
from bookings b
where b.participant_id = 'e1000000-0000-0000-0000-000000000009' and b.status = 'booked';

-- ── 6 et 7. UN FORFAIT ACHETÉ AVANT LA RENTRÉE ──────────────────────────
--
-- Le cas réel : l'inscription se prend en août, la saison commence le
-- 1er septembre. L'adhérente a payé l'année entière et veut voir son planning
-- tout de suite, le remanier, et retenir ses places avant qu'elles ne partent.
-- Un forfait est acquis à l'achat ; `starts_on` et `ends_on` disent quelles
-- séances il couvre, non à partir de quand les crédits existent — c'est déjà
-- ainsi que `extra_sessions` les lit.
--
-- Un abonnement MENSUEL, lui, doit rester à zéro : ses crédits s'acquièrent
-- mois après mois, et rien ne s'est écoulé avant le premier.

insert into participants (id, first_name, last_name, audience) values
  ('e1000000-0000-0000-0000-000000000003', 'Forfait', 'DesLaRentree', 'adulte'),
  ('e1000000-0000-0000-0000-000000000004', 'Mensuel', 'DesLaRentree', 'adulte');

insert into subscriptions (participant_id, season, total_credits, credits_per_month,
                           home_creneau_id, starts_on, ends_on)
values ('e1000000-0000-0000-0000-000000000003', 'test', 9, null, 't-forf',
        (date_trunc('month', current_date) + interval '1 month')::date,
        (date_trunc('month', current_date) + interval '10 months' - interval '1 day')::date),
       ('e1000000-0000-0000-0000-000000000004', 'test', null, 2, 't-forf',
        (date_trunc('month', current_date) + interval '1 month')::date,
        (date_trunc('month', current_date) + interval '10 months' - interval '1 day')::date);

insert into resultats(cas, verdict)
select '6 forfait acquis avant le debut de saison',
       case when granted_credits('e1000000-0000-0000-0000-000000000003', current_date) = 9
            then 'OK' else 'ECHEC: '||granted_credits('e1000000-0000-0000-0000-000000000003', current_date) end;

insert into resultats(cas, verdict)
select '7 le mensuel n octroie rien avant son debut',
       case when granted_credits('e1000000-0000-0000-0000-000000000004', current_date) = 0
            then 'OK' else 'ECHEC: '||granted_credits('e1000000-0000-0000-0000-000000000004', current_date) end;

select verdict, cas from resultats order by ordre;

rollback;
