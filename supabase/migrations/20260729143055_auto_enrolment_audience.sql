-- L'auto-inscription respecte elle aussi le public du créneau.
--
-- La règle avait été posée dans book_participant, mais le job n'appelle pas
-- cette fonction : il insère directement, pour tenir son compte mensuel. Un
-- enfant dont l'abonnement pointait par erreur vers un créneau adulte y était
-- donc inscrit d'office — précisément le cas que la règle devait empêcher.
--
-- On filtre les séances candidates plutôt que de lever une exception : une
-- inéligibilité n'est pas une panne, et le job doit continuer pour les autres
-- abonnés. Un abonnement mal réglé produit simplement zéro inscription, ce que
-- la fiche de la personne rend visible par un solde intact.

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
