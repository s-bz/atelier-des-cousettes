-- L'ADHÉSION À L'ASSOCIATION, PAR FAMILLE ET PAR SAISON.
--
-- 15 € par an. Une mère inscrivant ses deux filles règle 15 €, pas 45 € : c'est
-- pourquoi la ligne porte sur le COMPTE et non sur le participant. `accounts`
-- modélise le foyer, `participants` l'individu.
--
-- ELLE N'EST DUE QUE POUR LES ATELIERS RÉGULIERS. Un stage et une séance sans
-- engagement la comprennent dans leur prix, et cette adhésion comprise
-- N'ACQUITTE PAS celle du forfait : qui a pris un stage en octobre règle quand
-- même 15 € s'il prend un forfait en janvier. Une vente de stage n'écrit donc
-- jamais ici, et ne consulte jamais cette table.
--
-- C'EST L'APPLICATION QUI TIENT LE REGISTRE, décidé le 24/08/2026. Une intention
-- de paiement HelloAsso n'est que de l'argent : elle ne crée ni adhérent, ni
-- carte de membre, ni ligne au registre. Cette table est donc le registre.

create table adhesions (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null references accounts(id) on delete cascade,
  saison             text not null,

  -- Nul tant que le règlement n'est pas acquis : une adhésion réservée dans un
  -- paiement en cours n'est pas une adhésion payée.
  paye_le            timestamptz,
  montant_cents      integer not null check (montant_cents >= 0),

  -- Nul pour un règlement en espèces ou par chèque, que rien n'oblige à passer
  -- par HelloAsso.
  helloasso_order_id text,

  cree_le            timestamptz not null default now(),

  -- UNE SEULE PAR FAMILLE ET PAR SAISON. C'est cette contrainte, et non le code
  -- applicatif, qui rend inoffensifs deux achats lancés dans deux onglets : la
  -- seconde écriture échoue, et le trop-perçu ressort dans la file « à traiter »
  -- plutôt que de créer une deuxième adhésion.
  unique (account_id, saison)
);

comment on table adhesions is
  'Le registre des adherents, tenu par l''application. Une ligne par famille et '
  'par saison — l''adhesion se porte sur le compte, jamais sur le participant.';

comment on column adhesions.paye_le is
  'Nul tant que le reglement n''est pas acquis.';

-- La question posée avant chaque achat de forfait : cette famille a-t-elle déjà
-- réglé pour cette saison ?
create index adhesions_par_saison on adhesions (saison, account_id);

alter table adhesions enable row level security;

-- Chacun voit l'adhésion de sa famille, Isabelle voit tout. Même forme que
-- `accounts_self_read` : `auth.uid()` enveloppé dans un select pour n'être
-- évalué qu'une fois par requête, et non par ligne.
create policy adhesions_own_read on adhesions for select to authenticated
  using (account_id = current_account_id() or is_admin());
