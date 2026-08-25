-- LE NOM DU PAYEUR, GARDÉ SUR SON COMPTE.
--
-- `accounts` ne portait qu'une adresse. Le nom de qui règle n'existait donc
-- nulle part : il était saisi sur la page de paiement, transmis à HelloAsso,
-- renvoyé dans la commande — et jeté. À l'achat suivant, la même personne le
-- resaisissait, et l'espace d'administration n'avait aucun moyen de savoir à
-- qui appartenait un foyer autrement que par son adresse électronique.
--
-- IL NOUS REVIENT POURTANT À CHAQUE COMMANDE, dans `order.payer`. On le garde,
-- et le formulaire le repropose — modifiable, car c'est le nom du porteur de
-- la carte et il peut changer d'une fois sur l'autre.
--
-- CE N'EST PAS LE NOM D'UN PARTICIPANT. Celui-là vit dans `participants` et
-- peut être celui d'un enfant. Les deux se ressemblent souvent et ne sont pas
-- la même chose : les confondre est précisément ce qui a fait naître un second
-- dossier au même foyer lors du premier achat réel — « Sam Test Usage » à côté
-- de « Sam Bultez », et la séance payée au nouveau venu.

alter table accounts
  add column payeur_prenom text,
  add column payeur_nom    text;

comment on column accounts.payeur_prenom is
  'Prenom de qui regle, tel qu''il figurait sur la derniere commande HelloAsso. '
  'Distinct du prenom d''un participant : le payeur peut inscrire un enfant.';

comment on column accounts.payeur_nom is
  'Nom de qui regle. Voir payeur_prenom.';
