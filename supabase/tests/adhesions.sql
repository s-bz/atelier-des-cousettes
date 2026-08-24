-- Le registre des adhérents : une ligne par famille et par saison.
--
-- L'unicité est le vrai garde du parcours d'achat : deux onglets ouverts avant
-- tout paiement consulteraient tous deux une table vide et croiraient l'adhésion
-- due. C'est la contrainte, et non le code, qui empêche la seconde ligne.

begin;
create temp table r (ordre serial, cas text, verdict text) on commit drop;

insert into accounts (id, email) values
  ('c0000000-0000-0000-0000-000000000001', 'famille-a@test.fr'),
  ('c0000000-0000-0000-0000-000000000002', 'famille-b@test.fr');

insert into adhesions (account_id, saison, montant_cents, paye_le)
values ('c0000000-0000-0000-0000-000000000001', '2026-2027', 1500, now());

-- 1. Une seconde adhésion pour la même famille et la même saison est refusée.
do $$
begin
  insert into adhesions (account_id, saison, montant_cents)
  values ('c0000000-0000-0000-0000-000000000001', '2026-2027', 1500);
  insert into r(cas, verdict) values ('1 doublon refuse', 'ECHEC: accepte');
exception when unique_violation then
  insert into r(cas, verdict) values ('1 doublon refuse', 'OK');
end $$;

-- 2. La même famille peut adhérer à la saison suivante.
insert into adhesions (account_id, saison, montant_cents)
values ('c0000000-0000-0000-0000-000000000001', '2027-2028', 1500);
insert into r(cas, verdict) select '2 saison suivante permise', 'OK';

-- 3. Une autre famille adhère à la même saison.
insert into adhesions (account_id, saison, montant_cents)
values ('c0000000-0000-0000-0000-000000000002', '2026-2027', 1500);
insert into r(cas, verdict) select '3 autre famille permise', 'OK';

-- 4. Supprimer le compte emporte l'adhésion : le registre ne garde pas de
--    ligne orpheline dont on ne saurait plus de qui elle parle.
delete from accounts where id = 'c0000000-0000-0000-0000-000000000002';
insert into r(cas, verdict)
select '4 adhesion suivie du compte',
       case when count(*) = 0 then 'OK' else 'ECHEC: '||count(*)||' restante(s)' end
from adhesions where account_id = 'c0000000-0000-0000-0000-000000000002';

select verdict, cas from r order by ordre;
rollback;
