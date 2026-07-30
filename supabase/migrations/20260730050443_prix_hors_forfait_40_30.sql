-- Séance hors forfait : 40 € pour un adulte, 30 € pour un enfant.
--
-- Le 25 € venait des données de la saison précédente. Ce sont désormais les
-- mêmes montants que la séance à l'unité vendue en ligne — 40 € adulte, 30 €
-- enfant — et c'est cohérent : dans les deux cas on paie une séance qu'aucun
-- forfait ne couvre. Deux prix différents pour la même chose auraient fini par
-- se contredire dans une facture.
--
-- Ce prix ne sert QUE pour les séances en dépassement, énumérées par
-- extra_sessions() dans l'écran « à facturer ». Une séance couverte par le
-- forfait ne le lit jamais.

update creneaux
   set default_unit_price_cents = case audience
         when 'enfants' then 3000
         else 4000
       end
 where kind = 'atelier';

-- Les séances à venir suivent. Les séances PASSÉES gardent leur prix : il dit
-- ce qu'une place valait le jour où elle a été tenue, et le réécrire
-- reviendrait à refacturer après coup une séance déjà eue. Une seule est
-- concernée, hors saison.
update sessions se
   set unit_price_cents = case
         when (select c.audience from creneaux c where c.id = se.creneau_id) = 'enfants' then 3000
         else 4000
       end
 where se.starts_at > now()
   and exists (select 1 from creneaux c where c.id = se.creneau_id and c.kind = 'atelier');
