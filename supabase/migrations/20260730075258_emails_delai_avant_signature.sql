-- Le délai d'annulation remonte AVANT la signature.
--
-- La migration précédente l'ajoutait avec « || », qui écrit à la toute fin du
-- texte : le paragraphe se retrouvait sous « À bientôt, L'Atelier des
-- Cousettes ». Une phrase après la signature ne se lit pas — on a déjà refermé
-- le message — et celle-ci porte justement la règle qu'on veut faire connaître.
--
-- Ajouter à la fin d'un texte n'est presque jamais ajouter au bon endroit : un
-- corps de message a une clôture, et tout ce qui la suit est perdu.

update email_templates
   set body = regexp_replace(
         -- 1. retirer le paragraphe mal placé, où qu'il soit
         regexp_replace(
           body,
           E'\\n*Vous pouvez libérer une place jusqu''à 48 h avant la séance[^€]*?reste due\\.',
           '',
           'g'),
         -- 2. le réinsérer juste avant la formule de clôture
         E'(À bientôt,)',
         E'Vous pouvez libérer une place jusqu''à 48 h avant la séance : elle vous reste\nacquise. Passé ce délai, la place repart aux autres adhérents mais la séance\nreste due.\n\n\\1')
 where id = 'confirmation'
   and body like '%48 h%';
