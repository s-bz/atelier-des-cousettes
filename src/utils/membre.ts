import { getAdminClient } from './supabase';

/**
 * Personnes rattachées à un compte, et personne sélectionnée.
 *
 * Le compte se connecte, la personne vient à l'atelier. Un adulte ordinaire
 * n'a qu'une personne : l'interface ne doit alors jamais montrer la notion.
 * C'est seulement au-delà — une mère et ses filles — qu'un sélecteur apparaît.
 *
 * La lecture passe par la clé secrète et non par la session : les écrans
 * membre n'appellent la base qu'à travers cette fonction, et la restriction au
 * compte courant y est explicite. Le RLS reste la défense de fond, ce filtre
 * est la défense de surface.
 */
export async function participantsDuCompte(accountId: string, demande?: string | null) {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from('participants')
    .select('id, first_name, last_name')
    .eq('account_id', accountId)
    .order('first_name');

  const personnes = data ?? [];

  // Une demande portant sur une personne d'un autre compte est ignorée, pas
  // rejetée bruyamment : l'URL peut être vieille ou bricolée, dans les deux cas
  // le comportement sûr est de retomber sur la première personne du compte.
  const choisie =
    personnes.find((p) => p.id === demande) ?? personnes[0] ?? null;

  return { personnes, choisie };
}

/** Solde, octroi et consommation d'une personne, à aujourd'hui. */
export async function soldeDe(participantId: string) {
  const supabase = getAdminClient();
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const [{ data: solde }, { data: octroye }, { data: consomme }] = await Promise.all([
    supabase.rpc('balance', { p_participant: participantId, p_at: aujourdhui }),
    supabase.rpc('granted_credits', { p_participant: participantId, p_at: aujourdhui }),
    supabase.rpc('consumed_credits', { p_participant: participantId }),
  ]);

  return {
    solde: (solde as number) ?? 0,
    octroye: (octroye as number) ?? 0,
    consomme: (consomme as number) ?? 0,
  };
}

export const dateLongue = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris',
});

export const heure = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
});
