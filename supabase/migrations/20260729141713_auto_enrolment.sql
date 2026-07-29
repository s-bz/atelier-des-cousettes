-- Auto-inscription au créneau habituel. Règles : SPEC §9.
--
-- Idempotente et rejouable : on peut la lancer tous les jours, ajouter des
-- séances en cours de saison, ou inscrire quelqu'un en janvier, sans traitement
-- de rattrapage particulier.
--
-- Quatre points qui comptent :
--
--   1. LES LIGNES LIBÉRÉES SONT DES PIERRES TOMBALES. On écarte toute séance
--      ayant déjà une ligne « bookings » pour cette personne, quel que soit son
--      statut. Sans cela, une place libérée lundi réapparaîtrait mardi — le bug
--      le plus certain de tout ce système.
--   2. Le droit MENSUEL est respecté, pas le calendrier : un forfait à une
--      séance par mois sur un créneau qui en propose deux ne produit qu'une
--      réservation.
--   3. Jamais de découvert : on s'arrête à solde nul. Quelqu'un qui a dépensé
--      ses crédits ailleurs n'est pas auto-inscrit chez lui par-dessus.
--   4. Les séances complètes sont ignorées, sans erreur : ce n'est pas un échec.

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
           s.starts_on, s.ends_on
    from subscriptions s
    where s.home_creneau_id is not null
      and s.credits_per_month > 0
      and s.ends_on >= current_date
      and s.starts_on <= v_fin
  loop
    -- Mois par mois : le droit est mensuel, il ne se reporte pas d'un mois à
    -- l'autre au moment de l'auto-inscription (le report joue sur le solde,
    -- pas sur le nombre de places réservées d'office).
    mois := greatest(date_trunc('month', current_date)::date,
                     date_trunc('month', abo.starts_on)::date);

    while mois <= least(v_fin, abo.ends_on) loop
      select count(*) into v_deja
      from bookings b
      join sessions se on se.id = b.session_id
      where b.participant_id = abo.participant_id
        and b.status = 'booked'
        and se.creneau_id = abo.home_creneau_id
        and se.starts_at >= mois
        and se.starts_at < (mois + interval '1 month');

      v_a_creer := abo.credits_per_month - v_deja;

      for seance in
        select se.id, se.capacity
        from sessions se
        where se.creneau_id = abo.home_creneau_id
          and se.status = 'scheduled'
          and se.starts_at >= greatest(mois::timestamptz, current_date::timestamptz)
          and se.starts_at < (mois + interval '1 month')
          -- Pierre tombale : toute ligne existante, libérée comprise.
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

comment on function run_auto_enrolment(integer) is
  'Inscrit d''office chaque abonne aux premieres seances de son creneau '
  'habituel, dans la limite de son droit mensuel et sans creer de decouvert. '
  'Idempotente : relancer ne produit rien de nouveau.';

revoke execute on function run_auto_enrolment(integer) from public, anon, authenticated;
