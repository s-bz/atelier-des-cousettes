-- Gabarits d'e-mails, modifiables par Isabelle.
--
-- Le texte de ces messages est le sien : c'est elle qui parle à ses adhérents,
-- et elle doit pouvoir changer un mot sans passer par un développeur. Les
-- gabarits vivent donc en base, pas dans le code.
--
-- `variables` documente ce qui est disponible, à afficher dans l'écran
-- d'édition : un gabarit modifiable dont on ignore les variables est un piège.
create table email_templates (
  id          text primary key,
  label       text not null,
  description text not null,
  subject     text not null,
  body        text not null,
  variables   text[] not null default '{}',
  updated_at  timestamptz not null default now()
);

alter table email_templates enable row level security;
-- Aucun accès adhérent : ces gabarits ne se lisent qu'avec la clé secrète,
-- depuis les écrans d'administration et le cron.
revoke all on email_templates from anon, authenticated;

comment on table email_templates is
  'Textes des e-mails du service. Le courriel de connexion n''y figure pas : '
  'il est emis par Supabase Auth et se modifie dans son tableau de bord.';

insert into email_templates (id, label, description, subject, body, variables) values

('rappel',
 'Rappel avant la séance',
 'Envoyé automatiquement deux jours avant chaque séance réservée.',
 'Séance {{date}}',
 'Bonjour,

{{prenom}} a atelier {{date}}, de {{heure_debut}} à {{heure_fin}}, à {{lieu}}.

En cas d''empêchement, libérez la place depuis votre espace : elle profitera à
quelqu''un d''autre et la séance vous restera acquise.

    {{lien}}

Une place libérée revient à votre solde ; une place gardée sans venir est
décomptée, car personne d''autre n''a pu la prendre.

Vous pouvez aussi simplement répondre à ce message.

À bientôt,
L''Atelier des Cousettes',
 array['prenom','date','heure_debut','heure_fin','lieu','lien']),

('annulation',
 'Séance annulée',
 'Envoyé à chaque personne inscrite lorsque vous annulez une séance.',
 'Séance annulée — {{date}}',
 'Bonjour,

La séance du {{date}} à {{heure_debut}}, à {{lieu}}, est annulée.

{{prenom}} y était inscrit. La séance est intégralement rendue : le solde est
inchangé, et une autre date peut être réservée dès maintenant.

    {{lien}}

Avec mes excuses pour le désagrément,
L''Atelier des Cousettes',
 array['prenom','date','heure_debut','heure_fin','lieu','lien']),

('confirmation',
 'Place réservée',
 'Envoyé lorsqu''une place est réservée depuis l''espace adhérent.',
 'Place réservée — {{date}}',
 'Bonjour,

{{prenom}} est inscrit à l''atelier du {{date}}, de {{heure_debut}} à
{{heure_fin}}, à {{lieu}}.

Un empêchement ? Libérez la place depuis votre espace, elle vous restera
acquise :

    {{lien}}

À bientôt,
L''Atelier des Cousettes',
 array['prenom','date','heure_debut','heure_fin','lieu','lien']);
