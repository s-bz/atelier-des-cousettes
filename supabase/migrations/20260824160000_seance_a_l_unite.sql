-- Comment un créneau se vend : au forfait, à l'unité, ou les deux.
--
-- Le modèle n'avait qu'une réponse pour tout le monde : TOUT créneau d'atelier
-- se vendait des deux façons, parce que rien ne permettait de dire le
-- contraire. Les deux pages publiques le lisaient ainsi — celle des ateliers
-- réguliers listait tous les créneaux, celle des séances sans engagement aussi,
-- et la même ligne servait aux deux.
--
-- La saison 2026-2027 casse cette symétrie de deux côtés à la fois :
--
--   • LA SÉANCE À L'UNITÉ N'EST PLUS PROPOSÉE AUX ADOS NI AUX ENFANTS. Ils
--     prennent un forfait, ou rien. Le prix de 35 € reste en base — il facture
--     toujours une séance qui dépasse le forfait — mais il cesse d'être annoncé
--     comme un tarif d'essai. C'est exactement la distinction que ces colonnes
--     permettent : un montant qui facture n'est pas un montant qu'on propose.
--
--   • UNE SÉANCE DE 1 H 30 À 22 € S'AJOUTE, QUI NE SE FORFAITISE PAS. Aucun
--     forfait ne s'y pose : c'est une porte d'entrée, pas un créneau de saison.
--
-- DEUX BOOLÉENS PLUTÔT QU'UN, parce que ce sont deux questions et non les deux
-- faces d'une même. « Se vend au forfait » et « se vend à l'unité » sont vraies
-- ensemble pour les ateliers adultes, fausses séparément pour les deux cas
-- ci-dessus. Un seul champ à trois valeurs aurait interdit d'en ajouter une
-- troisième combinaison sans le redéfinir.
--
-- VRAIS PAR DÉFAUT : c'est le comportement d'avant, et toute ligne existante le
-- garde. Une migration qui change ce que fait le code déjà écrit doit laisser
-- les données où elles étaient.

alter table creneaux
  add column au_forfait boolean not null default true,
  add column a_l_unite  boolean not null default true;

comment on column creneaux.au_forfait is
  'Un forfait de saison peut se poser sur ce creneau. Faux : il ne parait pas '
  'sur la page des ateliers reguliers et l''auto-inscription l''ignore.';

comment on column creneaux.a_l_unite is
  'On peut y venir une fois, sans forfait. Faux : le creneau disparait de la '
  'page des seances sans engagement. default_unit_price_cents continue de '
  'facturer les seances depassant un forfait — facturer et proposer sont deux '
  'choses distinctes.';


-- Les ados et les enfants ne sont plus proposés à l'unité.
update creneaux
   set a_l_unite = false
 where kind = 'atelier'
   and audience in ('ados', 'enfants');


-- LA SÉANCE DU JEUDI SOIR — 1 h 30, 22 €, dix jeudis dans la saison.
--
-- 17h30-19h00, le créneau qu'occupait l'atelier enfants du jeudi avant son
-- arrêt : la salle est libre, et l'heure convient à qui sort du travail.
--
-- `au_forfait` est FAUX, et c'est tout son intérêt : elle ne figure donc pas
-- parmi les créneaux d'ateliers réguliers, et aucun abonnement ne peut la
-- prendre pour créneau d'attache. Sans ce drapeau il aurait fallu la cacher au
-- cas par cas dans chaque page — c'est-à-dire l'oublier quelque part.
--
-- Capacité 3, comme tous les ateliers de Revel : c'est la même salle et le même
-- accompagnement, seule la durée change.
insert into creneaux (
  id, label, kind, audience, group_id,
  default_start_time, default_end_time, default_location,
  default_capacity, default_unit_price_cents, seances_par_stage,
  jour_semaine, places_attente, au_forfait, a_l_unite
)
values (
  'seance-du-jeudi-soir',
  'Séance du jeudi soir',
  'atelier',
  'adultes',
  'revel-adultes',
  '17:30:00',
  '19:00:00',
  'Revel',
  3,
  2200,
  1,
  4,       -- jeudi
  0,
  false,   -- aucun forfait ne s'y pose
  true     -- elle n'existe qu'à l'unité
)
on conflict (id) do nothing;


-- L'auto-inscription ignore les créneaux hors forfait.
--
-- Elle parcourt les abonnements et remplit leur créneau d'attache mois par
-- mois. Un abonnement pointant par erreur vers un créneau hors forfait y aurait
-- inscrit quelqu'un d'office, en décomptant des crédits sur une séance qui ne
-- s'achète pas ainsi.
--
-- On FILTRE plutôt que de lever une exception, comme le fait déjà le filtre sur
-- le public (20260729143055) : une inéligibilité n'est pas une panne, et le job
-- doit continuer pour les autres abonnés.
--
-- Le corps est celui de 20260729143055, à cette condition près.
create or replace function run_auto_enrolment(p_horizon_days integer default 60)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  abo         record;
  mois        date;
  seance      record;
  v_deja      integer;
  v_a_creer   integer;
  v_places    integer;
  v_total     integer := 0;
  v_fin       date := current_date + p_horizon_days;
begin
  for abo in
    select s.id, s.participant_id, s.home_creneau_id, s.credits_per_month,
           s.starts_on, s.ends_on, p.audience
    from subscriptions s
    join participants p on p.id = s.participant_id
    join creneaux c on c.id = s.home_creneau_id
    where s.home_creneau_id is not null
      and s.credits_per_month > 0
      and s.ends_on >= current_date
      and s.starts_on <= v_fin
      -- 'adulte' → 'adultes' : singulier pour la personne, pluriel pour le
      -- groupe. Un abonnement mal apparié ne produit rien, sans bruit.
      and c.audience = (p.audience || 's')
      and c.au_forfait
  loop
    mois := greatest(date_trunc('month', current_date)::date,
                     date_trunc('month', abo.starts_on)::date);

    while mois <= least(v_fin, abo.ends_on) loop
      select count(*) into v_deja
      from bookings b
      join sessions se on se.id = b.session_id
      where b.participant_id = abo.participant_id
        and se.creneau_id = abo.home_creneau_id
        and se.starts_at >= mois
        and se.starts_at < (mois + interval '1 month');

      v_a_creer := abo.credits_per_month - v_deja;

      for seance in
        select se.id, se.capacity
        from sessions se
        join creneaux c on c.id = se.creneau_id
        where se.creneau_id = abo.home_creneau_id
          and se.status = 'scheduled'
          and c.audience = (abo.audience || 's')
          and c.au_forfait
          and se.starts_at >= greatest(mois::timestamptz, current_date::timestamptz)
          and se.starts_at < (mois + interval '1 month')
          and not exists (
            select 1 from bookings b
            where b.session_id = se.id and b.participant_id = abo.participant_id
          )
        order by se.starts_at
      loop
        exit when v_a_creer <= 0;
        exit when balance(abo.participant_id) <= 0;

        select count(*) into v_places
        from bookings where session_id = seance.id and status = 'booked';
        continue when v_places >= seance.capacity;

        insert into bookings (session_id, participant_id, source, status)
        values (seance.id, abo.participant_id, 'auto', 'booked');

        v_a_creer := v_a_creer - 1;
        v_total := v_total + 1;
      end loop;

      mois := (mois + interval '1 month')::date;
    end loop;
  end loop;

  return v_total;
end;
$$;

revoke execute on function run_auto_enrolment(integer) from public, anon, authenticated;
