-- Identification des séances supplémentaires. Règle : SPEC §7.
--
-- Le solde dit COMBIEN de séances dépassent, jamais LESQUELLES. Or les séances
-- n'ont pas toutes le même unit_price_cents, donc facturer exige de désigner
-- les séances concernées, pas seulement d'en compter.
--
-- Règle retenue : les crédits se consomment dans l'ordre chronologique des
-- séances. On parcourt les réservations actives par date croissante en
-- maintenant un solde courant — l'octroi acquis À LA DATE de chaque séance,
-- moins les réservations déjà parcourues. Une réservation qui ferait passer ce
-- solde sous zéro est une séance supplémentaire, facturée au prix de sa propre
-- séance.
--
-- C'est la seule règle à la fois explicable — « vos crédits couvrent vos
-- séances dans l'ordre, au-delà c'est payant » — et stable : elle ne dépend ni
-- de l'ordre de saisie, ni du moment où l'on regarde.
--
-- Elle tient compte du report : une séance du 9 octobre ne peut pas être
-- couverte par un crédit octroyé en mars. C'est granted_credits À LA DATE DE LA
-- SÉANCE qui compte, jamais l'octroi total de la saison.

create or replace function extra_sessions(p_participant uuid)
returns table (
  booking_id       uuid,
  session_id       uuid,
  starts_at        timestamptz,
  creneau_label    text,
  unit_price_cents integer
)
language sql
stable
set search_path = public
as $$
  with chronologie as (
    select b.id as booking_id,
           s.id as session_id,
           s.starts_at,
           c.label as creneau_label,
           s.unit_price_cents,
           -- Rang de la réservation dans l'ordre des séances : la n-ième
           -- séance consomme le n-ième crédit.
           row_number() over (order by s.starts_at, b.id) as rang,
           -- Octroi acquis au jour de cette séance-là.
           granted_credits(p_participant, s.starts_at::date) as octroye_alors
    from bookings b
    join sessions s on s.id = b.session_id
    join creneaux c on c.id = s.creneau_id
    where b.participant_id = p_participant
      and b.status = 'booked'
      and s.status <> 'cancelled'
  )
  select booking_id, session_id, starts_at, creneau_label, unit_price_cents
  from chronologie
  where rang > octroye_alors
  order by starts_at;
$$;

comment on function extra_sessions(uuid) is
  'Seances non couvertes par les credits, dans l''ordre chronologique. '
  'Chacune est facturee au prix de SA seance, jamais a un prix moyen.';

revoke execute on function extra_sessions(uuid) from public, anon;
grant  execute on function extra_sessions(uuid) to authenticated;
