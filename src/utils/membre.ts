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
    .select('id, first_name, last_name, audience')
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

/**
 * Libère une place, après avoir vérifié qu'elle appartient bien à la personne.
 *
 * LA VÉRIFICATION EST ICI, et non déléguée à release_booking. Les écrans membre
 * appellent la base avec la clé secrète, laquelle contourne le RLS — et donc
 * aussi le contrôle interne de la fonction, qui ne se déclenche que pour le
 * rôle « authenticated ». Sans ce garde-fou, publier un identifiant de
 * réservation quelconque libérerait la place de n'importe qui.
 *
 * Fonction partagée plutôt que recopiée dans chaque écran : un contrôle
 * d'appartenance dupliqué est un contrôle qu'on oubliera dans la deuxième
 * copie.
 */
export async function libererPlace(
  reservationId: string,
  participantId: string,
): Promise<{ ok: boolean; message: string }> {
  const supabase = getAdminClient();

  const { data: cible } = await supabase
    .from('bookings')
    .select('participant_id')
    .eq('id', reservationId)
    .maybeSingle();

  if (!cible || cible.participant_id !== participantId) {
    return { ok: false, message: 'Cette réservation ne vous appartient pas.' };
  }

  const { error } = await supabase.rpc('release_booking', { p_booking: reservationId });
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: 'Place libérée. La séance revient à votre solde.' };
}

export const dateLongue = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris',
});

export const heure = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
});
