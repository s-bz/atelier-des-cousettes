-- LE RAPPEL DISAIT LA RÈGLE, PAS L'URGENCE.
--
-- Il annonçait « vous pouvez libérer jusqu'à 10 jours avant la séance » — exact,
-- et parfaitement inutile à qui ne sait pas quel jour on est par rapport à la
-- séance. Or ce message part ONZE jours avant : il reste donc une journée, et
-- une seule, pour décider. C'est le seul chiffre qui compte au moment où on le
-- lit, et c'était celui qui manquait.
--
-- Le sujet le dit aussi : « Séance {{date}} » ne se distinguait pas des autres
-- avis dans une boîte aux lettres, alors que celui-ci demande une décision.

update email_templates
   set subject = 'Séance {{date}} — dernier jour pour changer',
       body = E'Bonjour,\n\n{{prenom}} a atelier {{date}}, de {{heure_debut}} à {{heure_fin}}, à {{lieu}}.\n\nUn empêchement ? C''est aujourd''hui ou demain qu''il faut le dire : une place se libère jusqu''à dix jours avant la séance, et ce message vous parvient onze jours avant. Libérée à temps, la séance vous reste acquise et vous en choisissez une autre — passé ce délai, la place repart aux autres et la séance est décomptée.\n\n    {{lien_planning}}\n\nVous pouvez aussi simplement répondre à ce message.\n\nÀ bientôt,\nL''Atelier des Cousettes'
 where id = 'rappel';
