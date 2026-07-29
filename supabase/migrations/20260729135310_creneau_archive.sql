-- Archivage d'un créneau.
--
-- Supprimer et archiver répondent à deux besoins distincts, et les confondre
-- fait perdre des données :
--
--   • un créneau créé par erreur doit pouvoir disparaître ;
--   • un créneau qui ne tourne plus — un groupe qui s'arrête en fin de saison —
--     doit cesser d'être proposé SANS effacer les séances passées, les
--     présences et les abonnements qui le référencent.
--
-- La suppression pure reste possible tant que rien ne pointe vers le créneau ;
-- au-delà, les clés étrangères de sessions et subscriptions l'interdisent, et
-- c'est très bien ainsi. L'archivage prend le relais.
alter table creneaux add column archived_at timestamptz;

comment on column creneaux.archived_at is
  'Non nul : le creneau ne figure plus dans les listes de creation, mais tout '
  'son historique reste intact et consultable.';

-- Les écrans filtrent sur cette colonne ; l'index évite d'y penser plus tard.
create index creneaux_actifs on creneaux (archived_at) where archived_at is null;
