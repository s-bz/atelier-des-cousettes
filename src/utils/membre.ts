import { getAdminClient } from './supabase';
import { notifier, notifierAdmin, variablesSeance, variablesStage, variablesAdmin } from './emails';

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
/**
 * Annonce une place libre à toute la liste d'attente.
 *
 * Partagée parce que la place peut être rendue de deux endroits — l'espace
 * adhérent et la feuille de présence d'Isabelle — et que l'annonce ne dépend
 * pas de qui a rendu la place. Recopiée, elle finirait par ne partir que d'un
 * des deux.
 *
 * Les envois sont séquentiels : une vingtaine d'adhérents au plus, et paralléliser
 * exposerait à la limite de débit de Resend pour ne gagner qu'une seconde.
 */
export async function previenLaListe(
  participants: string[],
  seance: { starts_at: string; ends_at: string; location: string },
): Promise<number> {
  if (participants.length === 0) return 0;

  const supabase = getAdminClient();
  const { data: gens } = await supabase
    .from('participants')
    .select('id, first_name, accounts(email)')
    .in('id', participants);

  let partis = 0;
  for (const p of (gens ?? []) as any[]) {
    const ok = await notifier('promotion_attente', p.accounts?.email, variablesSeance({
      prenom: p.first_name ?? '',
      starts_at: seance.starts_at,
      ends_at: seance.ends_at,
      location: seance.location,
    }));
    if (ok) partis++;
  }
  return partis;
}

/**
 * Libère une place, et prévient.
 *
 * PARTAGÉE AVEC L'ADMINISTRATION depuis qu'on a découvert que la fiche d'une
 * séance appelait `release_booking` toute seule : Isabelle libérait une place,
 * et l'adhérent n'apprenait rien. Le même geste doit produire le même courriel,
 * quel que soit celui des deux qui l'accomplit.
 *
 * `participantId` nul dit que c'est un geste d'administration : la place n'a
 * alors pas à appartenir à qui l'exécute, et Isabelle ne s'envoie pas à
 * elle-même l'avis de désistement qu'elle vient de provoquer.
 */
export async function libererPlace(
  reservationId: string,
  participantId: string | null,
): Promise<{ ok: boolean; message: string; tardif: boolean; prevenus: number; commande: string | null }> {
  const supabase = getAdminClient();

  // Les détails sont lus AVANT la libération : release_booking pose une pierre
  // tombale sur la réservation, et relire ensuite donnerait une ligne libérée
  // dont on ne saurait plus décrire la séance.
  const { data: cible } = await supabase
    .from('bookings')
    .select(`
      participant_id, helloasso_order_id,
      participants(first_name, last_name, accounts(email)),
      sessions(id, starts_at, ends_at, location, capacity, creneaux(label, kind))
    `)
    .eq('id', reservationId)
    .maybeSingle();

  if (!cible || (participantId !== null && cible.participant_id !== participantId)) {
    return { ok: false, message: 'Cette réservation ne vous appartient pas.', tardif: false, prevenus: 0, commande: null };
  }

  const { data: issue, error } = await supabase.rpc('release_booking', { p_booking: reservationId });
  if (error) {
    // Le texte de Postgres nomme la fonction et ses contraintes : il va au
    // journal, d'où Isabelle peut le lire, et non à l'écran de l'adhérent.
    console.error('[libererPlace] release_booking a refusé :', error.message);
    return { ok: false, message: 'La place n’a pas pu être libérée.', tardif: false, prevenus: 0, commande: null };
  }

  const tardif = Boolean((issue as any)?.tardif);
  const attente = ((issue as any)?.attente ?? []) as string[];

  const personne = (cible as any).participants;
  const seance = (cible as any).sessions;
  if (seance) {
    // UN STAGE NE PARLE PAS DE SOLDE. « La séance revient à votre solde » est
    // vrai d'une séance de forfait et faux d'un stage, vendu à la date et réglé
    // d'avance : le lui écrire promettrait un crédit qui n'existe pas.
    const details = {
      prenom: personne?.first_name ?? '',
      starts_at: seance.starts_at,
      ends_at: seance.ends_at,
      location: seance.location,
    };

    if (seance.creneaux?.kind === 'stage') {
      await notifier('stage_liberee', personne?.accounts?.email,
        variablesStage({ ...details, creneau: seance.creneaux?.label ?? 'stage' }));
    } else {
      // Deux gabarits, parce que les deux issues ne se ressemblent pas : l'un
      // annonce que la séance revient au solde, l'autre qu'elle reste due.
      await notifier(tardif ? 'liberation_tardive' : 'liberation',
        personne?.accounts?.email, variablesSeance(details));
    }

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

    // Deux avis, comme pour l'adhérent : celui d'un désistement dans les temps
    // annonce le retour au solde, celui d'un désistement tardif annonce que la
    // séance reste due. Envoyer le premier dans les deux cas ferait croire à
    // Isabelle que personne n'est décompté.
    // Pas d'avis à Isabelle quand c'est elle qui vient de libérer : elle a
    // l'écran sous les yeux, et l'atelier n'a pas à recevoir la copie de ses
    // propres gestes.
    if (participantId !== null) await notifierAdmin(tardif ? 'admin_liberation_tardive' : 'admin_liberation',
      variablesAdmin({
      participant: `${personne?.first_name ?? ''} ${personne?.last_name ?? ''}`.trim(),
      participant_id: participantId,
      starts_at: seance.starts_at,
      ends_at: seance.ends_at,
      location: seance.location,
      creneau: seance.creneaux?.label ?? null,
      occupees: count ?? 0,
      capacite: seance.capacity,
    }));
  }

  // TOUTE la liste d'attente est prévenue, et personne n'est inscrit d'office.
  // Promouvoir le premier présumerait de sa réponse : trois semaines après
  // s'être mis en attente, on peut avoir pris un autre engagement — et se
  // retrouver inscrit, donc décompté, à une séance qu'on ne peut plus faire.
  // La place part ainsi à qui la veut, plutôt qu'à qui s'est inscrit le plus tôt.
  let prevenus = 0;
  if (attente.length > 0 && seance) {
    prevenus = await previenLaListe(attente, seance);
  }

  return {
    ok: true,
    tardif,
    prevenus,
    /*
     * CE QUI A ÉTÉ RÉGLÉ NE DOIT PAS DISPARAÎTRE EN SILENCE.
     *
     * Un stage se paie à la date : libérer la place ne rend aucun crédit — le
     * solde d'un forfait n'a rien à voir — et l'argent reste chez nous sans
     * qu'aucun écran ne le rappelle. La commande remonte donc à l'appelant, qui
     * la met sous les yeux d'Isabelle : à replacer sur une autre date, ou à
     * rembourser.
     */
    commande: (cible as any).helloasso_order_id ?? null,
    // Le message dit ce qui vient de se passer, y compris quand ce n'est pas
    // la bonne nouvelle attendue : annoncer « la séance revient à votre solde »
    // après un désistement tardif serait faux, et la surprise viendrait à la
    // facturation.
    message: tardif
      ? 'Place libérée : elle est proposée aux autres. Mais à moins de 10 jours de la séance, '
        + 'celle-ci reste due — elle ne revient pas à votre solde.'
      : 'Place libérée. La séance revient à votre solde.',
  };
}

/**
 * Prévient l'adhérent qu'une place vient d'être posée à son nom.
 *
 * Écrit pour l'administration : quand quelqu'un réserve depuis son espace, il
 * sait qu'il vient de le faire ; quand Isabelle l'inscrit, il ne l'apprend que
 * s'il consulte l'écran. C'était le seul geste de l'atelier dont personne
 * n'était averti.
 *
 * UNE PLACE EN ATTENTE N'EST PAS UNE PLACE : rien ne part tant qu'elle n'est
 * pas acquise, sans quoi le message ferait organiser une journée autour d'une
 * séance à laquelle on n'est pas inscrit. La liste d'attente a son propre avis,
 * envoyé le jour où une place se libère.
 */
export async function annoncerInscription(bookingId: string): Promise<boolean> {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from('bookings')
    .select(`
      status,
      participants(first_name, accounts(email)),
      sessions(starts_at, ends_at, location, creneaux(label, kind))
    `)
    .eq('id', bookingId)
    .maybeSingle();

  const seance = (data as any)?.sessions;
  if (!data || data.status !== 'booked' || !seance) return false;

  const personne = (data as any).participants;
  const details = {
    prenom: personne?.first_name ?? '',
    starts_at: seance.starts_at,
    ends_at: seance.ends_at,
    location: seance.location,
  };

  // Le gabarit d'atelier promet un solde et un délai de dix jours : vrais d'une
  // séance de forfait, faux d'un stage réglé à la date.
  return seance.creneaux?.kind === 'stage'
    ? notifier('stage_place', personne?.accounts?.email,
        variablesStage({ ...details, creneau: seance.creneaux?.label ?? 'stage' }))
    : notifier('confirmation', personne?.accounts?.email, variablesSeance(details));
}

/**
 * Prévient qu'une date de stage vient d'être rendue.
 *
 * Séparée de `libererPlace` parce que les stages de plusieurs jours se libèrent
 * en bloc, par `release_stage` : la libération a déjà eu lieu quand on écrit.
 * La ligne, elle, survit — une réservation libérée n'est jamais supprimée —
 * et porte encore de quoi décrire la date.
 */
export async function annoncerLiberationDeStage(bookingId: string): Promise<boolean> {
  const supabase = getAdminClient();

  const { data } = await supabase
    .from('bookings')
    .select(`
      participants(first_name, accounts(email)),
      sessions(starts_at, ends_at, location, creneaux(label))
    `)
    .eq('id', bookingId)
    .maybeSingle();

  const seance = (data as any)?.sessions;
  if (!seance) return false;

  const personne = (data as any).participants;
  return notifier('stage_liberee', personne?.accounts?.email, variablesStage({
    prenom: personne?.first_name ?? '',
    creneau: seance.creneaux?.label ?? 'stage',
    starts_at: seance.starts_at,
    ends_at: seance.ends_at,
    location: seance.location,
  }));
}

/**
 * Les réservations d'une personne sur toutes les dates d'un stage.
 *
 * Sert aux stages de plusieurs jours, qu'on inscrit et libère en bloc :
 * `book_stage` et `release_stage` rendent un nombre, pas des identifiants, et
 * sans eux il n'y aurait personne à prévenir. Les dates se lisent donc à côté —
 * AVANT une libération, qui pose une pierre tombale sur chaque ligne.
 */
export async function placesDuStage(
  creneauId: string,
  participantId: string,
): Promise<string[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('bookings')
    .select('id, sessions!inner(creneau_id)')
    .eq('participant_id', participantId)
    .eq('status', 'booked')
    .eq('sessions.creneau_id', creneauId);

  return (data ?? []).map((b: any) => b.id as string);
}

export const dateLongue = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris',
});

export const heure = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
});
