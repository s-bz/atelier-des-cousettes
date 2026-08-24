-- UN FORFAIT EST ACQUIS À L'ACHAT, ET NON À L'OUVERTURE DE LA SAISON.
--
-- Le cas qui l'a révélé : une inscription prise le 24 août pour une saison
-- commençant le 1er septembre. `granted_credits` rendait 0, l'auto-inscription
-- n'avait aucun crédit à dépenser et ne posait aucune place, et la fiche de
-- l'adhérente restait vide pendant une semaine — sans que rien n'indique si
-- c'était normal.
--
-- CE N'ÉTAIT PAS CE QUE LE PRODUIT PROMET. L'écran d'inscription annonce
-- « Forfait pour la saison — tout est disponible dès le début », et le titre de
-- supabase/tests/forfaits.sql dit « octroi immédiat ». Quelqu'un qui règle
-- l'année entière veut voir son planning tout de suite, le remanier, et surtout
-- RETENIR SES PLACES avant qu'elles ne partent : faire commencer tout le monde
-- le 1er septembre, c'est organiser une course entre les adhérents et remplir
-- les listes d'attente pour rien.
--
-- CE QUE `starts_on` ET `ends_on` VEULENT DIRE POUR UN FORFAIT : quelles
-- séances il couvre, et non à partir de quand les crédits existent. C'est déjà
-- ainsi que `extra_sessions` les lit — elle cherche la formule dont la période
-- contient la DATE DE LA SÉANCE. La condition retirée ici était la dernière à
-- leur donner l'autre sens.
--
-- LE MENSUEL NE BOUGE PAS, et c'est tout l'objet de la condition conservée :
-- ses crédits s'acquièrent mois après mois, si bien qu'avant le premier mois il
-- ne s'est écoulé aucun mois et il n'y a rien à octroyer. Sans le garde, le
-- calcul de différence de mois deviendrait négatif.

create or replace function granted_credits(p_participant uuid, p_at date)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(sum(
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
  ), 0)::integer
  from subscriptions s
  where s.participant_id = p_participant
    -- Le forfait s'octroie dès qu'il existe ; le mensuel attend son premier mois.
    and (s.total_credits is not null or p_at >= s.starts_on);
$$;

comment on function granted_credits(uuid, date) is
  'Credits octroyes a une date. Un forfait (total_credits) est acquis des '
  'l''achat, avant meme le debut de la saison : starts_on/ends_on disent '
  'quelles seances il couvre, pas quand les credits apparaissent. Un '
  'abonnement mensuel n''octroie rien avant son premier mois.';
