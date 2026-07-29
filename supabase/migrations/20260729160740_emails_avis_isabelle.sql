-- Les trois messages destinés à Isabelle.
--
-- Jusqu'ici elle n'apprenait un mouvement qu'en ouvrant l'application : une
-- place libérée le mardi pour le jeudi pouvait rester inconnue jusqu'au jeudi,
-- alors que c'est précisément le délai pendant lequel elle aurait pu la
-- proposer à quelqu'un.
--
-- Seuls les gestes des adhérents déclenchent un avis. Ses propres ajouts et
-- retraits depuis la feuille de présence, et l'inscription d'office de la nuit,
-- n'en envoient aucun : se faire notifier de ce qu'on vient de faire soi-même
-- apprend surtout à ignorer ses notifications.

insert into email_templates (id, label, description, subject, body, variables) values

('admin_reservation',
 'Pour vous — une place réservée',
 'Vous prévient lorsqu''un adhérent réserve une place depuis son espace. Ses propres inscriptions d''office n''en envoient pas.',
 'Réservation : {{participant}} — {{date}}',
 'Bonjour Isabelle,

{{participant}} vient de réserver une place.

- {{date}}, de {{heure_debut}} à {{heure_fin}}, à {{lieu}}
- {{creneau}}
- Occupation : {{places}}

{{lien_planning}}

L''Atelier des Cousettes',
 array['participant','date','heure_debut','heure_fin','lieu','creneau','places','restantes','lien_planning','lien_espace']),

('admin_liberation',
 'Pour vous — une place libérée',
 'Vous prévient lorsqu''un adhérent libère sa place. C''est le message qui vous laisse le temps de proposer la place à quelqu''un d''autre.',
 'Place libérée : {{participant}} — {{date}}',
 'Bonjour Isabelle,

{{participant}} ne viendra pas.

- {{date}}, de {{heure_debut}} à {{heure_fin}}, à {{lieu}}
- {{creneau}}
- Occupation : {{places}}, soit {{restantes}} place(s) libre(s)

La séance lui reste acquise : elle est revenue à son solde, et la place est de
nouveau proposée aux autres adhérents.

{{lien_planning}}

L''Atelier des Cousettes',
 array['participant','date','heure_debut','heure_fin','lieu','creneau','places','restantes','lien_planning','lien_espace']),

('admin_semaine',
 'Pour vous — la semaine qui vient',
 'Récapitulatif envoyé le dimanche matin : les séances des sept jours suivants, avec les inscrits de chacune.',
 'La semaine {{periode}}',
 'Bonjour Isabelle,

Voici la semaine {{periode}} : {{nombre_seances}} séance(s), {{nombre_inscrits}}
inscription(s) au total.

{{seances}}

{{alerte}}

{{lien_espace}}

Bonne semaine,
L''Atelier des Cousettes',
 array['periode','nombre_seances','nombre_inscrits','seances','alerte','lien_planning','lien_espace'])

on conflict (id) do nothing;
