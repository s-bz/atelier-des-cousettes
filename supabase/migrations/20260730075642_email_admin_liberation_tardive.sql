-- Deux messages qui manquaient autour du désistement tardif.
--
-- 1. « admin_liberation » annonce à Isabelle que « la séance est revenue à son
--    solde ». C'est faux passé le délai : elle croirait l'adhérent non
--    décompté, et ne penserait ni à la facturer ni à décider de l'en dispenser.
--
-- 2. Lever la retenue ne prévenait personne. L'adhérent avait reçu « la séance
--    reste due » ; rien ne lui disait ensuite le contraire. Il l'aurait
--    découvert en consultant son solde, si l'idée lui venait — un geste
--    généreux resté invisible est un geste perdu.

insert into email_templates (id, label, description, subject, body, variables) values

('admin_liberation_tardive',
 'Pour vous — une place libérée trop tard',
 'Remplace l''avis habituel quand la place est rendue à moins de 48 h : la séance reste due, et vous seule pouvez en dispenser.',
 'Désistement tardif : {{participant}} — {{date}}',
 'Bonjour Isabelle,

{{participant}} ne viendra pas, et s''est désisté à moins de 48 h de la séance.

- {{date}}, de {{heure_debut}} à {{heure_fin}}, à {{lieu}}
- {{creneau}}
- Occupation : {{places}}, soit {{restantes}} place(s) libre(s)

La place est de nouveau proposée aux autres, mais la séance LUI RESTE DUE : elle
n''est pas revenue à son solde, et figurera parmi les séances à facturer.

Si les circonstances le justifient, vous pouvez la lui rendre depuis sa fiche —
« Rendre malgré le délai ». Il en sera prévenu.

{{lien_fiche}}

L''Atelier des Cousettes',
 array['participant','date','heure_debut','heure_fin','lieu','creneau','places','restantes','lien_fiche','lien_planning','lien_espace']),

('retenue_levee',
 'Séance finalement rendue',
 'Envoyé à l''adhérent lorsque vous levez la retenue d''un désistement tardif : sans lui, votre geste resterait invisible.',
 'Votre séance du {{date}} vous est rendue',
 'Bonjour,

{{prenom}} s''était désisté tardivement de l''atelier du {{date}}, et la séance
lui avait été comptée.

Elle vient de lui être rendue : elle est de nouveau disponible sur son solde, et
peut servir pour une autre date.

{{lien_planning}}

À bientôt,
L''Atelier des Cousettes',
 array['prenom','date','heure_debut','heure_fin','lieu','lien_planning','lien_espace'])

on conflict (id) do nothing;
