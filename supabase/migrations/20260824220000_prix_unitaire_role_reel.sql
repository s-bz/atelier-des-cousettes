-- Ce que `default_unit_price_cents` fait vraiment, depuis la table des formules.
--
-- Aucune donnée ne change ici : seuls les commentaires, qui décrivent désormais
-- un comportement que la migration précédente a modifié sous eux.
--
-- CE QU'ILS DISAIENT ENCORE. `creneaux.a_l_unite` porte, depuis ce matin :
-- « default_unit_price_cents continue de facturer les seances depassant un
-- forfait ». C'était la justification de garder 35 € sur les ateliers ados et
-- enfants alors qu'on ne les vend plus à la séance — un montant qui ne
-- s'affiche plus mais qui facture encore.
--
-- Ce n'est plus vrai. 20260824200000 a fait passer le dépassement au PRIX
-- DIVISÉ DE LA FORMULE : 36 € pour un adulte au forfait de 9 séances, 21,25 €
-- pour un enfant. `extra_sessions` ne retombe sur le prix de la séance que
-- lorsque l'abonnement ne désigne aucune formule — les lignes saisies avant
-- que cette table existe.
--
-- CE QUE LE MONTANT VAUT DONC AUJOURD'HUI, créneau par créneau :
--
--   • un STAGE : son prix, tel qu'on le paie. Inchangé.
--   • un atelier `a_l_unite` : le prix d'une séance sans engagement, affiché et
--     encaissé. Inchangé.
--   • un atelier qui ne se vend PAS à l'unité — ados, enfants, Verdalle : plus
--     rien, sinon le repli ci-dessus. Ni affiché, ni facturé dès lors que
--     l'abonnement a sa formule.
--
-- ON NE LE MET PAS À ZÉRO pour autant. La colonne est `not null`, le repli s'en
-- sert encore, et un zéro se lirait « gratuit » partout où un filtre viendrait
-- à manquer. Un montant inutilisé se documente ; il ne se remplace pas par un
-- montant faux.

comment on column creneaux.default_unit_price_cents is
  'Prix d''UNE seance ou d''UN stage. Pour un stage, son prix. Pour un atelier '
  'vendu a l''unite, le tarif d''une seance sans engagement. Pour un atelier '
  'qui ne se vend pas a l''unite, ce montant ne sert plus qu''a facturer un '
  'depassement dont l''abonnement ne designe aucune formule — depuis la table '
  'formules, un depassement se facture au prix divise du forfait achete.';

comment on column creneaux.a_l_unite is
  'On peut y venir une fois, sans forfait. Faux : le creneau disparait de la '
  'page des seances sans engagement, et son default_unit_price_cents ne sert '
  'plus qu''au repli d''extra_sessions pour un abonnement sans formule.';

comment on column sessions.unit_price_cents is
  'Prix de CETTE seance, recopie du creneau a la creation. Facture une seance '
  'sans engagement ; ne facture un depassement de forfait que si l''abonnement '
  'ne designe aucune formule.';
