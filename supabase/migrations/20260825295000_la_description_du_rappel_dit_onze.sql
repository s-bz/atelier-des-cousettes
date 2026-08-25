-- LA DESCRIPTION DU RAPPEL ANNONÇAIT ENCORE TROIS JOURS.
--
-- `20260825220000` a porté le rappel à onze jours et corrigé les CORPS des
-- gabarits — « un rappel vous parviendra onze jours avant ». Il a laissé la
-- description, cette ligne que personne ne reçoit mais qu'Isabelle lit chaque
-- fois qu'elle ouvre l'écran des courriels pour en modifier un.
--
-- C'est le genre d'écart qui se paie plus tard : elle y relit « trois jours »,
-- l'écrit à quelqu'un qui s'en étonne, et cherche une panne dans un cron qui
-- fait exactement ce qu'on lui demande (src/pages/api/cron/quotidien.ts:63).
--
-- ONZE, PARCE QUE L'ANNULATION EST LIBRE JUSQU'À DIX. Le rappel doit arriver
-- pendant qu'il reste quelque chose à décider : à onze jours, il laisse une
-- journée pleine pour libérer sa place sans que la séance reste due.

update email_templates
   set description = 'Envoyé automatiquement onze jours avant chaque séance réservée : '
                     'il reste alors une journée pour libérer sa place, l''annulation '
                     'étant libre jusqu''à dix jours.'
 where id = 'rappel';
