-- Les stages dont les dates se réservent ENSEMBLE.
--
-- Trois des sept stages sont des forfaits sur plusieurs jours : la formule
-- complète du stage découverte (trois matinées, 90 €), sa formule courte (deux
-- après-midi, 65 €) et le stage surjeteuse (deux après-midi, 65 €). Leurs
-- journées forment une progression — prise en main, puis tote-bag, puis trousse
-- — et se paient d'un bloc.
--
-- Rien ne l'exprimait. Isabelle devait inscrire trois fois la même personne, et
-- rien ne signalait un oubli : quelqu'un pouvait se retrouver au deuxième jour
-- sans avoir fait le premier, sur un stage où le deuxième suppose le premier.
--
-- Les quatre autres stages ne changent pas : leurs dates sont le MÊME stage
-- proposé plusieurs fois — sept samedis de patronage à 40 € l'unité — et se
-- réservent une par une. C'est cette différence que le drapeau nomme, et elle
-- n'était nulle part.

alter table creneaux
  add column dates_groupees boolean not null default false;

comment on column creneaux.dates_groupees is
  'true : les dates de ce stage se reservent et se liberent ensemble, le prix du '
  'creneau couvrant l''ensemble. false : chaque date est une offre independante.';

-- Les trois forfaits connus. Les autres restent à false par le défaut.
update creneaux set dates_groupees = true
 where id in (
   'stage-decouverte-couture-complete',
   'stage-decouverte-couture-courte',
   'stage-surjeteuse'
 );


-- Réserver un stage entier, ou rien.
--
-- L'atomicité n'est pas un raffinement : c'est tout l'intérêt. Une exception
-- annule la transaction, donc les inscriptions déjà posées par cet appel. Sans
-- cela, un stage dont la deuxième date est complète laisserait la personne
-- inscrite à la première seulement — l'état que ce drapeau existe pour rendre
-- impossible.
--
-- « for update » verrouille les dates le temps du calcul, comme
-- book_participant : deux inscriptions simultanées sur la dernière place
-- doivent en voir échouer une, pas les accepter toutes deux.
create or replace function book_stage(p_creneau text, p_participant uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind        text;
  v_audience    text;
  v_public      text;
  v_seance      record;
  v_places      integer;
  v_dates       integer := 0;
  v_deja        integer := 0;
  v_creees      integer := 0;
begin
  select kind, audience into v_kind, v_audience from creneaux where id = p_creneau;
  if v_kind is null then
    raise exception 'Stage inconnu : %', p_creneau;
  end if;

  select audience into v_public from participants where id = p_participant;
  if v_public is null then
    raise exception 'Personne inconnue';
  end if;

  -- Même règle que pour une séance : on ne mélange pas les publics. La refuser
  -- ici évite d'avoir à défaire une inscription posée puis rejetée date par date.
  if v_audience <> (v_public || 's') then
    raise exception 'Ce stage est réservé au public « % »', v_audience;
  end if;

  for v_seance in
    select id, capacity, starts_at
    from sessions
    where creneau_id = p_creneau
      and status = 'scheduled'
      and starts_at > now()
    order by starts_at
    for update
  loop
    v_dates := v_dates + 1;

    if exists (
      select 1 from bookings
      where session_id = v_seance.id
        and participant_id = p_participant
        and status = 'booked'
    ) then
      v_deja := v_deja + 1;
      continue;
    end if;

    select count(*) into v_places
    from bookings where session_id = v_seance.id and status = 'booked';

    if v_places >= v_seance.capacity then
      raise exception 'La date du % est complète : le stage ne peut pas être réservé en entier.',
        to_char(v_seance.starts_at at time zone 'Europe/Paris', 'DD/MM/YYYY');
    end if;

    insert into bookings (session_id, participant_id, source, status)
    values (v_seance.id, p_participant, 'admin', 'booked');

    v_creees := v_creees + 1;
  end loop;

  if v_dates = 0 then
    raise exception 'Ce stage n’a aucune date à venir.';
  end if;

  -- Distingué du cas précédent à dessein : « déjà inscrit » et « pas de date »
  -- demandent deux réponses différentes, et un message unique enverrait
  -- chercher au mauvais endroit.
  if v_creees = 0 then
    raise exception 'Cette personne est déjà inscrite à toutes les dates de ce stage.';
  end if;

  return v_creees;
end;
$$;


-- Libérer un stage entier.
--
-- Le pendant du précédent : garder une seule date d'un forfait n'aurait pas de
-- sens, et laisser Isabelle les retirer une par une ramènerait l'oubli que
-- l'inscription groupée évite.
create or replace function release_stage(p_creneau text, p_participant uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  update bookings b
     set status = 'released', released_at = now()
   where b.participant_id = p_participant
     and b.status = 'booked'
     and b.session_id in (
       select s.id from sessions s
       where s.creneau_id = p_creneau
         and s.starts_at > now()
     );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Gestes d'administration, appelés avec la clé secrète. Volontairement NON
-- accordés à « authenticated » : un adhérent ne réserve pas un stage lui-même,
-- le paiement se faisant à l'achat.
revoke execute on function book_stage(text, uuid)    from public, anon, authenticated;
revoke execute on function release_stage(text, uuid) from public, anon, authenticated;
