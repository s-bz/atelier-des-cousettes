-- La séance hors forfait passe à 45 € (adultes) et 35 € (enfants).
--
-- Comme pour les stages, ce n'est pas une hausse : les 5 € d'adhésion à
-- l'association se réglaient à part. Ils entrent dans le prix affiché. Ce que
-- verse la participante ne change pas ; elle le sait simplement à l'avance.
--
-- CE PRIX SERT DEUX FOIS, et c'est pourquoi il vit ici et non dans le CMS :
--   — la séance sans engagement annoncée dans la grille des tarifs ;
--   — les séances dépassant le forfait, facturées par `extra_sessions`.
-- Recopié dans le contenu, il aurait dérivé en une saison, et la page aurait
-- promis un montant que l'écran « à facturer » aurait démenti.
--
-- LES DEUX TABLES SONT MISES À JOUR, et l'oubli serait invisible : la
-- facturation lit `sessions.unit_price_cents`, tandis que les pages affichent
-- `creneaux.default_unit_price_cents`. Ne changer que le second aurait affiché
-- 45 € en facturant 40 € — c'est exactement ce qui est arrivé aux stages, sans
-- conséquence là-bas parce qu'un stage se règle à l'achat, mais un atelier se
-- facture bien par ce chemin.
--
-- Aucune séance n'a encore eu lieu : la saison ouvre le 12 septembre 2026, et
-- les 30 réservations en cours portent toutes sur des dates à venir. Personne
-- n'a donc été facturé à l'ancien tarif.

update creneaux
set default_unit_price_cents = case audience
  when 'enfants' then 3500
  else 4500
end
where kind = 'atelier'
  and default_unit_price_cents in (3000, 4000);

update sessions s
set unit_price_cents = c.default_unit_price_cents
from creneaux c
where c.id = s.creneau_id
  and c.kind = 'atelier'
  and s.unit_price_cents in (3000, 4000);
