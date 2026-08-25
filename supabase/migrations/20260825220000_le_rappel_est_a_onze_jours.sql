-- LE RAPPEL EST À ONZE JOURS, ET LE COURRIEL DISAIT TROIS.
--
-- La tâche quotidienne prévient onze jours avant la séance, et c'est délibéré :
-- l'annulation est libre jusqu'à dix, il faut donc que le rappel arrive avant
-- cette limite pour qu'il serve à quelque chose. Un rappel à trois jours serait
-- arrivé une semaine trop tard pour décider quoi que ce soit.
--
-- Le gabarit de bienvenue, lui, annonçait encore trois jours — tout en tirant
-- la conclusion juste : « il vous restera donc une journée pour décider », ce
-- qui n'est vrai qu'à onze. La phrase se contredisait donc elle-même, et c'est
-- le nombre qui avait tort.

update email_templates
   set body = replace(body, 'trois jours avant chaque séance', 'onze jours avant chaque séance')
 where body like '%trois jours avant chaque séance%';
