-- UNE SÉANCE PAYÉE EST UN CRÉDIT ACHETÉ, PUIS DÉPENSÉ.
--
-- Corrige `20260825170000`, écrit deux heures plus tôt et à moitié juste.
--
-- CE QUE LE PREMIER CORRECTIF A RÉGLÉ. Une séance réglée à l'unité comptait
-- comme une séance consommée sur un forfait inexistant : l'espace adhérent
-- affichait « -1 » et réclamait de payer une seconde fois. On l'avait donc
-- écartée du décompte.
--
-- CE QU'IL A MANQUÉ, découvert dans l'heure par le même acheteur : il a cliqué
-- « Je ne peux pas venir ». La place est partie, et avec elle son argent — le
-- solde est resté à zéro, et réserver une autre date le faisait passer à -1.
-- Il aurait payé deux fois, comme avant, mais par un autre chemin.
--
-- LE BON MODÈLE N'EST PAS L'EXCEPTION, C'EST LA SYMÉTRIE. Payer une séance,
-- c'est acheter un crédit ; le poser sur une date, c'est le dépenser. Les deux
-- gestes ont lieu dans la même seconde, ce qui donne bien un solde nul — mais
-- ils restent deux gestes, et libérer la place ne défait que le second.
--
--   réglée et posée      → +1 octroyé, -1 consommé =  0
--   libérée à temps      → +1 octroyé,  0 consommé = +1   la date se rechoisit
--   libérée trop tard    → +1 octroyé, -1 consommé =  0   `credit_retenu`, perdue
--
-- La dernière ligne n'est pas une omission : c'est la règle des annulations
-- tardives, la même pour une séance achetée que pour une séance de forfait.

create or replace function public.granted_credits(p_participant uuid, p_at date)
returns integer
language sql
stable
set search_path to 'public'
as $function$
  select (
    coalesce((
      select sum(
        case
          when s.total_credits is not null then s.total_credits
          else s.credits_per_month * (
                (extract(year  from least(p_at, s.ends_on))::int * 12
               + extract(month from least(p_at, s.ends_on))::int)
              - (extract(year  from s.starts_on)::int * 12
               + extract(month from s.starts_on)::int)
              + 1
            )
        end
      )
      from subscriptions s
      where s.participant_id = p_participant
        -- Le forfait s'octroie dès qu'il existe ; le mensuel attend son premier mois.
        and (s.total_credits is not null or p_at >= s.starts_on)
    ), 0)
    +
    -- CHAQUE SÉANCE ACHETÉE À L'UNITÉ OCTROIE SON CRÉDIT, à compter du jour où
    -- elle a été payée — et non de la date choisie, qui peut se déplacer. Une
    -- séance annulée par l'atelier ne l'octroie plus : elle se rembourse, elle
    -- ne se reporte pas.
    coalesce((
      select count(*)
      from bookings b
      join sessions s2 on s2.id = b.session_id
      join creneaux c2 on c2.id = s2.creneau_id
      where b.participant_id = p_participant
        and b.source = 'achat'
        and s2.status <> 'cancelled'
        and c2.kind = 'atelier'
        and b.created_at::date <= p_at
    ), 0)
  )::integer;
$function$;

-- Le décompte redevient ce qu'il était : TOUTE place occupée consomme, achetée
-- ou non. C'est l'octroi ci-dessus qui équilibre, et lui seul — l'exception
-- posée dans `20260825170000` est donc retirée.
create or replace function public.consumed_credits(p_participant uuid)
returns integer
language sql
stable
set search_path to 'public'
as $function$
  select count(*)::integer
  from bookings b
  join sessions s on s.id = b.session_id
  join creneaux c on c.id = s.creneau_id
  where b.participant_id = p_participant
    and (b.status = 'booked' or b.credit_retenu)
    and s.status <> 'cancelled'
    and c.kind = 'atelier';
$function$;

-- Même retrait pour la facturation : la place achetée redevient visible, et
-- c'est son propre crédit qui la couvre. LE FILTRE SUR `kind` RESTE, lui : il
-- corrigeait un défaut distinct, où un stage — vendu à part et toujours réglé
-- d'avance — apparaissait comme une séance à facturer.
create or replace function public.extra_sessions(p_participant uuid)
returns table(booking_id uuid, session_id uuid, starts_at timestamp with time zone,
              creneau_label text, unit_price_cents integer)
language plpgsql
stable
set search_path to 'public'
as $function$
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
           granted_credits(p_participant, s.starts_at::date) as octroye_alors,
           (
             select round(f.prix_cents::numeric / f.seances)::integer
             from subscriptions sub
             join formules f on f.id = sub.formule_id
             where sub.participant_id = p_participant
               and s.starts_at::date between sub.starts_on and sub.ends_on
             order by sub.starts_on desc
             limit 1
           ) as prix_divise
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
      unit_price_cents := coalesce(r.prix_divise, r.unit_price_cents);
      return next;                       -- séance supplémentaire
    end if;
  end loop;
end;
$function$;
