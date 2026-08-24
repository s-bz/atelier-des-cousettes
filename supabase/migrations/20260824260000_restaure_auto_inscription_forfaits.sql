-- RESTAURE L'AUTO-INSCRIPTION DES FORFAITS, perdue le jour même.
--
-- `20260824160000_seance_a_l_unite.sql` avait un seul objet : empêcher
-- l'auto-inscription sur un créneau vendu à l'unité — la séance du jeudi soir.
-- Mais elle a redéclaré `run_auto_enrolment` à partir d'une copie ANTÉRIEURE au
-- 29 juillet, et a donc silencieusement supprimé les quarante-cinq lignes qui
-- traitaient les forfaits, ajoutées par `20260729145937_auto_inscription_forfaits`
-- puis affinées par `20260730053433_forfait_place_toute_la_saison`.
--
-- CE QUE ÇA A CASSÉ. Un forfait porte `credits_per_month` à NULL — le
-- déclencheur `subscriptions_suit_formule` s'en charge dès qu'une formule est
-- désignée. Le filtre redevenu `s.credits_per_month > 0` excluait donc
-- l'intégralité des forfaits : plus personne au forfait n'était inscrit
-- d'office, sur aucun créneau. Autrement dit, la formule que le site met en
-- avant ne posait plus une seule place.
--
-- POURQUOI PERSONNE NE L'A VU. Le test « 4 forfait etale, pas brule » de
-- supabase/tests/forfaits.sql vérifiait `count(*) <= 2`. Zéro satisfait cette
-- borne : la suite restait verte en ne posant rien du tout. Le test est corrigé
-- dans le même mouvement pour exiger aussi une borne basse.
--
-- Cette migration reprend donc la version du 30 juillet — la dernière juste —
-- et y repose le seul apport réel du 24 août : `and c.au_forfait`.

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
  v_mois_total integer;
  v_rang       integer;
  v_cible      integer;
  v_deja_total integer;
  v_deja_mois  integer;
  v_a_creer   integer;
  v_places    integer;
  v_borne     date;
  v_total     integer := 0;
  v_fin       date := current_date + p_horizon_days;
begin
  for abo in
    select s.id, s.participant_id, s.home_creneau_id,
           s.credits_per_month, s.total_credits,
           s.starts_on, s.ends_on, p.audience
    from subscriptions s
    join participants p on p.id = s.participant_id
    join creneaux c on c.id = s.home_creneau_id
    where s.home_creneau_id is not null
      and coalesce(s.credits_per_month, s.total_credits) > 0
      and s.ends_on >= current_date
      and s.starts_on <= greatest(v_fin, s.ends_on)
      and c.audience = (p.audience || 's')
      and c.kind = 'atelier'          -- un stage ne s'inscrit jamais d'office
      and c.au_forfait                -- ni une seance vendue a l'unite
  loop
    -- Nombre de mois couverts par l'abonnement, pour répartir un forfait.
    v_mois_total := (extract(year from abo.ends_on)::int * 12 + extract(month from abo.ends_on)::int)
                  - (extract(year from abo.starts_on)::int * 12 + extract(month from abo.starts_on)::int)
                  + 1;

    -- LA BORNE : toute la saison pour un forfait, l'horizon pour un mensuel.
    v_borne := case
                 when abo.total_credits is not null then abo.ends_on
                 else least(v_fin, abo.ends_on)
               end;

    mois := greatest(date_trunc('month', current_date)::date,
                     date_trunc('month', abo.starts_on)::date);

    while mois <= v_borne loop
      -- Rang du mois dans l'abonnement, à partir de 1.
      v_rang := (extract(year from mois)::int * 12 + extract(month from mois)::int)
              - (extract(year from abo.starts_on)::int * 12 + extract(month from abo.starts_on)::int)
              + 1;

      -- Toutes les lignes du mois, libérées comprises : rendre une place ne
      -- rouvre pas un créneau d'auto-inscription, sans quoi capitaliser
      -- deviendrait impossible.
      select count(*) into v_deja_mois
      from bookings b
      join sessions se on se.id = b.session_id
      where b.participant_id = abo.participant_id
        and se.creneau_id = abo.home_creneau_id
        and se.starts_at >= mois
        and se.starts_at < (mois + interval '1 month');

      if abo.total_credits is not null then
        -- Cumul visé à la fin de ce mois-ci, tout l'abonnement confondu.
        v_cible := round(v_rang::numeric * abo.total_credits / v_mois_total);

        select count(*) into v_deja_total
        from bookings b
        join sessions se on se.id = b.session_id
        where b.participant_id = abo.participant_id
          and se.creneau_id = abo.home_creneau_id
          and se.starts_at >= abo.starts_on
          and se.starts_at < (mois + interval '1 month');

        v_a_creer := least(v_cible - v_deja_total, abo.total_credits - v_deja_total);
      else
        v_a_creer := abo.credits_per_month - v_deja_mois;
      end if;

      for seance in
        select se.id, se.capacity
        from sessions se
        join creneaux c on c.id = se.creneau_id
        where se.creneau_id = abo.home_creneau_id
          and se.status = 'scheduled'
          and c.audience = (abo.audience || 's')
          and c.kind = 'atelier'
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

comment on function run_auto_enrolment(integer) is
  'Place chaque adherent sur les seances de son creneau attitre. Un forfait est '
  'reparti sur toute la duree de l''abonnement ; un abonnement mensuel s''arrete '
  'a p_horizon_days, son droit n''etant pas encore acquis au-dela. Idempotente : '
  'une seance deja porteuse d''une ligne pour cette personne est ignoree, quel '
  'que soit son statut — sans quoi une place liberee reviendrait la nuit suivante.';
