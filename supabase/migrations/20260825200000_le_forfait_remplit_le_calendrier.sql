-- UN FORFAIT REMPLIT LE CALENDRIER. IL NE S'Y RÉPARTIT PLUS.
--
-- Constaté sur un achat réel : un pack de 16 séances enfants n'en a placé que
-- 14. Rien n'était complet, et les 16 dates existaient.
--
-- LA CAUSE ÉTAIT UNE MOYENNE. L'auto-inscription visait un cumul linéaire —
-- `round(rang × 16 ÷ 10 mois)`, soit 1,6 par mois — alors que le calendrier
-- réel n'est pas linéaire : deux séances en octobre et en décembre, une seule
-- de février à mai.
--
--   cible cumulée   2  3  5  6  8 10 11 13 14 16
--   au calendrier   2  2  2  2  2  1  1  1  1  2
--   posées          2  1  2  1  2  1  1  1  1  2   = 14
--
-- Les mois à deux séances plafonnés à une en perdaient une ; les mois à une
-- seule ne pouvaient plus rattraper. Deux crédits restaient au solde, et deux
-- dates — le 10 octobre et le 12 décembre — restaient à poser à la main.
--
-- CE N'EST PAS CE QU'ON VEND. « Seize séances » désigne un lot payé d'avance,
-- et la page l'annonce ainsi : « inscription automatique à toutes les séances
-- de votre formule, sur toute la saison ».
--
-- MAIS « REMPLIR » NE PEUT PAS VOULOIR DIRE « PRENDRE LES PREMIÈRES ». Le
-- jeudi après-midi compte dix-neuf dates ; un forfait de neuf séances qui
-- prendrait les neuf premières serait épuisé en décembre et laisserait janvier
-- à juin vides. L'étalement protégeait cela, et il avait raison.
--
-- LA FAUTE ÉTAIT LA GRANULARITÉ, pas le principe : on étalait sur les MOIS,
-- alors que ce sont les DATES qu'il faut étaler. La cible se calcule désormais
-- sur le rang de la séance dans la saison — `round(k × crédits ÷ dates)` — ce
-- qui donne exactement toutes les dates quand il y en a autant que de crédits,
-- et une sur deux quand il y en a deux fois plus.
--
-- LE MENSUEL, LUI, GARDE SON PLAFOND. `credits_per_month` veut dire « deux par
-- mois » : sans plafond, un abonné mensuel viderait la saison dès septembre et
-- n'aurait plus rien à partir de novembre. Les deux formules disent deux choses
-- différentes, et c'est la seule raison pour laquelle ce code distingue
-- `total_credits` de `credits_per_month`.

create or replace function public.run_auto_enrolment(p_horizon_days integer default 60)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  abo         record;
  mois        date;
  seance      record;
  v_deja_total integer;
  v_cible      integer;
  v_rang_seances integer;
  v_seances_total integer;
  v_deja_mois  integer;
  v_a_creer   integer;
  v_places    integer;
  v_borne     date;
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
      and s.starts_on <= greatest(v_fin, s.ends_on)
      and c.audience = (p.audience || 's')
      and c.kind = 'atelier'          -- un stage ne s'inscrit jamais d'office
      and c.au_forfait                -- ni une seance vendue a l'unite
  loop
    -- LA BORNE : toute la saison pour un forfait, l'horizon pour un mensuel.
    v_borne := case
                 when abo.total_credits is not null then abo.ends_on
                 else least(v_fin, abo.ends_on)
               end;

    mois := greatest(date_trunc('month', current_date)::date,
                     date_trunc('month', abo.starts_on)::date);

    while mois <= v_borne loop
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
        /*
         * LA CIBLE SE MESURE EN DATES, NON EN MOIS.
         *
         * `v_rang_seances` est le nombre de séances de la saison jusqu'à la fin
         * de ce mois-ci ; `v_seances_total`, celui de la saison entière. La
         * cible cumulée est leur rapport, appliqué aux crédits — d'où toutes
         * les dates quand il y en a autant que de crédits, et une sur deux
         * quand il y en a deux fois plus.
         */
        select count(*) into v_seances_total
        from sessions se
        where se.creneau_id = abo.home_creneau_id
          and se.status = 'scheduled'
          and se.starts_at >= greatest(abo.starts_on::timestamptz, current_date::timestamptz)
          and se.starts_at::date <= abo.ends_on;

        select count(*) into v_rang_seances
        from sessions se
        where se.creneau_id = abo.home_creneau_id
          and se.status = 'scheduled'
          and se.starts_at >= greatest(abo.starts_on::timestamptz, current_date::timestamptz)
          and se.starts_at < (mois + interval '1 month');

        select count(*) into v_deja_total
        from bookings b
        join sessions se on se.id = b.session_id
        where b.participant_id = abo.participant_id
          and se.creneau_id = abo.home_creneau_id
          and se.starts_at >= abo.starts_on
          and se.starts_at < (mois + interval '1 month');

        v_cible := case
                     when v_seances_total = 0 then 0
                     else round(v_rang_seances::numeric * abo.total_credits / v_seances_total)
                   end;

        v_a_creer := least(v_cible - v_deja_total, abo.total_credits - v_deja_total);
      else
        -- Le mensuel garde son plafond : « deux par mois » veut dire deux.
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
          and c.au_forfait
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
$function$;
