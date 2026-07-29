-- Numéro de téléphone, porté par la personne et non par le compte.
--
-- Une colonne `phone` existait sur accounts, jamais renseignée par aucun écran.
-- C'était le mauvais endroit : les personnes qu'Isabelle a le plus besoin
-- d'appeler sont précisément celles qui n'ont PAS de compte — elles ne
-- reçoivent aucun e-mail, le téléphone est le seul canal. Un numéro rangé sur
-- le compte aurait donc été indisponible pour tout le monde qui en a besoin.
--
-- Sur participants, il est toujours accessible, y compris pour une personne
-- sans accès au site. Un même parent peut d'ailleurs vouloir un contact
-- différent selon l'enfant.
alter table participants add column phone text;

-- La colonne sur accounts n'a jamais servi et ne servira pas : deux endroits
-- où chercher un numéro, c'est un de trop.
alter table accounts drop column phone;
