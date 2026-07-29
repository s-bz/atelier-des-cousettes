-- Public d'un créneau, et public d'une personne.
--
-- Les séances enfants durent 2 h, les séances adultes 2 h 30 ou 3 h : ce ne
-- sont pas les mêmes ateliers, et un enfant n'a rien à faire dans un créneau
-- adulte — ni l'inverse, où il occuperait la place d'un enfant.
--
-- CECI CORRIGE LE MODÈLE. La conception posait que les crédits sont
-- « fongibles, utilisables sur n'importe quel créneau, sur les deux sites ».
-- C'était trop large : ils sont fongibles À L'INTÉRIEUR D'UN PUBLIC. Toute la
-- souplesse recherchée demeure — changer de jour, de site, rattraper plus tard
-- — mais à l'intérieur des ateliers qui conviennent à la personne.
--
-- Le public n'est pas déduit de group_id : celui-ci mélange lieu et public
-- (« revel-adultes », « revel-enfants », « verdalle »), et le déduire par
-- convention de nommage se casserait au premier créneau nommé autrement.

alter table creneaux
  add column audience text not null default 'adultes'
  check (audience in ('adultes', 'enfants'));

alter table participants
  add column audience text not null default 'adulte'
  check (audience in ('adulte', 'enfant'));

comment on column participants.audience is
  'Determine les creneaux accessibles. Modifiable : un enfant qui grandit '
  'passe en adulte d''une saison a l''autre.';

-- Amorçage à partir de l'existant : seul le créneau du samedi accueille des
-- enfants aujourd'hui.
update creneaux set audience = 'enfants' where group_id = 'revel-enfants';

-- Refus au niveau de la fonction de réservation, et non seulement dans les
-- écrans : la règle doit tenir quel que soit le chemin d'appel — interface
-- adhérent, écran d'administration ou auto-inscription.
create or replace function book_participant(
  p_session uuid,
  p_participant uuid,
  p_source text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_status   text;
  v_taken    integer;
  v_id       uuid;
  v_public_seance text;
  v_public_pers   text;
begin
  if auth.role() = 'authenticated' and not is_admin() then
    if p_participant not in (
      select id from participants where account_id = current_account_id()
    ) then
      raise exception 'Participant non rattaché à votre compte';
    end if;
  end if;

  select c.audience into v_public_seance
  from sessions s join creneaux c on c.id = s.creneau_id
  where s.id = p_session;

  select audience into v_public_pers from participants where id = p_participant;

  -- 'adulte' → 'adultes' : le singulier décrit une personne, le pluriel un
  -- groupe. Les rapprocher ici évite deux vocabulaires dans les écrans.
  if v_public_seance is not null and v_public_pers is not null
     and v_public_seance <> (v_public_pers || 's') then
    raise exception '%',
      case when v_public_pers = 'enfant'
           then 'Cette séance est réservée aux adultes'
           else 'Cette séance est réservée aux enfants' end;
  end if;

  select capacity, status into v_capacity, v_status
  from sessions where id = p_session for update;

  if not found then
    raise exception 'Séance introuvable';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Séance annulée : réservation impossible';
  end if;

  select count(*) into v_taken
  from bookings
  where session_id = p_session and status = 'booked';

  if v_taken >= v_capacity then
    raise exception 'Séance complète (% places)', v_capacity;
  end if;

  insert into bookings (session_id, participant_id, source, status)
  values (p_session, p_participant, p_source, 'booked')
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function book_participant(uuid, uuid, text) from public, anon;
grant  execute on function book_participant(uuid, uuid, text) to authenticated;
