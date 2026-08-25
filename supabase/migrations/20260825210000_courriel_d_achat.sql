-- LE COURRIEL QUI MANQUAIT : celui de l'achat.
--
-- Treize gabarits existaient — réservation, libération, rappel, annulation —
-- et pas un seul pour le moment où l'argent change de mains. Un achat ne
-- déclenchait rien : ni pour l'acheteur, ni pour Isabelle.
--
-- HelloAsso envoie bien un reçu, mais il ne parle que du paiement. Il ne dit
-- ni quel créneau a été retenu, ni quelles dates ont été posées — c'est-à-dire
-- précisément ce que la personne vient d'acheter.
--
-- Les corps tiennent en une seule chaîne : deux littéraux `E'…'` adjacents ne
-- se concatènent pas comme deux littéraux ordinaires, et Postgres refuse.

insert into email_templates (id, label, description, subject, body, variables) values
(
  'achat',
  'Inscription confirmée — après un achat',
  'Part à l''acheteur dès que la commande est provisionnée. Liste les dates réellement posées : c''est la seule confirmation qui les donne, le reçu HelloAsso ne parlant que du paiement.',
  'Votre inscription est confirmée — {{produit}}',
  E'Bonjour,\n\nMerci ! L''inscription de {{prenom}} est enregistrée.\n\n    {{produit}}\n    {{montant}}\n\n{{dates}}\n\nVous retrouverez tout cela dans votre espace, où vos dates se modifient jusqu''à 10 jours avant chaque séance :\n\n    {{lien_espace}}\n\nÀ très bientôt à l''atelier.',
  '{prenom,produit,montant,dates,lien_espace}'
),
(
  'admin_achat',
  'Pour vous — une inscription payée',
  'Part à l''atelier au même moment. Porte le payeur et son adresse, que le courriel de l''acheteur n''a pas à répéter.',
  'Inscription payée — {{prenom}}, {{produit}}',
  E'{{payeur}} ({{courriel}}) vient d''inscrire {{prenom}}.\n\n    {{produit}}\n    {{montant}}\n    commande {{commande}}\n\n{{dates}}',
  '{payeur,courriel,prenom,produit,montant,commande,dates}'
);
