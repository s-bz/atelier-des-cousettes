-- Un troisième public : les ados.
--
-- La saison 2026-2027 ouvre un atelier ados le samedi matin, de 10h30 à 12h30,
-- entre l'atelier adultes de 3 h et celui des enfants de 2 h. Jusqu'ici la base
-- ne connaissait que deux publics, et il aurait été tentant de ranger les ados
-- chez les enfants pour s'épargner cette migration.
--
-- CE N'EN EST PAS UN TROISIÈME POUR LA FORME. Le forfait ados ne s'achète pas
-- au même volume que les autres — 9 ou 18 séances, quand adultes et enfants en
-- prennent 10 ou 20 — et son prix n'est ni celui de l'un ni celui de l'autre.
-- Deux publics dont les grilles diffèrent ne sont pas le même public : les
-- confondre ferait décompter les crédits d'un ado sur une grille qu'il n'a pas
-- achetée, et ouvrirait le créneau ados aux enfants de six ans, dont ce n'est
-- pas l'atelier.
--
-- LA CONCATÉNATION D'UN « s » CONTINUE DE FONCTIONNER, et c'est pour cela que
-- run_auto_enrolment n'est pas touché ici : 'ado' || 's' = 'ados', comme
-- 'adulte' || 's' = 'adultes'. Le rapprochement singulier/pluriel posé par
-- 20260729143055 tient pour trois valeurs comme pour deux.

-- Les contraintes sont retrouvées par leur DÉFINITION, pas par leur nom.
-- Elles ont été créées en ligne (« check (audience in …) ») et portent donc un
-- nom engendré par Postgres. Le deviner et se tromper aurait été le pire des
-- cas : le drop ne trouve rien, l'ajout d'une contrainte au nom neuf réussit,
-- et l'ancienne — toujours là — continue de refuser 'ados' en silence.
do $$
declare c record;
begin
  for c in
    select conname, conrelid::regclass::text as tbl
    from pg_constraint
    where contype = 'c'
      and conrelid in ('creneaux'::regclass, 'participants'::regclass)
      and pg_get_constraintdef(oid) ilike '%enfant%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table creneaux
  add constraint creneaux_audience_check
  check (audience in ('adultes', 'ados', 'enfants'));

alter table participants
  add constraint participants_audience_check
  check (audience in ('adulte', 'ado', 'enfant'));

comment on column creneaux.audience is
  'Public accueilli : adultes, ados ou enfants. Determine qui peut reserver, '
  'et sur quelle grille de forfaits.';

comment on column participants.audience is
  'Determine les creneaux accessibles. Modifiable : un enfant qui grandit '
  'passe en ado, puis en adulte, d''une saison a l''autre.';


-- LA VÉRIFICATION DU PUBLIC EST RÉTABLIE — elle avait disparu sans bruit.
--
-- 20260729142633 l'avait posée dans book_participant : un enfant ne réserve pas
-- une séance adulte, ni l'inverse. Trois réécritures de la fonction ont suivi
-- pour la liste d'attente (20260730071219, 073004, 074239), chacune repartant
-- du corps qu'elle avait sous les yeux — et la règle est tombée à la première.
-- Depuis le 30 juillet, l'interface adhérent ne la vérifie plus nulle part :
-- seul run_auto_enrolment, qui n'appelle pas cette fonction, la fait respecter.
--
-- C'est le genre d'oubli qu'un troisième public rend coûteux : à deux valeurs
-- l'erreur restait improbable, un adulte n'allant pas s'inscrire chez les
-- enfants ; à trois, l'atelier ados du samedi matin chevauche celui des enfants
-- à trente minutes près, et la confusion devient une méprise ordinaire.
--
-- Le corps est celui de 20260730074239, INCHANGÉ pour tout le reste : la
-- reprise d'une place en attente, le refus distinguant « complète » de
-- « complète, et la liste d'attente aussi ». La vérification s'insère avant le
-- verrou sur la séance — inutile de verrouiller une ligne pour la refuser.
--
-- Le message NOMME LE PUBLIC DE LA SÉANCE. Il était bâti sur un ternaire —
-- « vous n'êtes pas un enfant, donc c'est réservé aux adultes » — qui n'a de
-- sens qu'entre deux valeurs : un ado devant une séance enfants s'y serait
-- entendu répondre « réservée aux adultes », une phrase fausse qui l'envoyait
-- vers le mauvais créneau.
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
  v_attente  integer;
  v_prises   integer;
  v_en_file  integer;
  v_mienne   uuid;
  v_etat     text;
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
    raise exception 'Cette séance est réservée aux %', v_public_seance;
  end if;

  select capacity, status, places_attente
    into v_capacity, v_status, v_attente
  from sessions where id = p_session for update;

  if not found then
    raise exception 'Séance introuvable';
  end if;
  if v_status = 'cancelled' then
    raise exception 'Séance annulée : réservation impossible';
  end if;

  select count(*) filter (where status = 'booked'),
         count(*) filter (where status = 'waiting')
    into v_prises, v_en_file
  from bookings where session_id = p_session;

  select id into v_mienne
  from bookings
  where session_id = p_session and participant_id = p_participant and status = 'waiting';

  -- Déjà en attente : on prend la place si elle existe, sinon on le dit
  -- clairement. « Séance complète » laisserait croire à une erreur alors que
  -- quelqu'un a simplement cliqué plus vite.
  if v_mienne is not null then
    if v_prises >= v_capacity then
      raise exception 'La place vient d''être prise. Vous restez sur la liste d''attente.';
    end if;
    update bookings set status = 'booked' where id = v_mienne;
    return v_mienne;
  end if;

  if v_prises < v_capacity then
    v_etat := 'booked';
  elsif v_en_file < v_attente then
    v_etat := 'waiting';
  else
    if v_attente = 0 then
      raise exception 'Séance complète (% places)', v_capacity;
    else
      raise exception 'Séance complète, et la liste d''attente aussi (% en attente)', v_attente;
    end if;
  end if;

  insert into bookings (session_id, participant_id, source, status)
  values (p_session, p_participant, p_source, v_etat)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function book_participant(uuid, uuid, text) from public, anon;
grant  execute on function book_participant(uuid, uuid, text) to authenticated;
