-- Corrections signalées par « supabase db advisors ».

-- 1. function_search_path_mutable ×3
--    Un search_path modifiable permet de détourner un appel de fonction en
--    interposant un objet dans un schéma prioritaire. On le fige.
create or replace function granted_credits(p_participant uuid, p_at date)
returns integer language sql stable set search_path = public as $$
  select coalesce(sum(
    s.credits_per_month * (
        (extract(year  from least(p_at, s.ends_on))::int * 12
       + extract(month from least(p_at, s.ends_on))::int)
      - (extract(year  from s.starts_on)::int * 12
       + extract(month from s.starts_on)::int)
      + 1
    )
  ), 0)::integer
  from subscriptions s
  where s.participant_id = p_participant
    and p_at >= s.starts_on;
$$;

create or replace function consumed_credits(p_participant uuid)
returns integer language sql stable set search_path = public as $$
  select count(*)::integer
  from bookings b
  join sessions s on s.id = b.session_id
  where b.participant_id = p_participant
    and b.status = 'booked'
    and s.status <> 'cancelled';
$$;

create or replace function balance(p_participant uuid, p_at date default current_date)
returns integer language sql stable set search_path = public as $$
  select granted_credits(p_participant, p_at) - consumed_credits(p_participant);
$$;

-- 2. anon_security_definer_function_executable ×2
--    « revoke ... from anon » ne suffisait pas : Postgres accorde EXECUTE au
--    pseudo-rôle PUBLIC par défaut sur toute nouvelle fonction. C'est ce grant
--    implicite, et non un grant à anon, qui laissait ces fonctions atteignables.
revoke execute on function current_account_id() from public, anon;
revoke execute on function is_admin()           from public, anon;
revoke execute on function granted_credits(uuid, date) from public, anon;
revoke execute on function consumed_credits(uuid)      from public, anon;
revoke execute on function balance(uuid, date)         from public, anon;

-- authenticated conserve EXECUTE : une expression de politique RLS est évaluée
-- avec les privilèges de l'appelant, donc sans ce droit toutes les politiques
-- échoueraient. C'est le sens de l'avertissement
-- « authenticated_security_definer_function_executable », que l'on assume.
grant execute on function current_account_id()         to authenticated;
grant execute on function is_admin()                   to authenticated;
grant execute on function granted_credits(uuid, date)  to authenticated;
grant execute on function consumed_credits(uuid)       to authenticated;
grant execute on function balance(uuid, date)          to authenticated;

-- 3. auth_rls_initplan
--    auth.uid() était réévalué pour chaque ligne. Enveloppé dans un select, le
--    planificateur le calcule une seule fois par requête.
drop policy if exists accounts_self_read on accounts;
create policy accounts_self_read on accounts for select to authenticated
  using (auth_user_id = (select auth.uid()) or is_admin());
