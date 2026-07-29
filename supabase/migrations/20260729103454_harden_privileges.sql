-- Reprise en main des privilèges.
--
-- Constat vérifié sur ce projet : Supabase accorde par défaut TOUS les
-- privilèges (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER)
-- aux rôles anon et authenticated sur chaque nouvelle table de public. Les
-- GRANT de la migration précédente étaient donc des no-op : les rôles avaient
-- déjà tout. Seul le RLS empêchait la lecture — et une seule politique trop
-- permissive aurait suffi à ouvrir l'écriture à un appelant anonyme.
--
-- Défense en profondeur : on révoque tout, puis on n'accorde que le nécessaire.
-- anon ne doit rien pouvoir atteindre : l'application n'accède à Supabase que
-- côté serveur, avec la session de l'adhérent ou la clé secrète.

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon;
revoke usage on schema public from anon;

-- Même traitement pour les tables créées plus tard : sans cela, la prochaine
-- migration réintroduirait silencieusement le problème.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon;

-- Octroi minimal, à « authenticated » seulement.
grant usage on schema public to authenticated;
grant select on creneaux, sessions to authenticated;
grant select on accounts, participants, subscriptions to authenticated;
grant select, insert, update on bookings to authenticated;

-- Les politiques du catalogue étaient écrites « using (true) » sans restriction
-- de rôle : combinées aux privilèges par défaut, elles étaient lisibles par
-- anon. On les recrée explicitement pour « authenticated ».
drop policy if exists creneaux_read on creneaux;
drop policy if exists sessions_read on sessions;

create policy creneaux_read on creneaux for select to authenticated using (true);
create policy sessions_read on sessions for select to authenticated using (true);

-- Les autres politiques sont également restreintes au rôle authenticated, pour
-- que l'intention soit lisible dans le catalogue et non déduite des privilèges.
drop policy if exists accounts_self_read      on accounts;
drop policy if exists participants_own_read   on participants;
drop policy if exists subscriptions_own_read  on subscriptions;
drop policy if exists bookings_own_read       on bookings;
drop policy if exists bookings_own_insert     on bookings;
drop policy if exists bookings_own_update     on bookings;

create policy accounts_self_read on accounts for select to authenticated
  using (auth_user_id = auth.uid() or is_admin());

create policy participants_own_read on participants for select to authenticated
  using (account_id = current_account_id() or is_admin());

create policy subscriptions_own_read on subscriptions for select to authenticated
  using (
    participant_id in (select id from participants where account_id = current_account_id())
    or is_admin()
  );

create policy bookings_own_read on bookings for select to authenticated
  using (
    participant_id in (select id from participants where account_id = current_account_id())
    or is_admin()
  );

create policy bookings_own_insert on bookings for insert to authenticated
  with check (
    participant_id in (select id from participants where account_id = current_account_id())
  );

-- ATTENTION — un UPDATE exige AUSSI une politique SELECT (bookings_own_read).
-- Sans elle, la liberation d'une place ne leve aucune erreur : elle affecte
-- zero ligne, silencieusement. Ne jamais supprimer bookings_own_read en la
-- croyant redondante.
create policy bookings_own_update on bookings for update to authenticated
  using (
    participant_id in (select id from participants where account_id = current_account_id())
  )
  with check (
    participant_id in (select id from participants where account_id = current_account_id())
  );
