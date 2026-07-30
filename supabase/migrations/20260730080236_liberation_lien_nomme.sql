-- « liberation » utilise encore {{lien}}, qu'il ne déclare pas.
--
-- La variable est servie — {{lien}} reste un synonyme de {{lien_planning}} — donc
-- le message part correct. Mais elle ne figure pas dans la liste affichée sous le
-- champ dans l'écran Messages : Isabelle ne sait donc pas qu'elle existe, et si
-- elle l'effaçait en retouchant le texte, rien ne lui dirait comment la
-- remettre.
--
-- On aligne le texte sur le nom explicite plutôt que d'ajouter {{lien}} aux
-- variables annoncées : c'est ce nom-là qu'on veut voir se répandre, l'autre ne
-- survivant que pour ne pas casser un gabarit ancien.
--
-- Substitution ciblée, et conditionnelle : ces textes sont ceux d'Isabelle et
-- elle les retouche depuis l'écran Messages. Rien d'autre n'est réécrit.

update email_templates
   set body = replace(body, '{{lien}}', '{{lien_planning}}'),
       updated_at = now()
 where id = 'liberation'
   and body like '%{{lien}}%';
