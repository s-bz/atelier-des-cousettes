-- DEUX FOIS LA MÊME PERSONNE, DANS LE MÊME FOYER, À 295 MILLISECONDES D'ÉCART.
--
-- Troisième visage du même défaut, et le plus coûteux. Le retour du payeur et
-- la notification HelloAsso provisionnent tous les deux la même commande :
--
--   09:43:43.969  le premier passage crée « John Deer »
--   09:43:44.111  … et pose sa place
--   09:43:44.264  le second passage crée « John Deer » une SECONDE fois
--
-- `trouverOuCreerParticipant` lit, ne trouve rien, puis insère. Entre la
-- lecture et l'insertion, l'autre passage fait de même : aucun des deux ne voit
-- l'autre, et rien en base ne les départage.
--
-- Les deux corrections d'aujourd'hui n'y pouvaient rien : la place est unique
-- par `helloasso_order_id`, le courriel l'est par `annonce_le` — la PERSONNE ne
-- l'était par rien. Le foyer se retrouve avec deux dossiers du même nom, dont
-- un seul porte la place, le solde et l'historique.
--
-- ET LE DOUBLON S'AGGRAVE TOUT SEUL : la lecture qui suit emploie
-- `maybeSingle()`, qui ÉCHOUE face à deux lignes. Son erreur était ignorée, la
-- personne réputée inconnue, et l'achat suivant en créait une troisième.
--
-- HORS FOYER, PAS DE RÈGLE. `participants.account_id` est nul par conception —
-- l'adhérente qui ne veut pas de compte existe quand même (PRD §4) — et deux
-- « Marie Durand » sans compte sont deux personnes, pas un doublon.

create unique index participants_foyer_nom_unique
  on participants (account_id, lower(first_name), lower(last_name))
  where account_id is not null;

comment on index participants_foyer_nom_unique is
  'Un nom, une personne, dans un foyer donne. Le provisionnement s''execute '
  'deux fois par commande — retour du payeur et notification — et lit avant '
  'd''ecrire : sans cet index, les deux passages creent la meme personne.';
