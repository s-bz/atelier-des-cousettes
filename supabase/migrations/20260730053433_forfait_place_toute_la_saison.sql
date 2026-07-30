-- Un forfait se place sur TOUTE la saison, pas sur les soixante jours à venir.
--
-- L'horizon de 60 jours s'appliquait aux deux formules, et contredisait ce qu'on
-- attend d'un forfait : quelqu'un qui achète 20 séances en juillet doit voir ses
-- 20 dates posées, quitte à en déplacer ensuite. Il n'en obtenait qu'une — les
-- mois de juillet et août n'ayant aucune séance, et octobre tombant déjà hors
-- de la fenêtre.
--
-- La distinction est celle des deux formules, et elle est réelle :
--
--   • FORFAIT (total_credits) — le droit est acquis en entier dès le premier
--     jour. Rien ne justifie d'attendre pour le placer, et le placer tôt est
--     précisément ce qui rend le calendrier lisible : on voit ses dates, on en
--     libère celles qui ne conviennent pas.
--
--   • MENSUEL (credits_per_month) — le droit s'acquiert mois par mois. Placer
--     au-delà de l'horizon reviendrait à réserver des séances pas encore dues,
--     et « exit when balance <= 0 » les refuserait de toute façon.
--
-- L'étalement mensuel est conservé dans les deux cas : un forfait de 20 séances
-- sur dix mois pose deux dates par mois, il ne consomme pas tout en septembre.
-- Seule la BORNE change.

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
