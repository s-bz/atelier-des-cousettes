-- Les e-mails annoncent le délai d'annulation.
--
-- La règle des 48 h était appliquée sans avoir jamais été écrite : la
-- confirmation invitait à « libérer la place » sans dire qu'au-delà d'un
-- certain délai la séance reste due. On l'aurait découverte à la facturation —
-- la pire façon d'apprendre une règle, et la plus difficile à défendre.
--
-- MODIFICATIONS CHIRURGICALES, par replace() sur un passage précis. Ces textes
-- sont ceux d'Isabelle et elle les retouche depuis l'écran Messages : deux
-- l'ont déjà été. Réécrire un corps entier effacerait son travail sans qu'elle
-- s'en aperçoive.

-- Confirmation : le délai, après l'invitation à libérer.
update email_templates
   set body = body || '

Vous pouvez libérer une place jusqu''à 48 h avant la séance : elle vous reste
acquise. Passé ce délai, la place repart aux autres adhérents mais la séance
reste due.',
       updated_at = now()
 where id = 'confirmation'
   and body not like '%48 h%';

-- Rappel : il part trois jours avant, il reste donc une journée pour décider.
-- On le dit sans arithmétique — « 48 h avant la séance » se vérifie d'un coup
-- d'œil sur un calendrier, « dans 24 h » demande de savoir quand on lit.
update email_templates
   set body = replace(
         body,
         'Une place libérée revient à votre solde ; une place gardée sans venir est décomptée, car personne d''autre n''a pu la prendre.',
         'Vous pouvez libérer jusqu''à 48 h avant la séance : elle vous reste alors acquise. Ensuite la place repart aux autres, mais la séance est décomptée — à si peu de jours, elle trouve rarement preneur.'),
       updated_at = now()
 where id = 'rappel'
   and body like '%Une place libérée revient à votre solde%';

-- Bienvenue : le rappel part à trois jours désormais, et le délai s'annonce.
update email_templates
   set body = replace(
         body,
         'Un rappel vous parviendra deux jours avant chaque séance.',
         'Une seule règle : libérez au plus tard 48 h avant la séance. Ensuite la place repart aux autres, mais la séance reste due.

Un rappel vous parviendra trois jours avant chaque séance, il vous restera donc une journée pour décider.'),
       updated_at = now()
 where id = 'bienvenue'
   and body like '%deux jours avant chaque séance%';


-- Le message d'après-désistement quand la séance N'EST PAS rendue.
--
-- Le gabarit « liberation » affirme « la séance revient à votre solde », ce qui
-- est faux passé le délai. Un second gabarit plutôt qu'une phrase
-- conditionnelle : un texte qui dirait tantôt une chose tantôt son contraire
-- serait inéditable, Isabelle ne sachant pas laquelle des deux versions elle
-- corrige.
insert into email_templates (id, label, description, subject, body, variables) values
('liberation_tardive',
 'Place libérée trop tard',
 'Remplace le message habituel quand la place est rendue à moins de 48 h de la séance : elle repart aux autres, mais la séance reste due.',
 'Place libérée — {{date}}',
 'Bonjour,

C''est noté : {{prenom}} ne viendra pas à l''atelier du {{date}}, de
{{heure_debut}} à {{heure_fin}}, à {{lieu}}. La place est de nouveau proposée
aux autres adhérents.

Le désistement arrivant à moins de 48 h de la séance, celle-ci reste due : elle
ne revient pas à votre solde. À si peu de jours, une place rendue trouve
rarement preneur.

Un imprévu sérieux ? Répondez simplement à ce message.

{{lien_planning}}

À bientôt,
L''Atelier des Cousettes',
 array['prenom','date','heure_debut','heure_fin','lieu','lien_planning','lien_espace'])
on conflict (id) do nothing;
