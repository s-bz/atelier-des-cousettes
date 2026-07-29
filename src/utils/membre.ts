import { getAdminClient } from './supabase';
import { notifier, notifierAdmin, variablesSeance, variablesAdmin } from './emails';

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
 *
 * L'ACCUSÉ DE RÉCEPTION EST ICI, pour la même raison. Réserver envoyait une
 * confirmation, libérer n'envoyait rien : on cliquait « je n'y vais pas » et
 * plus rien ne venait le confirmer. Or c'est précisément le geste qu'on veut
 * voir confirmé — celui après lequel on se demande si on a bien prévenu.
 * Le message part depuis la fonction partagée, donc depuis les deux écrans.
 */
export async function libererPlace(
  reservationId: string,
  participantId: string,
): Promise<{ ok: boolean; message: string }> {
  const supabase = getAdminClient();

  // Les détails sont lus AVANT la libération : release_booking pose une pierre
  // tombale sur la réservation, et relire ensuite donnerait une ligne libérée
  // dont on ne saurait plus décrire la séance.
  const { data: cible } = await supabase
    .from('bookings')
    .select(`
      participant_id,
      participants(first_name, last_name, accounts(email)),
      sessions(id, starts_at, ends_at, location, capacity, creneaux(label))
    `)
    .eq('id', reservationId)
    .maybeSingle();

  if (!cible || cible.participant_id !== participantId) {
    return { ok: false, message: 'Cette réservation ne vous appartient pas.' };
  }

  const { error } = await supabase.rpc('release_booking', { p_booking: reservationId });
  if (error) return { ok: false, message: error.message };

  const personne = (cible as any).participants;
  const seance = (cible as any).sessions;
  if (seance) {
    await notifier('liberation', personne?.accounts?.email, variablesSeance({
      prenom: personne?.first_name ?? '',
      starts_at: seance.starts_at,
      ends_at: seance.ends_at,
      location: seance.location,
    }));

    // Et Isabelle, pour qu'elle puisse proposer la place. C'est le seul avis
    // qui lui laisse un délai utile : sans lui, elle découvre le désistement
    // le jour même, quand plus personne ne peut prendre la place.
    //
    // L'occupation est comptée APRÈS la libération — celle qu'elle doit lire.
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', seance.id)
      .eq('status', 'booked');

    await notifierAdmin('admin_liberation', variablesAdmin({
      participant: `${personne?.first_name ?? ''} ${personne?.last_name ?? ''}`.trim(),
      starts_at: seance.starts_at,
      ends_at: seance.ends_at,
      location: seance.location,
      creneau: seance.creneaux?.label ?? null,
      occupees: count ?? 0,
      capacite: seance.capacity,
    }));
  }

  return { ok: true, message: 'Place libérée. La séance revient à votre solde.' };
}

export const dateLongue = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris',
});

export const heure = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
});
