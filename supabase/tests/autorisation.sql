-- Tests d'autorisation des fonctions SECURITY DEFINER.
--
-- Ces fonctions contournent le RLS par construction — c'est leur raison d'être
-- (poser un verrou, compter toutes les réservations). Elles doivent donc
-- porter leur propre autorisation. Sans ces tests, la faille corrigée par
-- 20260729122131_secure_booking_functions.sql serait passée inaperçue :
-- n'importe quel adhérent connecté pouvait réserver au nom d'un autre.
--
-- On simule un appelant réel en prenant le rôle « authenticated » et en
-- posant la revendication JWT que PostgREST poserait.

begin;

create temp table resultats (ordre serial, cas text, verdict text) on commit drop;

-- Une partie du test s'exécute sous le rôle « authenticated », qui n'a par
-- défaut aucun droit sur cette table temporaire. Sans ces grants, l'écriture
-- du verdict échoue elle-même et masque le résultat réel.
-- Le schéma temporaire porte un nom propre à la session (pg_temp_58…) et ne
-- peut pas être désigné par « pg_temp » dans un GRANT : il faut le résoudre.
do $$
declare v_schema text;
begin
  select nspname into v_schema from pg_namespace where oid = pg_my_temp_schema();
  execute format('grant usage on schema %I to authenticated', v_schema);
end $$;

grant select, insert on resultats to authenticated;
grant usage, select on sequence resultats_ordre_seq to authenticated;

-- Les deux comptes existants sont administrateurs ; on les rétrograde le temps
-- de la transaction, sinon is_admin() court-circuiterait la vérification.
update accounts set role = 'member';

insert into creneaux (id, label, group_id, default_start_time, default_end_time,
                      default_location, default_capacity, default_unit_price_cents)
values ('t-autz', 'Test autorisation', 'revel-adultes', '14:00', '17:00', 'Revel', 6, 2500);

insert into sessions (id, creneau_id, starts_at, ends_at, location, capacity, unit_price_cents)
values ('60000000-0000-0000-0000-000000000001', 't-autz',
        '2026-10-08 14:00+02', '2026-10-08 17:00+02', 'Revel', 6, 2500);

-- Un participant rattaché à chacun des deux comptes.
insert into participants (id, account_id, first_name, last_name)
select 'b0000000-0000-0000-0000-000000000001', id, 'Participant', 'CompteA'
from accounts order by email limit 1;

insert into participants (id, account_id, first_name, last_name)
select 'b0000000-0000-0000-0000-000000000002', id, 'Participant', 'CompteB'
from accounts order by email offset 1 limit 1;

-- On se met dans la peau du compte A.
-- La revendication « role » est indispensable : c'est elle que lit auth.role(),
-- sur laquelle repose la vérification d'appartenance. « sub » seul ne suffit
-- pas, et le test passerait alors sans rien vérifier.
select set_config('request.jwt.claims',
       json_build_object(
         'sub',  (select auth_user_id from accounts order by email limit 1),
         'role', 'authenticated'
       )::text, true);
set local role authenticated;

-- ── 1. Réserver pour SON propre participant : autorisé ───────────────────
do $$
begin
  perform book_participant('60000000-0000-0000-0000-000000000001',
                           'b0000000-0000-0000-0000-000000000001', 'member');
  insert into resultats(cas, verdict) values ('1 reserver pour soi', 'OK');
exception when others then
  insert into resultats(cas, verdict) values ('1 reserver pour soi', 'ECHEC: '||sqlerrm);
end $$;

-- ── 2. Réserver pour le participant d'un AUTRE compte : refusé ───────────
do $$
begin
  perform book_participant('60000000-0000-0000-0000-000000000001',
                           'b0000000-0000-0000-0000-000000000002', 'member');
  insert into resultats(cas, verdict) values ('2 reserver pour autrui refuse', 'ECHEC: aucune exception');
exception when others then
  insert into resultats(cas, verdict) values ('2 reserver pour autrui refuse',
    case when sqlerrm like '%non rattaché%' then 'OK' else 'ECHEC: '||sqlerrm end);
end $$;

-- ── 3. Libérer la réservation d'un autre compte : refusé ─────────────────
reset role;
insert into bookings (id, session_id, participant_id, source, status)
values ('70000000-0000-0000-0000-000000000001',
        '60000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002', 'admin', 'booked');
set local role authenticated;

do $$
begin
  perform release_booking('70000000-0000-0000-0000-000000000001');
  insert into resultats(cas, verdict) values ('3 liberer place d autrui refuse', 'ECHEC: aucune exception');
exception when others then
  insert into resultats(cas, verdict) values ('3 liberer place d autrui refuse',
    case when sqlerrm like '%non rattachée%' then 'OK' else 'ECHEC: '||sqlerrm end);
end $$;

-- ── 4. Annuler une séance : refusé, la fonction n'est plus accordée ──────
do $$
begin
  perform cancel_session('60000000-0000-0000-0000-000000000001');
  insert into resultats(cas, verdict) values ('4 annuler seance refuse', 'ECHEC: aucune exception');
exception when insufficient_privilege then
  insert into resultats(cas, verdict) values ('4 annuler seance refuse', 'OK');
when others then
  insert into resultats(cas, verdict) values ('4 annuler seance refuse', 'ECHEC: '||sqlerrm);
end $$;

-- ── 5. Modifier une capacité : refusé de la même façon ───────────────────
do $$
begin
  perform set_session_capacity('60000000-0000-0000-0000-000000000001', 99);
  insert into resultats(cas, verdict) values ('5 changer capacite refuse', 'ECHEC: aucune exception');
exception when insufficient_privilege then
  insert into resultats(cas, verdict) values ('5 changer capacite refuse', 'OK');
when others then
  insert into resultats(cas, verdict) values ('5 changer capacite refuse', 'ECHEC: '||sqlerrm);
end $$;

reset role;
select verdict, cas from resultats order by ordre;

rollback;
