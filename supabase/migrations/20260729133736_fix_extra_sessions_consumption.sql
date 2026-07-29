-- Correction : une séance supplémentaire ne consomme pas de crédit.
--
-- La version précédente comparait le RANG chronologique de la réservation à
-- l'octroi acquis à cette date. C'était faux : le rang compte toutes les
-- réservations antérieures, y compris celles déjà facturées en supplément. Une
-- séance payée à part venait donc pénaliser toutes les suivantes, et la
-- fonction annonçait trois extras là où le solde en indiquait deux.
--
-- Le test l'a montré en confrontant les deux : le nombre d'extras doit toujours
-- égaler −solde, puisque les deux décrivent le même dépassement.
--
-- Règle correcte : on parcourt les réservations dans l'ordre des séances en
-- comptant les crédits RÉELLEMENT consommés. À chaque réservation :
--   • s'il reste de l'octroi acquis à cette date, elle est couverte et
--     consomme un crédit ;
--   • sinon, c'est une séance supplémentaire — facturée, et sans consommer.
--
-- Une boucle explicite plutôt qu'une fonction de fenêtrage : le calcul est
-- séquentiel par nature, chaque décision dépendant de toutes les précédentes.

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

revoke execute on function extra_sessions(uuid) from public, anon;
grant  execute on function extra_sessions(uuid) to authenticated;
