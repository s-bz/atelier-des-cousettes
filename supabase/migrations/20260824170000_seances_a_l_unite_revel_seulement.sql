-- La séance sans engagement ne se prend plus qu'à Revel.
--
-- Verdalle est l'atelier privé d'Isabelle, et son créneau n'a aucune date au
-- programme cette saison : il paraissait donc sur la page des séances sans
-- engagement comme une carte vide, « aucune date programmée pour l'instant ».
-- Une formule qu'on propose sans pouvoir la dater n'est pas une offre, c'est
-- une invitation à écrire — et cette invitation a déjà sa place sur la page des
-- ateliers réguliers, où le créneau reste affiché « sur demande ».
--
-- LE CRÉNEAU N'EST NI ARCHIVÉ NI SUPPRIMÉ. Il continue d'exister, de figurer
-- parmi les ateliers réguliers et d'accueillir un forfait le jour où des dates
-- s'ouvrent. Seul son mode de vente change : `a_l_unite` passe à faux, ce qui
-- est exactement ce que cette colonne sert à dire.
--
-- Écrit sur le LIEU et non sur l'identifiant : si un autre créneau naît un jour
-- à Verdalle, la règle qui vaut ici — on n'y vend pas à la séance — devra valoir
-- pour lui aussi, et celui qui l'ajoutera lira cette ligne.
update creneaux
   set a_l_unite = false
 where default_location = 'Verdalle'
   and a_l_unite;
