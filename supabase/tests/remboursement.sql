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

-- Quelqu'un attend l'une des séances à venir : c'est à lui qu'elle revient.
insert into participants (id, account_id, first_name, last_name, audience)
values ('f1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001',
        'Patient', 'Attend', 'adulte');
insert into bookings (session_id, participant_id, source, status)
values ('f2000000-0000-0000-0000-000000000003',
        'f1000000-0000-0000-0000-000000000002', 'member', 'waiting');

create temp table issue on commit drop as
select annuler_pour_remboursement('Order:REMB') as j;

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

-- ── 7. Ce qu'il faut pour écrire à l'adhérent ───────────────────────────
-- Sans ces dates, le courriel d'annulation ne pourrait rien énumérer.
insert into r(cas, verdict)
select '7 les seances rendues sont restituees',
       case when jsonb_array_length(j->'seances') = 3 then 'OK'
            else 'ECHEC: '||jsonb_array_length(j->'seances')::text||' séance(s)' end
from issue;

insert into r(cas, verdict)
select '8 le destinataire est nomme',
       case when j->'qui'->>'email' = 'rembourse@test.fr' then 'OK'
            else 'ECHEC: '||coalesce(j->'qui'->>'email','(aucun)') end
from issue;

-- ── 9. Et la liste d'attente est recensée ───────────────────────────────
-- C'est ce que le contournement de `release_booking` avait fait sauter : les
-- places repartaient sans être proposées à qui les attendait.
insert into r(cas, verdict)
select '9 la personne en attente est signalee',
       case when j::text like '%f1000000-0000-0000-0000-000000000002%' then 'OK'
            else 'ECHEC: personne en attente absente du bilan' end
from issue;

-- ── 10. UN FORFAIT REMBOURSÉ AVANT LA RENTRÉE ───────────────────────────
--
-- On s'inscrit en août pour une saison qui ouvre le 1er septembre : c'est le
-- cas le plus courant de l'année. Refermer l'abonnement sur « aujourd'hui »
-- le datait alors AVANT son début, et la contrainte
-- `subscription_dates_ordered` refusait la ligne — Isabelle lisait
-- « Libération impossible » et rien ne se libérait. Vu au premier
-- remboursement réel, que ce fichier ne savait pas reproduire : son abonnement
-- commençait soixante jours plus tôt.
insert into accounts (id, email) values ('f0000000-0000-0000-0000-000000000002', 'rentree@test.fr');
insert into participants (id, account_id, first_name, last_name, audience)
values ('f1000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002',
        'Pas', 'Commencé', 'adulte');

insert into sessions (id, creneau_id, starts_at, ends_at, location, capacity, unit_price_cents, status, places_attente)
values ('f2000000-0000-0000-0000-000000000009', 't-remb',
        date_trunc('month', current_date + interval '1 month') + interval '10 days',
        date_trunc('month', current_date + interval '1 month') + interval '10 days 3 hours',
        'Revel', 5, 4500, 'scheduled', 0);

insert into subscriptions (participant_id, season, total_credits, home_creneau_id,
                           starts_on, ends_on, helloasso_order_id)
values ('f1000000-0000-0000-0000-000000000003', 'test', 1, 't-remb',
        date_trunc('month', current_date + interval '1 month')::date,
        (current_date + 300), 'Order:RENTREE');

insert into bookings (session_id, participant_id, source, status)
values ('f2000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000003', 'auto', 'booked');

do $$
begin
  perform annuler_pour_remboursement('Order:RENTREE');
  insert into r(cas, verdict) values ('10 remboursement avant la rentree', 'OK');
exception when others then
  insert into r(cas, verdict) values ('10 remboursement avant la rentree', 'ECHEC: '||sqlerrm);
end $$;

insert into r(cas, verdict)
select '11 l abonnement se referme sur son premier jour',
       case when ends_on = starts_on then 'OK'
            else 'ECHEC: du '||starts_on::text||' au '||ends_on::text end
from subscriptions where helloasso_order_id = 'Order:RENTREE';

-- ── 12. LA PLACE REPRISE SUR LE CRÉDIT RENDU ────────────────────────────
--
-- Cas réel, et il ne se devine pas : on achète une séance, on la libère à temps
-- — le crédit revient — puis on repose ce crédit SUR LA MÊME DATE. La nouvelle
-- ligne est une réservation d'adhérent, sans identifiant de commande. Le
-- remboursement arrivait ensuite et ne trouvait rien : « 0 séance libérée »,
-- aucun courriel, et la place restait à quelqu'un qu'on venait de rembourser.
insert into participants (id, account_id, first_name, last_name, audience)
values ('f1000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001',
        'Repris', 'Credit', 'adulte');

insert into sessions (id, creneau_id, starts_at, ends_at, location, capacity, unit_price_cents, status, places_attente)
values ('f2000000-0000-0000-0000-000000000011', 't-remb',
        now() + interval '15 days', now() + interval '15 days 3 hours', 'Revel', 5, 4500, 'scheduled', 0),
       ('f2000000-0000-0000-0000-000000000012', 't-remb',
        now() + interval '18 days', now() + interval '18 days 3 hours', 'Revel', 5, 4500, 'scheduled', 0);

-- La place achetée, puis libérée : elle seule porte encore la commande.
insert into bookings (session_id, participant_id, source, status, helloasso_order_id, released_at)
values ('f2000000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000004',
        'achat', 'released', 'Order:REPRIS', now());

-- Reposée sur la même date, sur le crédit rendu.
insert into bookings (session_id, participant_id, source, status)
values ('f2000000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000004',
        'member', 'booked');

-- Et une AUTRE séance, réglée par une autre commande : elle ne doit pas bouger.
insert into bookings (session_id, participant_id, source, status, helloasso_order_id)
values ('f2000000-0000-0000-0000-000000000012', 'f1000000-0000-0000-0000-000000000004',
        'achat', 'booked', 'Order:AUTRE');

select annuler_pour_remboursement('Order:REPRIS');

insert into r(cas, verdict)
select '12 la place reprise sur le credit est liberee',
       case when count(*) = 0 then 'OK' else 'ECHEC: place encore reservee' end
from bookings b
where b.participant_id = 'f1000000-0000-0000-0000-000000000004'
  and b.session_id = 'f2000000-0000-0000-0000-000000000011' and b.status = 'booked';

insert into r(cas, verdict)
select '13 l autre commande n est pas touchee',
       case when count(*) = 1 then 'OK' else 'ECHEC: la seance d une autre commande a saute' end
from bookings b
where b.participant_id = 'f1000000-0000-0000-0000-000000000004'
  and b.session_id = 'f2000000-0000-0000-0000-000000000012' and b.status = 'booked';

-- ── 14. LE CRÉDIT S'EN VA AVEC L'ARGENT ─────────────────────────────────
--
-- Payer une séance, c'est acheter un crédit ; le poser sur une date, c'est le
-- dépenser. Libérer à temps le rend — et c'est juste. Mais une fois remboursé,
-- ce crédit n'a plus lieu d'être : on n'a plus rien payé.
--
-- Constaté sur le premier remboursement de séance : place libérée, file vide,
-- bilan juste… et un solde de 1. La personne gardait une séance à venir
-- prendre, réglée par un argent qu'on venait de lui rendre.
insert into remboursements (commande, paiement, montant_cents, etat, confirme_le)
values ('Order:REPRIS', 'P:REPRIS', 4500, 'Refunded', now());

insert into r(cas, verdict)
select '14 le credit rembourse ne compte plus',
       case when balance('f1000000-0000-0000-0000-000000000004') = 0 then 'OK'
            else 'ECHEC: solde '||balance('f1000000-0000-0000-0000-000000000004') end;

-- Et celle d'une autre commande, non remboursée, continue d'octroyer.
insert into r(cas, verdict)
select '15 une seance non remboursee octroie toujours',
       case when granted_credits('f1000000-0000-0000-0000-000000000004', current_date) = 1
            then 'OK' else 'ECHEC: octroi '
              ||granted_credits('f1000000-0000-0000-0000-000000000004', current_date)::text end;

select verdict, cas from r order by ordre;
rollback;
