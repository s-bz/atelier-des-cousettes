-- Droits d'accès : RLS, GRANT et politiques.
--
-- Séparé de la migration de schéma à dessein. Un GRANT manquant et une politique
-- manquante produisent le MÊME symptôme (401, ou zéro ligne) pour des causes
-- opposées. Les isoler rend le diagnostic possible.
--
-- Les routes d'administration utilisent la clé secrète (rôle service_role), qui
-- contourne le RLS. Les GRANT ci-dessous ne concernent donc que les adhérents.

-- 1. RLS partout, sans exception.
alter table accounts      enable row level security;
alter table participants  enable row level security;
alter table creneaux      enable row level security;
alter table subscriptions enable row level security;
alter table sessions      enable row level security;
alter table bookings      enable row level security;

-- 2. GRANT explicite : activer le RLS n'expose pas une table, et inversement.
--    « authenticated » uniquement — JAMAIS « anon ».
grant usage on schema public to authenticated;
grant select on creneaux, sessions to authenticated;
grant select on accounts, participants, subscriptions to authenticated;
grant select, insert, update on bookings to authenticated;

-- 3. Résolution du compte courant depuis le JWT.
--    security definer pour lire accounts sans être bloqué par sa propre
--    politique ; search_path figé pour éviter tout détournement.
create or replace function current_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from accounts where auth_user_id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from accounts where auth_user_id = auth.uid()), false);
$$;

comment on function is_admin() is
  'Le role est lu en base, jamais depuis auth.jwt() : user_metadata est '
  'modifiable par l''utilisateur lui-meme et ne peut pas fonder une autorisation.';

-- 4. Politiques.
create policy accounts_self_read on accounts for select
  using (auth_user_id = auth.uid() or is_admin());

create policy participants_own_read on participants for select
  using (account_id = current_account_id() or is_admin());

create policy subscriptions_own_read on subscriptions for select
  using (
    participant_id in (select id from participants where account_id = current_account_id())
    or is_admin()
  );

-- Catalogue : lisible par tout utilisateur connecté.
create policy creneaux_read on creneaux for select using (true);
create policy sessions_read on sessions for select using (true);

create policy bookings_own_read on bookings for select
  using (
    participant_id in (select id from participants where account_id = current_account_id())
    or is_admin()
  );

create policy bookings_own_insert on bookings for insert
  with check (
    participant_id in (select id from participants where account_id = current_account_id())
  );

-- ATTENTION — un UPDATE exige AUSSI une politique SELECT (bookings_own_read).
-- Sans elle, la liberation d'une place ne leve aucune erreur : elle affecte
-- zero ligne, silencieusement. Symptome cote adherent : « le bouton ne fait
-- rien ». Ne jamais supprimer bookings_own_read en la croyant redondante.
create policy bookings_own_update on bookings for update
  using (
    participant_id in (select id from participants where account_id = current_account_id())
  )
  with check (
    participant_id in (select id from participants where account_id = current_account_id())
  );
