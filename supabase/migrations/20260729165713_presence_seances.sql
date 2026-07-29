-- Présence effective à une séance.
--
-- Rien n'enregistrait qui était réellement venu. Le solde ne le demande pas —
-- une place gardée est décomptée qu'on vienne ou non (SPEC §5) — mais Isabelle,
-- si : c'est ce qui lui permet de rappeler quelqu'un qui manque trois séances
-- de suite, ou de décider d'un geste après un empêchement réel.
--
-- TROIS ÉTATS, et non un booléen. « Non noté » n'est pas « absent » : Isabelle
-- ne remplira pas la feuille tous les jours, et un booléen par défaut à faux
-- fabriquerait des absents qui étaient là. La colonne est donc nullable, et
-- l'écran distingue les trois cas.
--
-- Ceci N'AFFECTE PAS le solde, à dessein. Noter une absence constate un fait ;
-- rendre la séance est une décision, prise séparément depuis la fiche de la
-- personne. Confondre les deux ferait d'un geste d'écriture un geste comptable.
alter table bookings
  add column attendance text
    check (attendance in ('present', 'absent')),
  add column attendance_at timestamptz;

comment on column bookings.attendance is
  'Presence constatee : present, absent, ou null si non note. N''a aucun effet '
  'sur le solde — une place gardee est decomptee qu''on vienne ou non. Rendre '
  'la seance est une decision distincte, prise depuis la fiche du participant.';

-- Retrouver les absences d'une personne sans balayer toutes ses réservations.
create index bookings_participant_attendance
  on bookings (participant_id, attendance)
  where attendance is not null;
