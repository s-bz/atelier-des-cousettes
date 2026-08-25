-- UNE COMMANDE, UN COURRIEL — ET UNE SEULE MESURE.
--
-- Le premier stage vendu a produit DEUX courriels de confirmation, à la même
-- seconde. Trois chemins mènent à un encaissement, et deux d'entre eux se
-- produisent pour la même commande : le retour du payeur et la notification
-- HelloAsso. Ils sont arrivés à 08:42:09 et 08:42:11.
--
-- CE QUI DEVAIT LES DÉPARTAGER N'A PAS JOUÉ. Sur un forfait, le second passage
-- bute sur l'unicité de `subscriptions.helloasso_order_id` : l'insertion
-- échoue, le provisionnement rend un échec, et rien ne part. Sur une place à
-- l'unité, `book_participant` est délibérément idempotente — elle REND la place
-- déjà posée au lieu de refuser, pour qu'une commande rejouée sur une séance
-- devenue complète retrouve la sienne. Les deux passages ont donc réussi, et
-- les deux ont annoncé.
--
-- Le même défaut comptait la vente deux fois : `cree` valait vrai des deux
-- côtés, et `achat_abouti` partait en double vers la mesure d'audience.
--
-- LA PIERRE POSÉE ICI EST CE QUI MANQUAIT : un passage, et un seul, peut
-- estampiller la réservation. Celui qui y parvient annonce et mesure ; l'autre
-- se tait. C'est la base qui tranche, comme partout ailleurs — l'ordre
-- d'arrivée ne décide de rien.

alter table bookings add column annonce_le timestamptz;

comment on column bookings.annonce_le is
  'Quand la confirmation d''achat est partie. Sert de jeton : le passage qui '
  'estampille est celui qui annonce et qui mesure, les autres se taisent. '
  'Nul pour les places posees autrement qu''en payant.';

/**
 * Réclame le droit d'annoncer cette place. Vrai une seule fois.
 *
 * `update … where annonce_le is null` en une seule instruction : deux passages
 * simultanés se sérialisent sur la ligne, et le second voit la colonne remplie.
 * Le faire en deux temps — lire puis écrire — rouvrirait la fenêtre que ce
 * correctif ferme.
 */
create or replace function public.reclamer_annonce(p_booking uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_fait boolean;
begin
  update bookings set annonce_le = now()
   where id = p_booking and annonce_le is null;

  get diagnostics v_fait = row_count;
  return v_fait;
end;
$function$;

-- Un adhérent n'a rien à réclamer : l'annonce est un geste du serveur.
revoke execute on function reclamer_annonce(uuid) from public, anon, authenticated;
grant  execute on function reclamer_annonce(uuid) to service_role;
