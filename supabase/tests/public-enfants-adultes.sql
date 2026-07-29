-- Un enfant ne réserve que des séances enfants, un adulte que des séances
-- adultes.
--
-- Les séances enfants durent 2 h, les séances adultes 2 h 30 ou 3 h : ce ne
-- sont pas les mêmes ateliers. La règle vaut quel que soit le chemin d'appel,
-- puisqu'elle est portée par book_participant et non par les écrans.

begin;

create temp table resultats (ordre serial, cas text, verdict text) on commit drop;

insert into creneaux (id, label, group_id, audience, default_start_time, default_end_time,
                      default_location, default_capacity, default_unit_price_cents)
values ('t-pub-a', 'Adultes', 'revel-adultes', 'adultes', '14:00', '17:00', 'Revel', 6, 2500),
       ('t-pub-e', 'Enfants', 'revel-enfants', 'enfants', '10:00', '12:00', 'Revel', 6, 2500);

insert into participants (id, first_name, last_name, audience) values
  ('c1000000-0000-0000-0000-000000000001', 'Une', 'Adulte', 'adulte'),
  ('c1000000-0000-0000-0000-000000000002', 'Un', 'Enfant', 'enfant');

insert into sessions (id, creneau_id, starts_at, ends_at, location, capacity, unit_price_cents) values
  ('c2000000-0000-0000-0000-000000000001', 't-pub-a',
   current_date + 3 + time '14:00', current_date + 3 + time '17:00', 'Revel', 6, 2500),
  ('c2000000-0000-0000-0000-000000000002', 't-pub-e',
   current_date + 3 + time '10:00', current_date + 3 + time '12:00', 'Revel', 6, 2500);

-- ── 1. Un enfant sur une séance adulte : refusé ──────────────────────────
do $$
begin
  perform book_participant('c2000000-0000-0000-0000-000000000001',
                           'c1000000-0000-0000-0000-000000000002', 'admin');
  insert into resultats(cas, verdict) values ('1 enfant sur seance adulte refuse', 'ECHEC: aucune exception');
exception when others then
  insert into resultats(cas, verdict) values ('1 enfant sur seance adulte refuse',
    case when sqlerrm like '%adultes%' then 'OK' else 'ECHEC: '||sqlerrm end);
end $$;

-- ── 2. Un adulte sur une séance enfants : refusé aussi ───────────────────
-- Il y prendrait la place d'un enfant.
do $$
begin
  perform book_participant('c2000000-0000-0000-0000-000000000002',
                           'c1000000-0000-0000-0000-000000000001', 'admin');
  insert into resultats(cas, verdict) values ('2 adulte sur seance enfants refuse', 'ECHEC: aucune exception');
exception when others then
  insert into resultats(cas, verdict) values ('2 adulte sur seance enfants refuse',
    case when sqlerrm like '%enfants%' then 'OK' else 'ECHEC: '||sqlerrm end);
end $$;

-- ── 3. Chacun dans son public : accepté ──────────────────────────────────
do $$
begin
  perform book_participant('c2000000-0000-0000-0000-000000000002',
                           'c1000000-0000-0000-0000-000000000002', 'admin');
  perform book_participant('c2000000-0000-0000-0000-000000000001',
                           'c1000000-0000-0000-0000-000000000001', 'admin');
  insert into resultats(cas, verdict) values ('3 chacun dans son public accepte', 'OK');
exception when others then
  insert into resultats(cas, verdict) values ('3 chacun dans son public accepte', 'ECHEC: '||sqlerrm);
end $$;

-- ── 4. L'auto-inscription respecte la règle ──────────────────────────────
-- Un enfant abonné au créneau adulte ne doit rien recevoir.
insert into subscriptions (participant_id, season, credits_per_month,
                           home_creneau_id, starts_on, ends_on)
values ('c1000000-0000-0000-0000-000000000002', 'test', 2, 't-pub-a',
        date_trunc('month', current_date)::date, current_date + 100);

insert into sessions (id, creneau_id, starts_at, ends_at, location, capacity, unit_price_cents)
values ('c2000000-0000-0000-0000-000000000003', 't-pub-a',
        current_date + 6 + time '14:00', current_date + 6 + time '17:00', 'Revel', 6, 2500);

do $$
begin
  perform run_auto_enrolment(60);
  insert into resultats(cas, verdict) values ('4 auto-inscription respecte le public',
    case when not exists (
      select 1 from bookings b
      join sessions s on s.id = b.session_id
      where b.participant_id = 'c1000000-0000-0000-0000-000000000002'
        and s.creneau_id = 't-pub-a' and b.status = 'booked')
    then 'OK' else 'ECHEC: enfant inscrit sur un creneau adulte' end);
exception when others then
  -- L'exception ne doit pas remonter : une inéligibilité n'est pas une panne,
  -- le job doit continuer pour les autres abonnés.
  insert into resultats(cas, verdict) values ('4 auto-inscription respecte le public',
    'ECHEC: le job s''interrompt — '||sqlerrm);
end $$;

select verdict, cas from resultats order by ordre;

rollback;
