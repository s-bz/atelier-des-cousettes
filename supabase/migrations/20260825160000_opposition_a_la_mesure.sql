-- LE DROIT D'OPPOSITION, RENDU EXÉCUTABLE.
--
-- La politique de confidentialité promet, pour la mesure d'audience fondée sur
-- l'intérêt légitime : « nous cesserons alors de vous mesurer ». Une promesse
-- qu'aucun code ne savait tenir. L'article 21 du RGPD impose de l'honorer POUR
-- L'AVENIR, et pas seulement d'effacer le passé : effacer chez PostHog après
-- coup ne suffit donc pas, il faut un filtre en amont.
--
-- POURQUOI SUR `accounts`, ET NULLE PART AILLEURS.
--
-- Depuis que les pages publiques d'achat n'envoient plus l'adresse saisie dans
-- un formulaire refusé, toute personne dont l'identifiant atteint PostHog a une
-- ligne ici : on ne mesure nommément que qui a payé, réservé, ou s'est
-- connecté — et chacun de ces gestes suppose un compte. La liste d'opposition
-- n'a donc qu'un seul endroit où vivre, et aucune table à part n'est justifiée.
--
-- LA BASCULE SE FAIT À LA MAIN, ET C'EST PROPORTIONNÉ. Une association qui
-- recevra peut-être une demande dans sa vie n'a pas besoin d'un écran
-- d'administration ; un `update` suffit, et il est documenté dans
-- DOCS/RUNBOOK-opposition-mesure.md.

alter table accounts
  add column mesure_refusee boolean not null default false;

comment on column accounts.mesure_refusee is
  'Opposition de la personne à la mesure d''audience (RGPD art. 21). Lue par '
  'src/utils/mesure.ts, qui n''émet alors plus aucun événement nominatif la '
  'concernant. Ne bloque pas les événements anonymes, qui ne la désignent pas.';

-- La liste est lue à chaque démarrage d'instance, et ne contient dans les faits
-- qu'une poignée de lignes. L'index partiel garde cette lecture immédiate même
-- si la table des comptes grossit, et ne coûte rien tant que personne ne s'est
-- opposé.
create index accounts_mesure_refusee_idx
  on accounts (email)
  where mesure_refusee;
