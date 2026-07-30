-- Le message annonçant qu'une séance change de date.
--
-- Déplacer une séance n'envoyait rien. Les inscrits gardaient leur place à la
-- nouvelle date sans en être avertis : au mieux ils l'apprenaient par le rappel
-- à trois jours, au pire ils se présentaient à l'ancienne. C'était le seul geste
-- d'Isabelle modifiant l'agenda de quelqu'un en silence.
--
-- Seul gabarit à porter DEUX dates. Sans l'ancienne, le message dirait « votre
-- séance a lieu le 12 mars » sans dire laquelle a bougé — or on peut en avoir
-- trois au calendrier, et c'est justement celle qu'on avait notée qu'il faut
-- pouvoir corriger.

insert into email_templates (id, label, description, subject, body, variables) values
('deplacement',
 'Séance déplacée',
 'Envoyé à chaque personne inscrite lorsque vous déplacez une séance. Il rappelle l''ancienne date en plus de la nouvelle.',
 'Changement de date — {{date_avant}} devient {{date}}',
 'Bonjour,

La séance du {{date_avant}} est déplacée.

Elle a désormais lieu le {{date}}, de {{heure_debut}} à {{heure_fin}}, à {{lieu}}.

{{prenom}} y garde sa place : il n''y a rien à refaire, et rien n''a été
décompté en plus.

Si cette nouvelle date ne convient pas, libérez la place depuis votre espace et
choisissez-en une autre :

{{lien_planning}}

Avec mes excuses pour le changement,
L''Atelier des Cousettes',
 array['prenom','date_avant','heure_avant','date','heure_debut','heure_fin','lieu','lien_planning','lien_espace'])
on conflict (id) do nothing;
