-- La place achetée à la date : stages et séances sans engagement.
--
-- Ce qui se joue ici est l'IDEMPOTENCE. Le retour du payeur et la notification
-- HelloAsso appellent tous deux le provisionnement, souvent en même temps ; et
-- une commande rejouée ne doit jamais poser une seconde place — ni, pire,
-- échouer sur une séance devenue complète alors que la place était déjà prise.

begin;
create temp table r (ordre serial, cas text, verdict text) on commit drop;

insert into accounts (id, email) values
  ('d0000000-0000-0000-0000-000000000001', 'payeur@test.fr');

insert into participants (id, account_id, first_name, last_name, audience) values
  ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Camille', 'Durand', 'adulte'),
  ('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Alex', 'Durand', 'adulte');

insert into creneaux (id, label, audience, kind, a_l_unite, au_forfait,
                      default_capacity, default_unit_price_cents,
                      default_start_time, default_end_time, default_location)
values ('stage-test', 'Stage de test', 'adultes', 'stage', true, false, 1, 6000,
        '14:00', '17:00', 'Revel');

insert into sessions (id, creneau_id, starts_at, ends_at, location, capacity, unit_price_cents, status, places_attente)
values ('d2000000-0000-0000-0000-000000000001', 'stage-test',
        now() + interval '30 days', now() + interval '30 days 3 hours', 'Revel', 1, 6000, 'scheduled', 0);

-- 1. Une place payée se pose, avec sa source et sa commande.
select book_participant(
  'd2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001',
  'achat', false, 'Order:12345');

insert into r(cas, verdict)
select '1 place posee avec sa commande',
       case when count(*) = 1 then 'OK' else 'ECHEC: '||count(*) end
from bookings
where helloasso_order_id = 'Order:12345' and source = 'achat' and status = 'booked';

-- 2. LA MÊME COMMANDE REJOUÉE REND LA MÊME PLACE, SANS LEVER. C'est le cas
--    courant : le payeur revient sur le site pendant que la notification
--    arrive. L'unicité de l'index suffirait à empêcher un doublon, mais elle le
--    ferait en levant — et le provisionnement rangerait alors dans la file
--    « à traiter » une commande qui n'a pourtant aucun problème. Ce qu'on
--    vérifie ici est donc l'ABSENCE D'ERREUR autant que l'absence de doublon.
do $$
declare v_premiere uuid; v_rejeu uuid;
begin
  select id into v_premiere from bookings where helloasso_order_id = 'Order:12345';

  v_rejeu := book_participant(
    'd2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001',
    'achat', false, 'Order:12345');

  if v_rejeu is distinct from v_premiere then
    insert into r(cas, verdict) values ('2 rejeu rend la meme place', 'ECHEC: place differente');
  else
    insert into r(cas, verdict) values ('2 rejeu rend la meme place', 'OK');
  end if;
exception when others then
  insert into r(cas, verdict) values ('2 rejeu rend la meme place', 'ECHEC: a leve — '||sqlerrm);
end $$;

insert into r(cas, verdict)
select '2b une seule place au total',
       case when count(*) = 1 then 'OK' else 'ECHEC: '||count(*)||' places' end
from bookings where helloasso_order_id = 'Order:12345';

-- 3. La séance n'a qu'une place : une AUTRE commande est refusée. Sans quoi on
--    vendrait deux fois le même siège.
do $$
begin
  perform book_participant(
    'd2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002',
    'achat', false, 'Order:99999');
  insert into r(cas, verdict) values ('3 seance complete refusee', 'ECHEC: acceptee');
exception when others then
  insert into r(cas, verdict) values ('3 seance complete refusee', 'OK');
end $$;

-- 4. Et la commande rejouée passe TOUJOURS, même séance complète : la place lui
--    appartient déjà. C'est précisément l'ordre des vérifications qui le
--    garantit — l'idempotence avant la capacité.
do $$
begin
  perform book_participant(
    'd2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001',
    'achat', false, 'Order:12345');
  insert into r(cas, verdict) values ('4 rejeu accepte malgre seance complete', 'OK');
exception when others then
  insert into r(cas, verdict)
  values ('4 rejeu accepte malgre seance complete', 'ECHEC: a leve — '||sqlerrm);
end $$;

-- 5. Deux commandes ne peuvent pas porter le même identifiant sur deux places.
do $$
begin
  insert into bookings (session_id, participant_id, source, status, helloasso_order_id)
  values ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002',
          'achat', 'waiting', 'Order:12345');
  insert into r(cas, verdict) values ('5 identifiant de commande unique', 'ECHEC: accepte');
exception when unique_violation then
  insert into r(cas, verdict) values ('5 identifiant de commande unique', 'OK');
end $$;

-- 6. Les places sans commande — forfait, administration, adhérent — restent
--    possibles à volonté : l'unicité ne porte que sur les identifiants réels.
insert into sessions (id, creneau_id, starts_at, ends_at, location, capacity, unit_price_cents, status, places_attente)
values ('d2000000-0000-0000-0000-000000000002', 'stage-test',
        now() + interval '60 days', now() + interval '60 days 3 hours', 'Revel', 5, 6000, 'scheduled', 0);

select book_participant('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'admin');
select book_participant('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'admin');

insert into r(cas, verdict)
select '6 places sans commande non contraintes',
       case when count(*) = 2 then 'OK' else 'ECHEC: '||count(*) end
from bookings
where session_id = 'd2000000-0000-0000-0000-000000000002' and helloasso_order_id is null;

-- 7. Une source inventée reste refusée : la liste est close.
do $$
begin
  insert into bookings (session_id, participant_id, source, status)
  values ('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'inventee', 'booked');
  insert into r(cas, verdict) values ('7 source inconnue refusee', 'ECHEC: acceptee');
exception when check_violation then
  insert into r(cas, verdict) values ('7 source inconnue refusee', 'OK');
end $$;

-- ── 8-10. UNE COMMANDE, UNE SEULE ANNONCE ───────────────────────────────
-- Le premier stage vendu a produit deux courriels à la même seconde : le
-- retour du payeur et la notification HelloAsso ont provisionné tous les deux,
-- `book_participant` rendant la place déjà posée au lieu de refuser. La pierre
-- départage — un passage annonce, les autres se taisent.
do $$
declare
  v_place  uuid;
  v_autre  uuid;
  v_un     boolean;
  v_deux   boolean;
begin
  select id into v_place from bookings
   where session_id = 'd2000000-0000-0000-0000-000000000002'
     and participant_id = 'd1000000-0000-0000-0000-000000000001';
  select id into v_autre from bookings
   where session_id = 'd2000000-0000-0000-0000-000000000002'
     and participant_id = 'd1000000-0000-0000-0000-000000000002';

  v_un   := reclamer_annonce(v_place);
  v_deux := reclamer_annonce(v_place);

  insert into r(cas, verdict) values
    ('8 premiere annonce accordee',
     case when v_un then 'OK' else 'ECHEC: refusee au premier passage' end),
    ('9 seconde annonce refusee',
     case when not v_deux then 'OK' else 'ECHEC: annoncee deux fois' end),
    -- La pierre est posée sur UNE place : la commande du voisin doit rester
    -- annonçable, sans quoi un achat simultané perdrait sa confirmation.
    ('10 la pierre ne vaut que pour sa place',
     case when reclamer_annonce(v_autre) then 'OK' else 'ECHEC: le voisin est muet' end);
end $$;

select verdict, cas from r order by ordre;
rollback;
