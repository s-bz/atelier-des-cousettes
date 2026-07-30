-- Les stages entrent dans le modèle, et RESTENT HORS DU SYSTÈME DE CRÉDITS.
--
-- Un stage se paie à l'unité, à son prix propre. Un forfait de 10 ou 20 séances
-- n'y donne aucun droit, et un stage ne doit rien retirer à ce forfait.
--
-- Structurellement, un stage est pourtant identique à un atelier : un contenant
-- portant des valeurs par défaut, et des dates. Il devient donc un « creneau »
-- d'une autre espèce, ce qui lui offre gratuitement tout l'existant — création
-- des dates, capacité verrouillée, feuille de présence, rappel à deux jours,
-- annulation qui libère les places. Une table séparée aurait recopié tout cela.
--
-- Ce qui diffère se corrige en trois endroits, et ces trois endroits sont le
-- cœur de cette migration : sans eux, réserver un stage volerait un crédit
-- d'atelier, ferait apparaître le stage sur la facture des séances
-- supplémentaires — alors qu'il est déjà payé — et l'inscription d'office
-- pourrait placer quelqu'un sur un stage qu'il n'a pas acheté.

alter table creneaux
  add column kind text not null default 'atelier'
    check (kind in ('atelier', 'stage'));

comment on column creneaux.kind is
  'atelier : seances payees par le forfait, consomment un credit. '
  'stage : payees a l''unite au prix de la seance, ne consomment aucun credit '
  'et n''apparaissent pas dans les seances supplementaires a facturer.';

create index creneaux_kind on creneaux (kind);


-- 1. Consommation — les stages n'en font pas partie.
--
-- C'est la correction la plus importante : sans elle, quelqu'un qui achète un
-- forfait de 10 séances puis un stage se retrouverait à 9. Rien ne l'aurait
-- signalé, et le solde affiché serait faux sans être visiblement faux.
create or replace function consumed_credits(p_participant uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer
  from bookings b
  join sessions s on s.id = b.session_id
  join creneaux c on c.id = s.creneau_id
  where b.participant_id = p_participant
    and b.status = 'booked'
    and s.status <> 'cancelled'
    and c.kind = 'atelier';
$$;


-- 2. Séances supplémentaires — un stage n'en est jamais une.
--
-- L'écran « à facturer » énumère ce qui dépasse le forfait. Un stage y
-- figurerait comme un dû, alors qu'il a été réglé à l'achat : Isabelle
-- facturerait deux fois la même chose.
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
           granted_credits(p_participant, s.starts_at::date) as octroye_alors
    from bookings b
    join sessions s on s.id = b.session_id
    join creneaux c on c.id = s.creneau_id
    where b.participant_id = p_participant
      and b.status = 'booked'
      and s.status <> 'cancelled'
      and c.kind = 'atelier'
    order by s.starts_at, b.id
  loop
    if v_consommes < r.octroye_alors then
      v_consommes := v_consommes + 1;   -- couverte par un crédit
    else
      booking_id       := r.booking_id;
      session_id       := r.session_id;
      starts_at        := r.starts_at;
      creneau_label    := r.creneau_label;
      unit_price_cents := r.unit_price_cents;
      return next;                       -- séance supplémentaire
    end if;
  end loop;
end;
$$;


-- 3. Inscription d'office — jamais sur un stage.
--
-- Le garde-fou tient en un prédicat, à l'endroit où l'abonnement est retenu :
-- un abonnement dont le créneau attitré serait un stage est simplement ignoré.
-- Le reste de la fonction est inchangé.
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
      and s.starts_on <= v_fin
      and c.audience = (p.audience || 's')
      and c.kind = 'atelier'          -- un stage ne s'inscrit jamais d'office
  loop
    v_mois_total := (extract(year from abo.ends_on)::int * 12 + extract(month from abo.ends_on)::int)
                  - (extract(year from abo.starts_on)::int * 12 + extract(month from abo.starts_on)::int)
                  + 1;

    mois := greatest(date_trunc('month', current_date)::date,
                     date_trunc('month', abo.starts_on)::date);

    while mois <= least(v_fin, abo.ends_on) loop
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
