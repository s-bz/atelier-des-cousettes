-- CE QU'ISABELLE FAIT DEPUIS L'ADMINISTRATION NE PRÉVENAIT PERSONNE.
--
-- L'adhérent qui réserve reçoit « Place réservée » ; celui qui se désiste
-- reçoit « Place libérée ». Isabelle, elle, inscrit et libère depuis la fiche
-- d'une séance — et l'écran appelle `book_participant` et `release_booking`
-- directement, sans passer par le chemin qui prévient. Le geste le plus
-- courant de l'atelier était donc le seul muet.
--
-- Découvert en replaçant quelqu'un d'une date de stage sur une autre : elle n'a
-- rien reçu de la première, rien de la seconde, et n'avait aucun moyen de
-- savoir que sa date avait changé.
--
-- DEUX GABARITS DE PLUS, PARCE QU'UN STAGE N'EST PAS UN ATELIER. Les textes
-- existants parlent de solde — « la séance revient à votre solde », « vous
-- pouvez libérer une place jusqu'à 10 jours avant » — ce qui est vrai d'une
-- séance d'atelier et faux d'un stage, vendu à la date et réglé d'avance.
-- Les envoyer pour un stage promettrait un crédit qui n'existe pas.

insert into email_templates (id, label, description, subject, body, variables) values
(
  'stage_place',
  'Place sur un stage — inscription',
  'Part à l''adhérent quand Isabelle l''inscrit à une date de stage depuis l''administration. Distinct de « Place réservée », qui parle du solde et du délai de dix jours : un stage n''a ni l''un ni l''autre.',
  'Inscription au stage — {{date}}',
  E'Bonjour,\n\n{{prenom}} est inscrit au {{creneau}}, le {{date}}, de {{heure_debut}} à {{heure_fin}}, à {{lieu}}.\n\nVous retrouverez cette date dans votre espace :\n\n    {{lien_espace}}\n\nUn empêchement ? Répondez simplement à ce message.\n\nÀ bientôt,\nL''Atelier des Cousettes',
  '{prenom,creneau,date,heure_debut,heure_fin,lieu,lien_espace,lien_planning}'
),
(
  'stage_liberee',
  'Place sur un stage — libérée',
  'Part à l''adhérent quand sa place sur un stage est libérée depuis l''administration. Ne promet AUCUN crédit : un stage se règle à la date, et ce qui a été payé se replace ou se rembourse — cela se décide avec Isabelle, pas par un solde.',
  'Place libérée sur le stage — {{date}}',
  E'Bonjour,\n\nC''est noté : {{prenom}} ne participera pas au {{creneau}} du {{date}}, de {{heure_debut}} à {{heure_fin}}, à {{lieu}}.\n\nSi cette place avait été réglée, elle ne se perd pas : écrivez-nous et nous la reportons sur une autre date du même stage, ou nous vous la remboursons.\n\n    {{lien_espace}}\n\nÀ bientôt,\nL''Atelier des Cousettes',
  '{prenom,creneau,date,heure_debut,heure_fin,lieu,lien_espace,lien_planning}'
);
