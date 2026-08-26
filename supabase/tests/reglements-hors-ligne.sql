-- Le livre de caisse des règlements par chèque et en espèces.
--
-- CE QUI EST EN JEU : un code donne une inscription ENTIÈRE sans qu'un centime
-- passe par HelloAsso. C'est donc la base, et elle seule, qui doit garantir
-- qu'il ne serve jamais deux fois — il n'y a pas de paiement pour arbitrer, et
-- chaque tentative d'achat forge sa propre référence.

begin;
create temp table r (ordre serial, cas text, verdict text) on commit drop;

insert into reglements_hors_ligne (code, moyen, montant_cents, saison)
values
  ('TESTCHQ1', 'cheque',  33900, '2026-2027'),
  ('TESTCHQ2', 'especes', 33900, '2026-2027'),
  ('TESTCHQ3', 'cheque',  33900, '2026-2027'),
  ('TESTCHQ4', 'cheque',  33900, '2026-2027');

-- ── 1. Un code disponible se consomme ───────────────────────────────────
insert into r(cas, verdict)
select '1 code disponible consomme',
       case when consommer_reglement_hors_ligne('TESTCHQ1', 'HORSLIGNE-un')
            then 'OK' else 'ECHEC: refuse' end;

-- ── 2. ET IL NE SE CONSOMME QU'UNE FOIS ─────────────────────────────────
-- Le cas qui compte : deux onglets ouverts sur le même chèque. Sans ce
-- verrou, la même famille serait inscrite deux fois, sur un seul règlement.
insert into r(cas, verdict)
select '2 second usage refuse',
       case when consommer_reglement_hors_ligne('TESTCHQ1', 'HORSLIGNE-deux')
            then 'ECHEC: accepte deux fois' else 'OK' end;

-- ── 3. La référence relie le reçu à l'inscription ───────────────────────
-- Sans elle, on saurait qu'un chèque a servi sans pouvoir dire à quoi.
insert into r(cas, verdict)
select '3 reference conservee',
       case when reference = 'HORSLIGNE-un' and utilise_le is not null
            then 'OK' else 'ECHEC: '||coalesce(reference, 'nulle') end
from reglements_hors_ligne where code = 'TESTCHQ1';

-- ── 4. La casse et les espaces n'empêchent rien ─────────────────────────
-- Un code se dicte au téléphone et se recopie à la main.
insert into r(cas, verdict)
select '4 casse ignoree',
       case when consommer_reglement_hors_ligne('  testchq2 ', 'HORSLIGNE-trois')
            then 'OK' else 'ECHEC: refuse' end;

-- ── 5. Un code archivé ne vaut plus ─────────────────────────────────────
update reglements_hors_ligne set archived_at = now() where code = 'TESTCHQ3';
insert into r(cas, verdict)
select '5 archive refuse',
       case when consommer_reglement_hors_ligne('TESTCHQ3', 'HORSLIGNE-quatre')
            then 'ECHEC: accepte' else 'OK' end;

-- ── 6. Un code périmé non plus ──────────────────────────────────────────
update reglements_hors_ligne set expire_le = current_date - 1 where code = 'TESTCHQ4';
insert into r(cas, verdict)
select '6 perime refuse',
       case when consommer_reglement_hors_ligne('TESTCHQ4', 'HORSLIGNE-cinq')
            then 'ECHEC: accepte' else 'OK' end;

-- ── 7. Le dernier jour est inclus ───────────────────────────────────────
-- « Valable jusqu'au 1er septembre » se comprend comme « le 1er compris », et
-- l'inverse ferait des mécontents. La règle est la même que pour les codes de
-- réduction, côté application.
update reglements_hors_ligne set expire_le = current_date where code = 'TESTCHQ4';
insert into r(cas, verdict)
select '7 dernier jour inclus',
       case when consommer_reglement_hors_ligne('TESTCHQ4', 'HORSLIGNE-six')
            then 'OK' else 'ECHEC: refuse le jour meme' end;

-- ── 8. Un code inconnu ne fabrique rien ─────────────────────────────────
insert into r(cas, verdict)
select '8 code inconnu refuse',
       case when consommer_reglement_hors_ligne('JAMAISVU', 'HORSLIGNE-sept')
            then 'ECHEC: accepte' else 'OK' end;

-- ── 9. Un montant nul ou négatif est impossible ─────────────────────────
-- Un reçu à zéro euro serait exactement le mensonge qu'on cherche à supprimer :
-- une inscription entière sans encaissement.
do $$
begin
  insert into reglements_hors_ligne (code, moyen, montant_cents, saison)
  values ('TESTZERO', 'cheque', 0, '2026-2027');
  insert into r(cas, verdict) values ('9 montant nul refuse', 'ECHEC: accepte');
exception when check_violation then
  insert into r(cas, verdict) values ('9 montant nul refuse', 'OK');
end $$;

-- ── 10. Un moyen inventé est refusé ─────────────────────────────────────
-- Chèque ou espèces : « virement » demanderait un rapprochement bancaire qui
-- n'existe pas encore, et le laisser passer ferait croire qu'il est traité.
do $$
begin
  insert into reglements_hors_ligne (code, moyen, montant_cents, saison)
  values ('TESTVIR', 'virement', 33900, '2026-2027');
  insert into r(cas, verdict) values ('10 moyen inconnu refuse', 'ECHEC: accepte');
exception when check_violation then
  insert into r(cas, verdict) values ('10 moyen inconnu refuse', 'OK');
end $$;

-- ── 11. Employé sans référence : impossible ─────────────────────────────
-- L'un des deux chemins d'écriture aurait sauté une étape, et le reçu ne
-- mènerait plus à l'inscription qu'il a payée.
do $$
begin
  update reglements_hors_ligne set utilise_le = now() where code = 'TESTCHQ3';
  insert into r(cas, verdict) values ('11 usage sans reference refuse', 'ECHEC: accepte');
exception when check_violation then
  insert into r(cas, verdict) values ('11 usage sans reference refuse', 'OK');
end $$;

select verdict, cas from r order by ordre;
rollback;
