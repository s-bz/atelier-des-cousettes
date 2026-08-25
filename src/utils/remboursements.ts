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

  const [{ data: abonnements }, { data: places }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('helloasso_order_id')
      .not('helloasso_order_id', 'is', null)
      .gte('ends_on', new Date().toISOString().slice(0, 10)),
    supabase
      .from('bookings')
      .select('helloasso_order_id')
      .not('helloasso_order_id', 'is', null)
      .eq('status', 'booked'),
  ]);

  // Une place offerte n'a pas de commande chez HelloAsso : l'interroger
  // rendrait un 404 par nuit, pour rien.
  const commandes = [...new Set([
    ...(abonnements ?? []).map((a) => a.helloasso_order_id as string),
    ...(places ?? []).map((b) => b.helloasso_order_id as string),
  ])].filter((c) => c && !c.startsWith('GRATUIT-'));

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
