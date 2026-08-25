-- UNE SÉANCE PAYÉE À L'UNITÉ NE CONSOMME PAS DE CRÉDIT DE FORFAIT.
--
-- Découvert par le premier achat réel, le 25/08/2026 : quelqu'un a acheté une
-- séance sans engagement — réglée d'avance, carte bancaire, adhésion comprise —
-- et son espace adhérent lui a annoncé
--
--     Séances disponibles : -1
--     « 1 séance au-delà de votre forfait, à régler avec Isabelle. »
--
-- On demandait donc de payer une seconde fois ce qui venait de l'être.
--
-- LA CAUSE : `consumed_credits` compte TOUTE réservation d'atelier, sans
-- regarder d'où elle vient. Elle a été écrite quand les places ne pouvaient
-- naître que d'un forfait — par l'inscription d'office, par l'adhérent sur son
-- solde, ou par l'administration. La vente à l'unité a introduit une quatrième
-- origine, `source = 'achat'`, qui est déjà réglée au moment où elle apparaît.
--
-- Le solde d'un forfait mesure ce qu'il reste d'un lot payé d'avance. Une place
-- achetée à part n'y entre pas plus qu'un billet acheté au guichet n'entame un
-- abonnement.

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
    and c.kind = 'atelier'
    -- Réglée à l'achat : elle ne prélève rien sur le forfait.
    and b.source <> 'achat';
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- La facturation suit la même règle, et en corrige une seconde
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `extra_sessions` dresse la liste de ce qui dépasse le forfait, pour qu'Isabelle
-- le facture. Elle avait la même cécité — une séance payée à l'unité y figurait,
-- et se serait donc facturée une seconde fois.
--
-- ELLE EN AVAIT UNE AUTRE, plus discrète : elle ne filtrait pas `c.kind`, là où
-- `consumed_credits` ne compte que les ateliers. Les deux fonctions
-- travaillaient donc sur des ensembles différents, et un STAGE — vendu à part,
-- toujours réglé d'avance — serait apparu comme une séance à facturer. Personne
-- ne s'en était aperçu : aucun stage n'avait encore été vendu.

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
      -- Les deux conditions qui manquaient, et qui alignent cette fonction sur
      -- `consumed_credits` : le même ensemble de départ, ou les deux comptes
      -- finissent par se contredire.
      and c.kind = 'atelier'
      and b.source <> 'achat'
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
