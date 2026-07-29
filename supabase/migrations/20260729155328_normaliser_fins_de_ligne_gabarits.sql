-- Répare les gabarits enregistrés en CRLF.
--
-- Un <textarea> renvoie ses retours à la ligne en CRLF : la norme HTML l'exige.
-- Le rendu découpe les paragraphes sur deux \n adjacents — que « \r\n\r\n » ne
-- contient pas. Tout message enregistré depuis l'écran d'édition partait donc
-- en un seul bloc, ses paragraphes et ses listes aplatis.
--
-- Le code normalise désormais à l'entrée comme à l'affichage ; reste à nettoyer
-- ce qui a déjà été écrit.

update email_templates
   set body = replace(body, chr(13), ''),
       subject = replace(subject, chr(13), ''),
       updated_at = now()
 where body like '%' || chr(13) || '%' or subject like '%' || chr(13) || '%';
