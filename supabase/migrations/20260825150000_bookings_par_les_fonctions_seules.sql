-- LES RÈGLES DE RÉSERVATION VIVENT DANS LES FONCTIONS, PAS DANS LES POLITIQUES.
--
-- `bookings` était ouverte en écriture directe à l'adhérent connecté :
--
--   grant select, insert, update on bookings to authenticated;   (20260729103454:29)
--   create policy bookings_own_insert ... with check (participant_id in ...)
--   create policy bookings_own_update ... with check (participant_id in ...)
--
-- Les deux politiques ne vérifiaient QUE l'appartenance du participant. Or
-- toutes les règles du métier — la capacité, la liste d'attente, le refus d'une
-- séance annulée, l'accord des publics, et le décompte des crédits — vivent
-- exclusivement dans `book_participant` et `release_booking`. Une écriture
-- directe sur la table les contournait toutes.
--
-- CE QUE CELA PERMETTAIT, en particulier :
--
--   * effacer `credit_retenu` — le drapeau qui rend une annulation tardive
--     facturable (20260730071219:33). Le remettre à false est un geste
--     d'administration ; l'adhérent pouvait se l'accorder ;
--   * poser des places sur des séances complètes, annulées, ou destinées à un
--     autre public, bien au-delà du forfait réglé ;
--   * depuis 20260825140000, écrire ou effacer `helloasso_order_id`, l'ancre
--     d'idempotence d'une place payée.
--
-- L'accès se fait par un jeton de session, que son porteur peut lire dans son
-- propre navigateur et présenter à PostgREST : `httpOnly` protège du
-- JavaScript de la page, pas de qui détient le compte.
--
-- CETTE RÉVOCATION NE COÛTE RIEN À L'APPLICATION. Aucune route n'écrit dans
-- `bookings` avec la session de l'adhérent : `getServerClient` — le seul client
-- porté par le jeton — n'est appelé nulle part, et les dix-huit accès à la
-- table passent tous par `getAdminClient` (clé secrète, rôle `service_role`),
-- que les droits de `authenticated` ne concernent pas. Les deux fonctions sont
-- `security definer` : elles écrivent au nom de leur propriétaire et ne
-- dépendent pas davantage de ce grant.
--
-- La lecture reste ouverte : `bookings_own_read` porte les écrans de l'adhérent.

revoke insert, update on bookings from authenticated;

drop policy if exists bookings_own_insert on bookings;
drop policy if exists bookings_own_update on bookings;

comment on table bookings is
  'Une reservation liberee n''est JAMAIS supprimee : la ligne released sert de '
  'pierre tombale. L''auto-inscription ecarte toute seance ayant deja une ligne, '
  'quel que soit son statut — sans quoi une place liberee lundi reapparaitrait '
  'mardi. ECRITURE PAR book_participant ET release_booking UNIQUEMENT : les '
  'regles de capacite, de public, de liste d''attente et de credit y vivent, et '
  'une ecriture directe les contournerait toutes.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Le plafond d'un code promotionnel se tient en base
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `usages_max` n'était vérifié qu'en TypeScript (`reductionDe`), tandis que
-- `incrementer_usage_code` incrémentait sans condition. Le compteur et son
-- plafond vivaient donc de part et d'autre de la frontière, et la seule chose
-- qui les tenait d'accord était l'ordre des appels côté serveur.
--
-- La fonction refuse désormais elle-même un code épuisé, expiré ou archivé, et
-- REND CE QU'ELLE A FAIT : le provisionnement peut constater qu'un usage n'a
-- pas été compté au lieu de l'ignorer. Le `drop` est nécessaire — on ne change
-- pas le type de retour d'une fonction par `create or replace`.

drop function if exists incrementer_usage_code(text);

create or replace function public.incrementer_usage_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_fait boolean;
begin
  update codes_promo
     set usages = usages + 1
   where code = upper(p_code)
     and archived_at is null
     and (expire_le is null or expire_le >= current_date)
     -- LE PLAFOND EST ICI, dans le même ordre que l'incrément : deux paiements
     -- simultanes sur le dernier usage d'un code ne peuvent plus le depasser,
     -- l'`update` serialisant les deux sur la meme ligne.
     and (usages_max is null or usages < usages_max);

  get diagnostics v_fait = row_count;
  return v_fait;
end;
$function$;

-- Les droits se refont à la main : un `drop` emporte les siens, et une
-- fonction recréée revient avec le défaut de Postgres — EXECUTE pour PUBLIC.
-- Un adhérent ne doit pas pouvoir épuiser un code en appelant la fonction.
revoke execute on function incrementer_usage_code(text) from public, anon, authenticated;
grant  execute on function incrementer_usage_code(text) to service_role;
