import type { SupabaseClient } from '@supabase/supabase-js';
import type { Resultat } from './inscriptions';
import {
  trouverOuCreerCompte, creerParticipant, creerAbonnement,
  enregistrerAdhesion, inscrireDOffice, bornesSaison,
} from './inscriptions';

/**
 * De la commande payée aux lignes en base.
 *
 * UNE SEULE VOIE POUR DEUX CHEMINS. Le retour du payeur et la notification
 * HelloAsso font la même chose : on ferme des onglets après avoir payé, et une
 * notification se perd. Les deux appellent donc ce fichier, et le PRD §6 exige
 * qu'ils « écrivent exactement les mêmes lignes » — ce qui ne se tient qu'en
 * n'en ayant qu'un seul.
 *
 * RIEN N'EST JAMAIS SILENCIEUSEMENT IGNORÉ. Une commande qu'on ne sait pas
 * provisionner rend un échec motivé, que l'appelant range dans la file
 * « à traiter » avec sa charge utile brute. Quelqu'un qui a payé et qui
 * n'apparaît nulle part est le pire échec possible de ce système.
 */

const echec = (erreur: string): Resultat<never> => ({ ok: false, erreur });
const succes = <T>(valeur: T): Resultat<T> => ({ ok: true, valeur });

export interface Commande {
  orderId: string;
  email: string;
  prenom: string;
  nom: string;
  saison: string;
  formuleId: string;
  creneauId: string;
  adhesionCents: number;
}

/**
 * Ce que porte une intention payée, ou la raison de n'en rien faire.
 *
 * On ne devine aucun champ manquant. Un `formule_id` absent pourrait se
 * retrouver depuis le montant, un participant sans nom se remplacer par celui
 * du payeur — et l'on créerait un abonnement plausible et faux, bien plus
 * difficile à repérer qu'une ligne en attente.
 */
export function lireCommande(intention: {
  metadata?: Record<string, unknown>;
  order?: Record<string, unknown>;
}): Resultat<Commande> {
  const order = intention.order as { id?: unknown; payer?: { email?: unknown } } | undefined;

  // `order` n'apparaît qu'une fois le paiement autorisé. Provisionner avant, ce
  // serait créer un abonnement pour quelqu'un qui a fermé l'onglet sans payer.
  if (!order?.id) return echec('Le paiement n’est pas encore acquis.');

  const email = typeof order.payer?.email === 'string' ? order.payer.email.trim() : '';
  if (!email) return echec('Commande sans adresse de payeur : impossible de la rattacher.');

  const m = (intention.metadata ?? {}) as Record<string, unknown>;
  const texte = (cle: string) => (typeof m[cle] === 'string' ? (m[cle] as string).trim() : '');

  const manquants = ['saison', 'formule_id', 'creneau_id', 'participant'].filter((c) => !texte(c));
  if (manquants.length) return echec(`Métadonnées incomplètes : ${manquants.join(', ')}.`);

  /*
   * LE PREMIER MOT EST LE PRÉNOM, LE RESTE LE NOM. Le champ est libre et rendu
   * tel qu'il a été saisi ; « Marie-Claire de la Tour » doit rester entière.
   * L'inverse — dernier mot comme nom — casserait « de la Tour ».
   */
  const [prenom, ...reste] = texte('participant').split(/\s+/);

  return succes({
    orderId: String(order.id),
    email,
    prenom,
    nom: reste.join(' '),
    saison: texte('saison'),
    formuleId: texte('formule_id'),
    creneauId: texte('creneau_id'),
    adhesionCents: typeof m.adhesion_cents === 'number' ? m.adhesion_cents : 0,
  });
}

export interface Provisionnement {
  /** Faux si la commande avait déjà été provisionnée : ce n'est pas une erreur. */
  cree: boolean;
  participantId?: string;
  placesPosees?: number;
}

/**
 * Crée le compte, le participant, l'abonnement et l'adhésion d'une commande.
 *
 * IDEMPOTENT PAR LA BASE, et non par le code : `subscriptions.helloasso_order_id`
 * est unique. Le retour du payeur et la notification arrivent souvent tous deux,
 * parfois en même temps ; c'est la contrainte qui décide, pas l'ordre d'arrivée.
 */
export async function provisionner(
  supabase: SupabaseClient,
  commande: Commande,
): Promise<Resultat<Provisionnement>> {
  const { data: deja } = await supabase
    .from('subscriptions')
    .select('id, participant_id')
    .eq('helloasso_order_id', commande.orderId)
    .maybeSingle();

  if (deja) return succes({ cree: false, participantId: deja.participant_id as string });

  const compte = await trouverOuCreerCompte(supabase, commande.email);
  if (!compte.ok) return compte;

  /*
   * RATTACHEMENT PLUTÔT QUE CRÉATION (PRD §6). Si Isabelle a déjà créé la
   * personne à la main en septembre, la commande doit lui être rattachée et non
   * en créer une seconde. Le rapprochement se fait sur le nom au sein du même
   * compte : deux homonymes dans une même famille sont assez improbables pour
   * que l'inverse — deux fiches pour la même enfant — soit le vrai risque.
   */
  const { data: connue } = await supabase
    .from('participants')
    .select('id, audience')
    .eq('account_id', compte.valeur)
    .ilike('first_name', commande.prenom)
    .ilike('last_name', commande.nom)
    .maybeSingle();

  let participantId = connue?.id as string | undefined;

  if (!participantId) {
    const { data: formule } = await supabase
      .from('formules').select('audience').eq('id', commande.formuleId).maybeSingle();
    if (!formule) return echec(`Formule inconnue : ${commande.formuleId}.`);

    // « adultes » → « adulte » : le public d'une personne est le singulier de
    // celui de son groupe.
    const personne = String(formule.audience).replace(/s$/, '');

    const nouvelle = await creerParticipant(supabase, {
      compteId: compte.valeur,
      prenom: commande.prenom,
      nom: commande.nom,
      audience: personne,
    });
    if (!nouvelle.ok) return nouvelle;
    participantId = nouvelle.valeur;
  }

  const bornes = bornesSaison(commande.saison);
  if (!bornes) return echec(`Saison illisible : ${commande.saison}.`);

  const abonnement = await creerAbonnement(supabase, {
    participantId,
    formuleId: commande.formuleId,
    creneauId: commande.creneauId,
    debut: bornes.debut,
    fin: bornes.fin,
    saison: commande.saison,
    helloassoOrderId: commande.orderId,
  });
  if (!abonnement.ok) return abonnement;

  if (commande.adhesionCents > 0) {
    const adhesion = await enregistrerAdhesion(supabase, {
      compteId: compte.valeur,
      saison: commande.saison,
      montantCents: commande.adhesionCents,
      helloassoOrderId: commande.orderId,
    });
    // Une adhésion déjà présente n'empêche pas l'abonnement : elle signale un
    // trop-perçu, que l'admin verra dans la file, pas une panne.
    if (!adhesion.ok) return adhesion;
  }

  // Les places s'ouvrent tout de suite : quelqu'un qui vient de payer veut voir
  // son planning, pas attendre le cron du lendemain.
  const auto = await inscrireDOffice(supabase);

  return succes({
    cree: true,
    participantId,
    placesPosees: auto.ok ? auto.valeur : undefined,
  });
}
