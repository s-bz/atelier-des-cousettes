-- Les stages augmentent de 5 €, l'adhésion ponctuelle étant désormais comprise.
--
-- Ce n'est pas une hausse de tarif : les 5 € d'adhésion à l'association se
-- réglaient jusqu'ici à part, le jour du stage. Ils entrent dans le prix
-- affiché. Ce que verse la participante ne change pas ; ce qui change, c'est
-- qu'elle le sait à l'avance et n'a rien à sortir sur place.
--
-- Écrit valeur par valeur plutôt qu'en « + 500 », pour deux raisons : la
-- migration dit alors noir sur blanc les prix d'avant et d'après, ce qu'une
-- relecture peut vérifier ; et elle est rejouable sans risque, aucun prix
-- d'arrivée n'étant un prix de départ.
--
--   40 € → 45 €   initiation machine, patronage, sac et tote bag
--   50 € → 55 €   banane
--   65 € → 70 €   surjeteuse, découverte formule courte
--   90 € → 95 €   découverte formule complète
--
-- Les ateliers ne sont pas concernés : leur adhésion est annuelle (15 €) et se
-- règle une fois pour la saison, non à chaque séance.

update creneaux
set default_unit_price_cents = case default_unit_price_cents
  when 4000 then 4500
  when 5000 then 5500
  when 6500 then 7000
  when 9000 then 9500
end
where kind = 'stage'
  and default_unit_price_cents in (4000, 5000, 6500, 9000);
