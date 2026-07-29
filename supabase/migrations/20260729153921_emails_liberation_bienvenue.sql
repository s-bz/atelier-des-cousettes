-- Deux messages qui manquaient.
--
-- « liberation » : réserver envoyait une confirmation, libérer n'envoyait rien.
-- On cliquait « je n'y vais pas » et plus rien ne venait le confirmer — or
-- c'est justement le geste après lequel on se demande si on a bien prévenu.
--
-- « bienvenue » : une personne inscrite par Isabelle découvrait l'existence de
-- son espace par hasard, ou jamais. Le message porte la liste des séances déjà
-- retenues pour elle, et dit comment en changer.
--
-- on conflict do nothing : la migration doit pouvoir être rejouée sans écraser
-- un texte qu'Isabelle aurait retouché entre-temps.

insert into email_templates (id, label, description, subject, body, variables) values

('liberation',
 'Place libérée',
 'Envoyé lorsqu''une personne libère sa place depuis son espace.',
 'Place libérée — {{date}}',
 'Bonjour,

C''est noté : {{prenom}} ne viendra pas à l''atelier du {{date}}, de
{{heure_debut}} à {{heure_fin}}, à {{lieu}}.

La séance revient à votre solde — vous ne perdez rien — et la place est de
nouveau proposée aux autres adhérents.

Pour choisir une autre date :

{{lien}}

À bientôt,
L''Atelier des Cousettes',
 array['prenom','date','heure_debut','heure_fin','lieu','lien']),

('bienvenue',
 'Bienvenue — accès à l''espace adhérent',
 'Envoyé à l''inscription, avec la liste des séances retenues. Ses variables ne sont pas celles des autres messages.',
 'Bienvenue à L''Atelier des Cousettes',
 'Bonjour,

L''inscription de {{prenom}} est enregistrée : {{creneau}}, {{solde}} séances
pour la saison.

Ces {{nombre_seances}} dates sont déjà retenues :

{{seances}}

Rien n''est figé. Depuis votre espace, vous pouvez libérer une date en cas
d''empêchement — la séance vous reste acquise et revient à votre solde — puis
en réserver une autre, y compris sur un autre créneau.

{{lien}}

Pour vous connecter, indiquez cette adresse e-mail : un code vous sera envoyé.
Aucun mot de passe à retenir.

Un rappel vous parviendra deux jours avant chaque séance.

À très bientôt,
L''Atelier des Cousettes',
 array['prenom','creneau','solde','nombre_seances','seances','lien'])

on conflict (id) do nothing;
