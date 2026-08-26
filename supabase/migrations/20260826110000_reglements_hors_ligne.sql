-- Les règlements hors ligne : chèque et espèces.
--
-- CE QUI MANQUAIT. Isabelle encaisse parfois un chèque ou du liquide, et
-- l'inscription doit malgré tout se faire par le formulaire — la famille crée
-- son compte et choisit ses séances elle-même. Faute de mécanisme, un code de
-- réduction à 100 % en tenait lieu : la commande partait à zéro euro, et les
-- livres annonçaient une place offerte là où l'association avait encaissé
-- trois cent trente-neuf euros. L'adhésion s'inscrivait au registre pour zéro,
-- alors qu'elle avait été payée en liquide.
--
-- UNE REMISE ET UN PAIEMENT HORS LIGNE SONT DES FAITS OPPOSÉS : l'une réduit
-- ce qui est dû, l'autre atteste que ce qui était dû a été réglé ailleurs. Les
-- confondre rendait les comptes illisibles. D'où une table à part, et non un
-- type de plus dans `codes_promo`.
--
-- LE CODE EST LE REÇU. Pour un paiement par carte, HelloAsso tient le registre
-- et nous n'avons rien à conserver. Pour un chèque, il n'existait aucune trace
-- nulle part : cette table est ce livre de caisse. Le montant qu'elle porte est
-- celui qu'Isabelle a REÇU, et il est vérifié contre le prix de l'inscription
-- au moment de l'achat.
--
-- L'ARGENT EST DÉJÀ LÀ QUAND LE CODE EST REMIS. Isabelle ne le crée qu'une fois
-- le chèque en main : il n'y a donc pas d'état « en attente d'encaissement », et
-- `encaisse_le` est une date, pas une promesse.

create table reglements_hors_ligne (
  code             text primary key,
  -- Ce qui a été remis. Sert au rapprochement bancaire : un chèque se retrouve
  -- sur le relevé, pas les espèces.
  moyen            text not null check (moyen in ('cheque', 'especes')),
  -- Le montant REÇU, en centimes. Vérifié contre le prix de l'inscription :
  -- un écart arrête l'achat plutôt que de laisser partir un sous-paiement.
  montant_cents    integer not null check (montant_cents > 0),
  saison           text not null,
  encaisse_le      date not null default current_date,
  -- Nul tant que personne ne s'en est servi. UN CODE, UN RÈGLEMENT, UNE
  -- INSCRIPTION : il ne vaut jamais deux fois.
  utilise_le       timestamptz,
  -- La référence de la commande qui l'a consommé, pour relier le reçu à
  -- l'inscription qu'il a payée.
  reference        text,
  -- Nul : sans date limite. Une saison ne se rouvre pas, mais un code égaré
  -- mérite de se périmer.
  expire_le        date,
  archived_at      timestamptz,
  cree_le          timestamptz not null default now(),

  -- Utilisé sans référence, ou référencé sans être utilisé : l'un des deux
  -- chemins d'écriture aurait alors sauté une étape, et le reçu ne mènerait
  -- plus à l'inscription.
  constraint reglement_usage_complet check ((utilise_le is null) = (reference is null))
);

comment on table reglements_hors_ligne is
  'Le livre de caisse des reglements par cheque ou en especes. Un code par '
  'reglement, valable une seule fois, cree APRES encaissement. Le montant est '
  'celui recu : il est verifie contre le prix de l''inscription.';

create index reglements_hors_ligne_disponibles
  on reglements_hors_ligne (code) where archived_at is null and utilise_le is null;

-- Personne ne lit cette table par le jeton de session : un code se contrôle
-- côté serveur, sous la clé secrète. La laisser lisible reviendrait à publier
-- la liste des codes qui donnent une inscription entière.
alter table reglements_hors_ligne enable row level security;

/**
 * Consomme un code, ou refuse.
 *
 * ATOMIQUE, ET AVANT DE PROVISIONNER — l'inverse de ce que fait un code de
 * réduction. Celui-ci se compte APRÈS le paiement, l'unicité de
 * `subscriptions.helloasso_order_id` empêchant le doublon. Ici il n'y a pas de
 * paiement, et chaque tentative forge sa propre référence : rien n'empêcherait
 * deux onglets d'inscrire deux fois la même famille sur le même chèque. C'est
 * donc ce `update ... where utilise_le is null` qui arbitre, et lui seul.
 */
create or replace function consommer_reglement_hors_ligne(
  p_code text,
  p_reference text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_touche integer;
begin
  update reglements_hors_ligne
     set utilise_le = now(), reference = p_reference
   where code = upper(btrim(p_code))
     and archived_at is null
     and utilise_le is null
     and (expire_le is null or expire_le >= current_date);

  get diagnostics v_touche = row_count;
  return v_touche > 0;
end;
$$;

revoke all on function consommer_reglement_hors_ligne(text, text) from public, anon, authenticated;
