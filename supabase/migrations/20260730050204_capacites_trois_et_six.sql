-- Trois places par atelier, six par stage.
--
-- Le 6 partout était une valeur inventée faute de mieux, jamais confirmée.
-- Isabelle a tranché : un atelier régulier accueille trois personnes — elle
-- accompagne chacune sur son propre projet — un stage six, le sujet y étant
-- commun.
--
-- La capacité n'est pas un affichage : c'est elle qui refuse la quatrième
-- réservation. La laisser à 6 aurait rempli les séances au-delà de ce
-- qu'Isabelle peut suivre, et le système l'aurait accepté sans rien dire.

update creneaux set default_capacity = 3 where kind = 'atelier';

-- Déjà 6 pour tous les stages : la ligne inscrit la décision dans l'historique
-- plutôt que de la laisser reposer sur une valeur qui se trouvait juste.
update creneaux set default_capacity = 6 where kind = 'stage';

-- Les séances DÉJÀ PROGRAMMÉES et pas encore commencées suivent.
--
-- La condition sur le nombre de réservations reproduit le garde-fou de
-- set_session_capacity : on ne descend jamais la capacité sous le nombre de
-- places déjà prises. Le système ne choisit pas qui exclure — et une séance qui
-- resterait à 6 se verra dans l'écran des séances, là où une exclusion
-- silencieuse ne se verrait nulle part.
--
-- Les séances passées gardent leur capacité : elles disent combien de places il
-- y avait, ce qui est un fait et non un réglage.
update sessions se
   set capacity = 3
 where se.starts_at > now()
   and se.capacity <> 3
   and exists (select 1 from creneaux c where c.id = se.creneau_id and c.kind = 'atelier')
   and (select count(*) from bookings b
         where b.session_id = se.id and b.status = 'booked') <= 3;
