-- Tests des opérations de réservation. Tout est annulé par le rollback final.
-- Règles vérifiées : DOCS/SPEC-abonnements-credits.md §5, §5 bis.
--
-- Les cas d'échec sont testés dans des blocs DO avec gestion d'exception :
-- une exception y remonte jusqu'au savepoint du bloc, la transaction
-- englobante survit, et le verdict peut être enregistré.

begin;

create temp table resultats (ordre serial, cas text, verdict text) on commit drop;

insert into creneaux (id, label, group_id, default_start_time, default_end_time,
                      default_location, default_capacity, default_unit_price_cents)
values ('t-resa', 'Test réservations', 'revel-adultes', '14:00', '17:00', 'Revel', 6, 2500);

insert into participants (id, first_name, last_name) values
  ('a0000000-0000-0000-0000-000000000001', 'Alice', 'Test'),
  ('a0000000-0000-0000-0000-000000000002', 'Bruno', 'Test'),
  ('a0000000-0000-0000-0000-000000000003', 'Chloe', 'Test');

-- Une seule place : sert aux tests de capacité.
insert into sessions (id, creneau_id, starts_at, ends_at, location,
                      capacity, unit_price_cents) values
  ('50000000-0000-0000-0000-000000000001', 't-resa',
   '2026-10-08 14:00+02', '2026-10-08 17:00+02', 'Revel', 1, 2500),
  ('50000000-0000-0000-0000-000000000002', 't-resa',
   '2026-10-15 14:00+02', '2026-10-15 17:00+02', 'Revel', 6, 2500),
  ('50000000-0000-0000-0000-000000000003', 't-resa',
   '2026-10-22 14:00+02', '2026-10-22 17:00+02', 'Revel', 6, 2500);

-- Alice a un abonnement, Bruno et Chloé n'en ont pas (solde 0, dépassement).
insert into subscriptions (participant_id, season, credits_per_month,
                           monthly_price_cents, starts_on, ends_on)
values ('a0000000-0000-0000-0000-000000000001', '2026-2027', 2, 5500,
        '2026-10-01', '2027-06-30');

-- ── 1. Réserver une place libre ──────────────────────────────────────────
do $$
begin
  perform book_participant('50000000-0000-0000-0000-000000000001',
                           'a0000000-0000-0000-0000-000000000001', 'admin');
  insert into resultats(cas, verdict) values ('1 reservation sur place libre', 'OK');
exception when others then
  insert into resultats(cas, verdict) values ('1 reservation sur place libre', 'ECHEC: '||sqlerrm);
end $$;

-- ── 2. La séance est pleine : la suivante doit échouer ───────────────────
do $$
begin
  perform book_participant('50000000-0000-0000-0000-000000000001',
                           'a0000000-0000-0000-0000-000000000002', 'admin');
  insert into resultats(cas, verdict) values ('2 seance complete refusee', 'ECHEC: aucune exception');
exception when others then
  insert into resultats(cas, verdict) values ('2 seance complete refusee',
    case when sqlerrm like '%complète%' then 'OK' else 'ECHEC: '||sqlerrm end);
end $$;

-- ── 3. Deux fois la même personne sur la même séance ─────────────────────
--
-- La réservation initiale est faite dans SON PROPRE bloc. Une exception
-- ramène la transaction au savepoint ouvert au début du bloc DO : les mettre
-- ensemble annulerait aussi l'insertion réussie, et les tests suivants
-- travailleraient sur un état différent de celui qu'ils décrivent.
do $$
begin
  perform book_participant('50000000-0000-0000-0000-000000000002',
                           'a0000000-0000-0000-0000-000000000001', 'member');
end $$;

do $$
begin
  perform book_participant('50000000-0000-0000-0000-000000000002',
                           'a0000000-0000-0000-0000-000000000001', 'member');
  insert into resultats(cas, verdict) values ('3 double reservation refusee', 'ECHEC: aucune exception');
exception when unique_violation then
  insert into resultats(cas, verdict) values ('3 double reservation refusee', 'OK');
when others then
  insert into resultats(cas, verdict) values ('3 double reservation refusee', 'ECHEC: '||sqlerrm);
end $$;

-- ── 4. Deux personnes différentes sur la même séance : autorisé ──────────
-- (deux sœurs occupent bien deux places)
do $$
begin
  perform book_participant('50000000-0000-0000-0000-000000000002',
                           'a0000000-0000-0000-0000-000000000003', 'admin');
  insert into resultats(cas, verdict) values ('4 deux personnes memes seance', 'OK');
exception when others then
  insert into resultats(cas, verdict) values ('4 deux personnes memes seance', 'ECHEC: '||sqlerrm);
end $$;

-- ── 5. Libérer puis re-réserver la même séance ───────────────────────────
do $$
declare v_booking uuid;
begin
  select id into v_booking from bookings
  where session_id = '50000000-0000-0000-0000-000000000001'
    and participant_id = 'a0000000-0000-0000-0000-000000000001'
    and status = 'booked';

  perform release_booking(v_booking);
  perform book_participant('50000000-0000-0000-0000-000000000001',
                           'a0000000-0000-0000-0000-000000000002', 'admin');
  insert into resultats(cas, verdict) values ('5 liberer puis rereserver', 'OK');
exception when others then
  insert into resultats(cas, verdict) values ('5 liberer puis rereserver', 'ECHEC: '||sqlerrm);
end $$;

-- ── 6. La ligne libérée subsiste (pierre tombale) ────────────────────────
insert into resultats(cas, verdict)
select '6 ligne liberee conservee',
       case when count(*) = 1 then 'OK' else 'ECHEC: '||count(*)||' ligne(s) released' end
from bookings
where session_id = '50000000-0000-0000-0000-000000000001' and status = 'released';

-- ── 7. Réduire la capacité sous les réservations en cours ────────────────
do $$
begin
  perform set_session_capacity('50000000-0000-0000-0000-000000000002', 1);
  insert into resultats(cas, verdict) values ('7 capacite reduite refusee', 'ECHEC: aucune exception');
exception when others then
  insert into resultats(cas, verdict) values ('7 capacite reduite refusee',
    case when sqlerrm like '%inférieure%' then 'OK' else 'ECHEC: '||sqlerrm end);
end $$;

insert into resultats(cas, verdict)
select '8 capacite inchangee apres refus',
       case when capacity = 6 then 'OK' else 'ECHEC: capacite='||capacity end
from sessions where id = '50000000-0000-0000-0000-000000000002';

-- ── 9. Annuler une séance rend les crédits ───────────────────────────────
-- Alice a 2 réservations actives avant annulation (séances 2 et 3).
do $$
begin
  perform book_participant('50000000-0000-0000-0000-000000000003',
                           'a0000000-0000-0000-0000-000000000001', 'auto');
end $$;

insert into resultats(cas, verdict)
select '9 consommation avant annulation',
       case when consumed_credits('a0000000-0000-0000-0000-000000000001') = 2
            then 'OK' else 'ECHEC: '||consumed_credits('a0000000-0000-0000-0000-000000000001') end;

insert into resultats(cas, verdict)
select '10 cancel_session renvoie le nombre',
       case when cancel_session('50000000-0000-0000-0000-000000000003') = 1
            then 'OK' else 'ECHEC' end;

insert into resultats(cas, verdict)
select '11 credit rendu apres annulation',
       case when consumed_credits('a0000000-0000-0000-0000-000000000001') = 1
            then 'OK' else 'ECHEC: '||consumed_credits('a0000000-0000-0000-0000-000000000001') end;

-- ── 12. Réserver sur une séance annulée ──────────────────────────────────
do $$
begin
  perform book_participant('50000000-0000-0000-0000-000000000003',
                           'a0000000-0000-0000-0000-000000000002', 'admin');
  insert into resultats(cas, verdict) values ('12 seance annulee non reservable', 'ECHEC: aucune exception');
exception when others then
  insert into resultats(cas, verdict) values ('12 seance annulee non reservable',
    case when sqlerrm like '%annulée%' then 'OK' else 'ECHEC: '||sqlerrm end);
end $$;

-- ── 13. Dépassement autorisé : Bruno n'a aucun abonnement ────────────────
-- Il a une réservation active (séance 1) pour un octroi nul.
insert into resultats(cas, verdict)
select '13 depassement autorise, solde negatif',
       case when balance('a0000000-0000-0000-0000-000000000002', '2026-10-15') = -1
            then 'OK' else 'ECHEC: solde='||balance('a0000000-0000-0000-0000-000000000002','2026-10-15') end;

-- ── 14. release_booking sur une ligne déjà libérée ───────────────────────
do $$
declare v_booking uuid; v_ok boolean;
begin
  select id into v_booking from bookings
  where session_id = '50000000-0000-0000-0000-000000000001' and status = 'released' limit 1;
  v_ok := release_booking(v_booking);
  insert into resultats(cas, verdict) values ('14 double liberation sans effet',
    case when v_ok = false then 'OK' else 'ECHEC: a modifie une ligne' end);
end $$;

select verdict, cas from resultats order by ordre;

rollback;
