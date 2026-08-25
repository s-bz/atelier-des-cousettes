import type { SupabaseClient } from '@supabase/supabase-js';
import { defaitsDeLaCommande } from './helloasso';

/**
 * Relève chez HelloAsso ce qui a été remboursé ou annulé, et le dépose.
 *
 * PARTAGÉ ENTRE LA NUIT ET LE BOUTON. La tâche quotidienne s'en sert, et
 * l'écran d'administration aussi — sans quoi les deux chemins finiraient par
 * répondre différemment à la même question, et c'est toujours celui qu'on
 * n'utilise pas qui se trompe.
 *
 * ON INTERROGE LES COMMANDES, PAS LA LISTE DES PAIEMENTS : celle-ci ne rend que
 * les paiements traités, et une échéance annulée n'y paraît jamais — mesuré le
 * 25/08/2026 sur neuf échéances passées à `Canceled`.
 *
 * ON DÉPOSE, ON N'AGIT PAS. Libérer les places de quelqu'un appartient à
 * Isabelle : le relevé ne fait que porter le fait à sa connaissance.
 */
export async function releverRemboursements(
  supabase: SupabaseClient,
): Promise<{ commandes: number; deposes: number; echecs: number }> {
  const bilan = { commandes: 0, deposes: 0, echecs: 0 };

  /*
   * TOUTES LES COMMANDES, QUEL QUE SOIT L'ÉTAT DE LA PLACE.
   *
   * Le premier tri ne gardait que les places encore réservées et les
   * abonnements en cours. Il a manqué un remboursement réel dès le premier
   * essai : la place avait été libérée la veille, sa commande sortait donc de
   * la liste, et le remboursement est resté invisible.
   *
   * Ce n'est pas qu'un manque d'information. Quelqu'un qui libère sa séance
   * récupère son crédit — puis se fait rembourser : sans ce relevé, il garde un
   * crédit pour une séance qu'on lui a rendue en argent.
   *
   * La liste est bornée par ce qui a DÉJÀ été traité, non par l'état des
   * places : une commande dont le remboursement est confirmé ne se réinterroge
   * plus, et la liste cesse donc de grandir.
   */
  const [{ data: abonnements }, { data: places }, { data: classees }] = await Promise.all([
    supabase.from('subscriptions').select('helloasso_order_id')
      .not('helloasso_order_id', 'is', null),
    supabase.from('bookings').select('helloasso_order_id')
      .not('helloasso_order_id', 'is', null),
    supabase.from('remboursements').select('commande').not('confirme_le', 'is', null),
  ]);

  const deja = new Set((classees ?? []).map((r) => r.commande as string));

  // Une place offerte n'a pas de commande chez HelloAsso : l'interroger
  // rendrait un 404 par nuit, pour rien.
  const commandes = [...new Set([
    ...(abonnements ?? []).map((a) => a.helloasso_order_id as string),
    ...(places ?? []).map((b) => b.helloasso_order_id as string),
  ])].filter((c) => c && !c.startsWith('GRATUIT-') && !deja.has(c));

  bilan.commandes = commandes.length;

  for (const commande of commandes) {
    const defaits = await defaitsDeLaCommande(commande);

    if (!defaits.ok) {
      console.error(`[remboursements] commande ${commande} illisible :`, defaits.erreur);
      bilan.echecs++;
      continue;
    }

    for (const p of defaits.valeur) {
      // `paiement` est unique : un dépôt déjà fait ne se refait pas, et le
      // relevé peut donc repasser autant qu'on veut sans dommage.
      const { error } = await supabase.from('remboursements').upsert(
        {
          commande: p.commandeId,
          paiement: p.paiementId,
          montant_cents: p.montantCents,
          etat: p.etat,
        },
        { onConflict: 'paiement', ignoreDuplicates: true },
      );

      if (error) {
        console.error(`[remboursements] paiement ${p.paiementId} non déposé :`, error.message);
        bilan.echecs++;
      } else {
        bilan.deposes++;
      }
    }
  }

  return bilan;
}
