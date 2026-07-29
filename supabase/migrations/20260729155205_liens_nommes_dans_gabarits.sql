-- Deux liens nommés, à la place d'un {{lien}} dont la destination se devinait.
--
-- {{lien}} valait le planning dans les messages de séance et l'accueil dans le
-- message de bienvenue : la même variable menait à deux endroits selon le
-- gabarit, ce qui ne se voyait nulle part dans l'écran d'édition.
--
-- {{lien}} continue d'être servi par le code, en synonyme, pour ne pas casser
-- un gabarit déjà enregistré. Seule la liste annoncée à Isabelle change.

update email_templates
   set variables = array_remove(variables, 'lien') || array['lien_planning', 'lien_espace'],
       updated_at = now()
 where not ('lien_planning' = any(variables));

-- Le corps des messages passe de {{lien}} au lien explicite. Fait ici plutôt
-- qu'à la main : les cinq textes doivent rester cohérents avec la liste des
-- variables affichée juste en dessous d'eux.
update email_templates
   set body = replace(body, '{{lien}}', '{{lien_espace}}'), updated_at = now()
 where id = 'bienvenue' and body like '%{{lien}}%';

update email_templates
   set body = replace(body, '{{lien}}', '{{lien_planning}}'), updated_at = now()
 where id in ('rappel', 'annulation', 'confirmation', 'liberation')
   and body like '%{{lien}}%';
