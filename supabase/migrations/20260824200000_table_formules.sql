-- LA TABLE DE FORMULES, annoncée en juillet et devenue nécessaire.
--
-- 20260729132915 avait retiré `subscriptions.monthly_price_cents` en écrivant
-- noir sur blanc à quelle condition les tarifs reviendraient :
--
--   « 55 €/mois est une propriété de la FORMULE, pas de Marie. Le dupliquer sur
--     chaque abonnement, c'est vingt occasions de faute de frappe et vingt
--     lignes à reprendre au moindre changement de tarif. […] Si un jour
--     l'application doit connaître les tarifs, ils appartiendront à une table de
--     formules. »
--
-- Ce jour est arrivé. Une séance dépassant le forfait ne se facture plus au
-- tarif d'une séance sans engagement mais au PRIX DIVISÉ du forfait acheté :
-- 324 € pour 9 séances font 36 € la séance, 531 € pour 18 en font 29,50 €. Le
-- montant du forfait facture donc désormais quelque chose, et cesse d'être
-- purement éditorial.
--
-- LE PRIX DIVISÉ N'EST PAS STOCKÉ, il se calcule. Le poser à côté du total et
-- du nombre de séances en ferait un troisième nombre à tenir d'accord avec les
-- deux autres, et c'est exactement la faute que cette table existe pour éviter.
-- Les cinq formules de la saison tombent d'ailleures juste au centime près.

create table formules (
  id           text primary key,
  libelle      text not null,
  audience     text not null check (audience in ('adultes', 'ados', 'enfants')),
  seances      integer not null check (seances > 0),
  prix_cents   integer not null check (prix_cents >= 0),
  -- Le nombre d'échéances si l'on ne règle pas en une fois. Il ne facture rien
  -- — le total est le total — mais c'est lui que la page affiche en tête
  -- (« 36 € par mois »), et l'écrire ici évite qu'il se déduise à tort de la
  -- durée de la saison : les adultes et les ados paient en 9 fois, les enfants
  -- en 10, sur une même saison de septembre à juin.
  mensualites  integer not null check (mensualites > 0),
  saison       text not null,
  archived_at  timestamptz
);

comment on table formules is
  'Les forfaits de saison. Le prix DIVISE (prix_cents / seances) facture une '
  'seance depassant le forfait ; il ne se stocke pas, il se calcule.';

comment on column formules.mensualites is
  'Nombre d''echeances si le forfait n''est pas regle en une fois. '
  'N''intervient dans aucun calcul de facturation.';

create index formules_actives on formules (saison, audience) where archived_at is null;

alter table formules enable row level security;

-- Lecture ouverte : ce sont les tarifs publics, déjà affichés sur la page.
-- L'écriture passe par la clé secrète, comme pour les créneaux.
create policy formules_lecture on formules for select using (true);


-- Les cinq formules de la saison 2026-2027.
--
-- Les identifiants disent le public et le volume, pas le prix : un tarif change
-- d'une saison à l'autre, un identifiant est une adresse.
insert into formules (id, libelle, audience, seances, prix_cents, mensualites, saison) values
  ('2026-2027-adultes-9',  '9 séances',  'adultes',  9, 32400,  9, '2026-2027'),
  ('2026-2027-adultes-18', '18 séances', 'adultes', 18, 53100,  9, '2026-2027'),
  ('2026-2027-ados-9',     '9 séances',  'ados',     9, 22500,  9, '2026-2027'),
  ('2026-2027-ados-18',    '18 séances', 'ados',    18, 39600,  9, '2026-2027'),
  ('2026-2027-enfants-16', '16 séances', 'enfants', 16, 34000, 10, '2026-2027')
on conflict (id) do nothing;


-- L'abonnement désigne sa formule.
--
-- NULLABLE, et ce n'est pas une facilité : un abonnement saisi à la main avant
-- cette table n'en a pas, et les deux comptes de test non plus. Le rendre
-- obligatoire d'emblée aurait forcé à inventer une formule pour des lignes qui
-- n'en ont jamais eu. Sans formule, la facturation retombe sur le comportement
-- d'avant — le prix de la séance elle-même.
alter table subscriptions
  add column formule_id text references formules(id);

comment on column subscriptions.formule_id is
  'La formule achetee. Determine le prix d''une seance en depassement '
  '(prix_cents / seances). Nul : ancien abonnement, on retombe alors sur le '
  'prix unitaire de la seance.';


-- LE NOMBRE DE SÉANCES SUIT LA FORMULE, il ne se saisit plus à côté d'elle.
--
-- `total_credits` et `formules.seances` disent la même chose. Les laisser se
-- saisir séparément, c'est permettre un forfait « 9 séances » créditant 18
-- séances — et rien ne le signalerait, les deux nombres étant valides. Le
-- déclencheur recopie l'un dans l'autre dès qu'une formule est désignée.
create or replace function subscriptions_suit_formule()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.formule_id is not null then
    select f.seances into new.total_credits
    from formules f where f.id = new.formule_id;

    -- Un forfait de saison n'a pas d'octroi mensuel : les deux colonnes
    -- s'excluent (voir granted_credits, qui préfère total_credits).
    new.credits_per_month := null;
  end if;
  return new;
end;
$$;

create trigger subscriptions_suit_formule_trg
  before insert or update of formule_id on subscriptions
  for each row execute function subscriptions_suit_formule();


-- ————————————————————————————————————————————————————————————————
-- LA FACTURATION D'UNE SÉANCE EN DÉPASSEMENT
-- ————————————————————————————————————————————————————————————————
--
-- Elle rendait `s.unit_price_cents`, le prix de la séance — 45 € chez les
-- adultes, celui d'une séance sans engagement. Elle rend désormais le prix
-- divisé de la formule qui couvrait cette date.
--
-- LE TARIF SANS ENGAGEMENT NE BOUGE PAS, et c'est le point : venir une fois
-- coûte toujours 45 € les 3 h. Le prix divisé est ce qui récompense
-- l'engagement — l'aligner sur les deux aurait vidé le forfait de son intérêt.
--
-- LA FORMULE SE CHERCHE À LA DATE DE LA SÉANCE, non « la dernière en cours ».
-- Un participant peut cumuler plusieurs abonnements sur une saison — c'est
-- ainsi qu'on modélise un changement de formule (schéma initial) — et une
-- séance de novembre doit se facturer au tarif qui valait en novembre, même si
-- la personne est passée aux 18 séances en janvier.
--
-- Le repli sur `s.unit_price_cents` couvre l'abonnement sans formule et la
-- séance réservée hors de toute période d'abonnement.
create or replace function extra_sessions(p_participant uuid)
returns table (
  booking_id       uuid,
  session_id       uuid,
  starts_at        timestamptz,
  creneau_label    text,
  unit_price_cents integer
)
language plpgsql
stable
set search_path = public
as $$
declare
  r record;
  v_consommes integer := 0;
begin
  for r in
    select b.id as booking_id,
           s.id as session_id,
           s.starts_at,
           c.label as creneau_label,
           s.unit_price_cents,
           granted_credits(p_participant, s.starts_at::date) as octroye_alors,
           (
             select round(f.prix_cents::numeric / f.seances)::integer
             from subscriptions sub
             join formules f on f.id = sub.formule_id
             where sub.participant_id = p_participant
               and s.starts_at::date between sub.starts_on and sub.ends_on
             order by sub.starts_on desc
             limit 1
           ) as prix_divise
    from bookings b
    join sessions s on s.id = b.session_id
    join creneaux c on c.id = s.creneau_id
    where b.participant_id = p_participant
      and b.status = 'booked'
      and s.status <> 'cancelled'
    order by s.starts_at, b.id
  loop
    if v_consommes < r.octroye_alors then
      v_consommes := v_consommes + 1;   -- couverte par un crédit
    else
      booking_id       := r.booking_id;
      session_id       := r.session_id;
      starts_at        := r.starts_at;
      creneau_label    := r.creneau_label;
      unit_price_cents := coalesce(r.prix_divise, r.unit_price_cents);
      return next;                       -- séance supplémentaire
    end if;
  end loop;
end;
$$;
