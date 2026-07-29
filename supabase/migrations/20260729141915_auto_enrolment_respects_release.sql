-- L'auto-inscription ne recomble pas un mois dont une place a été libérée.
--
-- Conflit entre deux règles de la SPEC, révélé par le test.
--
-- §9 dit d'inscrire d'office jusqu'à credits_per_month séances par mois. §5
-- règle 2 dit que capitaliser un crédit exige de libérer sa place. La première
-- version comptait les seules réservations ACTIVES pour décider combien en
-- créer : libérer une place ramenait donc le compte du mois à un, et
-- l'auto-inscription en reprenait aussitôt une autre.
--
-- Conséquence : capitaliser devenait impossible. On libérait sa place pour
-- garder le crédit, et le système le redépensait dans la foulée — sur une
-- séance que personne n'avait choisie.
--
-- Correction : le quota mensuel se calcule sur TOUTES les lignes du mois,
-- libérées comprises. Libérer reste un geste délibéré dont le système ne
-- revient pas ; le crédit retourne au solde et sert quand la personne le
-- décide, à la date qu'elle choisit.
--
-- Les pierres tombales continuent d'empêcher qu'une séance précise revienne ;
-- cette règle-ci empêche que le MOIS soit recomblé. Les deux sont nécessaires.

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
    mois := greatest(date_trunc('month', current_date)::date,
                     date_trunc('month', abo.starts_on)::date);

    while mois <= least(v_fin, abo.ends_on) loop
      -- TOUTES les lignes du mois, y compris libérées : une place rendue ne
      -- rouvre pas un créneau d'auto-inscription.
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
        where se.creneau_id = abo.home_creneau_id
          and se.status = 'scheduled'
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
