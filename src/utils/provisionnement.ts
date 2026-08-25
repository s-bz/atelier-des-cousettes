import type { SupabaseClient } from '@supabase/supabase-js';
import type { Resultat } from './inscriptions';
import { compterUsage } from './codes-promo';
import { mesurer } from './mesure';
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

interface CommandeBase {
  orderId: string;
  codePromo: string | null;
  email: string;
  /** Le prénom de la personne qui PARTICIPE. */
  prenom: string;
  nom: string;
  /**
   * Le nom de qui RÈGLE, tel que HelloAsso le renvoie. Nul s'il manque.
   *
   * Distinct du participant : une mère règle pour sa fille. On le garde sur le
   * compte, pour ne pas le redemander à chaque achat et pour qu'un foyer se
   * reconnaisse autrement que par son adresse.
   */
  payeurPrenom: string | null;
  payeurNom: string | null;
  saison: string;
  creneauId: string;
  /**
   * Ce que la commande rapporte en tout, en centimes. Zéro pour les intentions
   * créées avant que le champ existe : la mesure d'audience s'en accommode, le
   * provisionnement ne s'en sert pas.
   */
  montantCents: number;
}

/** La saison entière, réglée d'avance ou par mensualités. */
export interface CommandeForfait extends CommandeBase {
  produit: 'forfait';
  formuleId: string;
  /** L'adhésion annuelle de la famille, quand elle restait due. */
  adhesionCents: number;
}

/**
 * Une place, à une date.
 *
 * Stages et séances sans engagement se vendent ainsi. PAS D'ADHÉSION : les
 * pages publiques annoncent qu'elle est comprise dans le prix — « il n'y a rien
 * à régler en plus » — et le champ n'existe donc pas ici, plutôt que d'exister
 * à zéro et de laisser croire qu'il pourrait valoir autre chose.
 */
export interface CommandeUnite extends CommandeBase {
  produit: 'seance';
  /** La date précise. Un stage en a plusieurs au catalogue ; on en achète une. */
  sessionId: string;
}

export type Commande = CommandeForfait | CommandeUnite;

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
  const order = intention.order as {
    id?: unknown;
    payer?: { email?: unknown; firstName?: unknown; lastName?: unknown };
  } | undefined;

  // `order` n'apparaît qu'une fois le paiement autorisé. Provisionner avant, ce
  // serait créer un abonnement pour quelqu'un qui a fermé l'onglet sans payer.
  if (!order?.id) return echec('Le paiement n’est pas encore acquis.');

  const email = typeof order.payer?.email === 'string' ? order.payer.email.trim() : '';
  if (!email) return echec('Commande sans adresse de payeur : impossible de la rattacher.');

  const m = (intention.metadata ?? {}) as Record<string, unknown>;
  const texte = (cle: string) => (typeof m[cle] === 'string' ? (m[cle] as string).trim() : '');

  /*
   * LE PRODUIT DÉCIDE DE CE QU'IL FAUT LIRE. Absent, c'est un forfait : les
   * intentions créées avant la vente à l'unité n'en portaient pas, et une
   * famille qui règle le lendemain de la mise en ligne ne doit pas tomber dans
   * la file « à traiter » pour un champ qui n'existait pas encore.
   */
  const produit = texte('produit') === 'seance' ? 'seance' : 'forfait';

  const requis = produit === 'seance'
    ? ['saison', 'session_id', 'creneau_id', 'participant']
    : ['saison', 'formule_id', 'creneau_id', 'participant'];

  const manquants = requis.filter((c) => !texte(c));
  if (manquants.length) return echec(`Métadonnées incomplètes : ${manquants.join(', ')}.`);

  /*
   * LE PREMIER MOT EST LE PRÉNOM, LE RESTE LE NOM. Le champ est libre et rendu
   * tel qu'il a été saisi ; « Marie-Claire de la Tour » doit rester entière.
   * L'inverse — dernier mot comme nom — casserait « de la Tour ».
   */
  const [prenom, ...reste] = texte('participant').split(/\s+/);

  const texteDe = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  const commun = {
    orderId: String(order.id),
    email,
    payeurPrenom: texteDe(order.payer?.firstName),
    payeurNom: texteDe(order.payer?.lastName),
    prenom,
    nom: reste.join(' '),
    saison: texte('saison'),
    creneauId: texte('creneau_id'),
    codePromo: typeof m.code_promo === 'string' ? m.code_promo : null,
    montantCents: typeof m.montant_cents === 'number' ? m.montant_cents : 0,
  };

  if (produit === 'seance') {
    return succes({ ...commun, produit, sessionId: texte('session_id') });
  }

  return succes({
    ...commun,
    produit,
    formuleId: texte('formule_id'),
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
 * Retrouve la personne inscrite, ou la crée.
 *
 * RATTACHEMENT PLUTÔT QUE CRÉATION (PRD §6). Si Isabelle a déjà créé la
 * personne à la main en septembre, la commande doit lui être rattachée et non
 * en créer une seconde. Le rapprochement se fait sur le nom au sein du même
 * compte : deux homonymes dans une même famille sont assez improbables pour
 * que l'inverse — deux fiches pour la même enfant — soit le vrai risque.
 */
async function trouverOuCreerParticipant(
  supabase: SupabaseClient,
  o: { compteId: string; prenom: string; nom: string; audience: () => Promise<Resultat<string>> },
): Promise<Resultat<string>> {
  const { data: connue } = await supabase
    .from('participants')
    .select('id')
    .eq('account_id', o.compteId)
    .ilike('first_name', o.prenom)
    .ilike('last_name', o.nom)
    .maybeSingle();

  if (connue?.id) return succes(connue.id as string);

  // Le public ne se lit QUE pour une création : une personne déjà connue garde
  // le sien, et le déduire du catalogue pourrait le contredire.
  const public_ = await o.audience();
  if (!public_.ok) return public_;

  return creerParticipant(supabase, {
    compteId: o.compteId,
    prenom: o.prenom,
    nom: o.nom,
    audience: public_.valeur,
  });
}

/**
 * Garde le nom de qui règle sur son compte.
 *
 * ÉCRIT À CHAQUE COMMANDE, et écrase la fois précédente : c'est le nom qui
 * vient d'être présenté au paiement, donc le plus récent que nous ayons. Une
 * correction faite à la main dans l'administration tiendra jusqu'au prochain
 * achat — ce qui est le bon sens de lecture, la banque ayant le dernier mot sur
 * l'identité du porteur.
 *
 * Un échec ne fait pas échouer la commande : le nom est un confort, la place
 * est l'essentiel.
 */
async function retenirLePayeur(
  supabase: SupabaseClient,
  compteId: string,
  prenom: string | null,
  nom: string | null,
): Promise<void> {
  if (!prenom && !nom) return;

  const { error } = await supabase
    .from('accounts')
    .update({ payeur_prenom: prenom, payeur_nom: nom })
    .eq('id', compteId);

  if (error) console.error('[provisionnement] nom du payeur non retenu :', error.message);
}

/** « adultes » → « adulte » : le public d'une personne est le singulier de celui de son groupe. */
const auSingulier = (public_: string) => public_.replace(/s$/, '');

/**
 * Crée les lignes d'une commande payée.
 *
 * IDEMPOTENT PAR LA BASE, et non par le code : `subscriptions.helloasso_order_id`
 * et `bookings.helloasso_order_id` sont uniques. Le retour du payeur et la
 * notification arrivent souvent tous deux, parfois en même temps ; c'est la
 * contrainte qui décide, pas l'ordre d'arrivée.
 */
export async function provisionner(
  supabase: SupabaseClient,
  commande: Commande,
): Promise<Resultat<Provisionnement>> {
  const fait = commande.produit === 'seance'
    ? await provisionnerUnite(supabase, commande)
    : await provisionnerForfait(supabase, commande);

  /*
   * LA VENTE SE MESURE ICI, ET NULLE PART AILLEURS.
   *
   * Trois chemins mènent à un encaissement — le retour du payeur sans compte,
   * celui de l'adhérent connecté, la notification HelloAsso — et deux d'entre
   * eux se produisent souvent pour la MÊME commande. Mesurer chez l'appelant
   * compterait donc la moitié des ventes en double, et manquerait celles dont
   * personne n'a vu le retour.
   *
   * `cree` tranche : il ne vaut vrai qu'au passage qui a réellement inscrit,
   * l'unicité de `helloasso_order_id` en base en étant l'arbitre. Le doublon
   * est réglé par la même contrainte qui protège l'inscription elle-même,
   * plutôt que par une déduplication propre à la mesure.
   */
  if (fait.ok && fait.valeur.cree) {
    await mesurer('achat_abouti', commande.email, {
      produit: commande.produit,
      montant_cents: commande.montantCents,
      saison: commande.saison,
      creneau_id: commande.creneauId,
      code_promo: commande.codePromo,
      places_posees: fait.valeur.placesPosees ?? 0,
      ...(commande.produit === 'forfait'
        ? { formule_id: commande.formuleId, adhesion_cents: commande.adhesionCents }
        : { session_id: commande.sessionId }),
      // Un code à 100 % ne passe pas par HelloAsso : la référence le dit, et
      // sans elle une inscription offerte gonflerait le chiffre d'affaires.
      gratuit: commande.orderId.startsWith('GRATUIT-'),
    });
  }

  return fait;
}

/**
 * Une place payée, à une date.
 *
 * LA PLACE SE POSE PAR `book_participant`, comme toutes les autres. Cette
 * fonction tient le verrou sur la séance, le compte des places, la liste
 * d'attente, le refus des séances annulées et le contrôle du public : les
 * réécrire ici aurait fait deux règles là où il n'en faut qu'une.
 *
 * SI LA SÉANCE EST COMPLÈTE, ON REND UN ÉCHEC MOTIVÉ — et l'appelant range la
 * commande dans la file « à traiter » avec sa charge utile. Quelqu'un a payé :
 * la place lui revient, ou son argent. Les deux se règlent à la main, aucun
 * des deux ne se règle en silence.
 */
async function provisionnerUnite(
  supabase: SupabaseClient,
  commande: CommandeUnite,
): Promise<Resultat<Provisionnement>> {
  const { data: deja } = await supabase
    .from('bookings')
    .select('id, participant_id')
    .eq('helloasso_order_id', commande.orderId)
    .maybeSingle();

  if (deja) return succes({ cree: false, participantId: deja.participant_id as string });

  const compte = await trouverOuCreerCompte(supabase, commande.email);
  if (!compte.ok) return compte;

  await retenirLePayeur(supabase, compte.valeur, commande.payeurPrenom, commande.payeurNom);

  const participant = await trouverOuCreerParticipant(supabase, {
    compteId: compte.valeur,
    prenom: commande.prenom,
    nom: commande.nom,
    audience: async () => {
      const { data: creneau } = await supabase
        .from('creneaux').select('audience').eq('id', commande.creneauId).maybeSingle();
      if (!creneau) return echec(`Créneau inconnu : ${commande.creneauId}.`);
      return succes(auSingulier(String(creneau.audience)));
    },
  });
  if (!participant.ok) return participant;

  const { data: place, error } = await supabase.rpc('book_participant', {
    p_session: commande.sessionId,
    p_participant: participant.valeur,
    p_source: 'achat',
    p_forcer: false,
    p_commande: commande.orderId,
  });

  if (error) return echec(`Place impossible à poser : ${error.message}`);
  if (!place) return echec('La réservation n’a rien rendu.');

  if (commande.codePromo) await compterUsage(supabase, commande.codePromo);

  return succes({ cree: true, participantId: participant.valeur, placesPosees: 1 });
}

/**
 * Le forfait d'une saison : compte, participant, abonnement et adhésion.
 */
async function provisionnerForfait(
  supabase: SupabaseClient,
  commande: CommandeForfait,
): Promise<Resultat<Provisionnement>> {
  const { data: deja } = await supabase
    .from('subscriptions')
    .select('id, participant_id')
    .eq('helloasso_order_id', commande.orderId)
    .maybeSingle();

  if (deja) return succes({ cree: false, participantId: deja.participant_id as string });

  const compte = await trouverOuCreerCompte(supabase, commande.email);
  if (!compte.ok) return compte;

  await retenirLePayeur(supabase, compte.valeur, commande.payeurPrenom, commande.payeurNom);

  const participant = await trouverOuCreerParticipant(supabase, {
    compteId: compte.valeur,
    prenom: commande.prenom,
    nom: commande.nom,
    audience: async () => {
      const { data: formule } = await supabase
        .from('formules').select('audience').eq('id', commande.formuleId).maybeSingle();
      if (!formule) return echec(`Formule inconnue : ${commande.formuleId}.`);
      return succes(auSingulier(String(formule.audience)));
    },
  });
  if (!participant.ok) return participant;

  const bornes = bornesSaison(commande.saison);
  if (!bornes) return echec(`Saison illisible : ${commande.saison}.`);

  const abonnement = await creerAbonnement(supabase, {
    participantId: participant.valeur,
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

  /*
   * L'USAGE DU CODE SE COMPTE ICI, ET NON À LA CRÉATION DE L'INTENTION : un
   * panier abandonné ne doit pas consommer un code à tirage limité. Ce chemin
   * ne s'exécute qu'une fois par commande — l'unicité de `helloasso_order_id`
   * s'en porte garante.
   */
  if (commande.codePromo) await compterUsage(supabase, commande.codePromo);

  // Les places s'ouvrent tout de suite : quelqu'un qui vient de payer veut voir
  // son planning, pas attendre le cron du lendemain.
  const auto = await inscrireDOffice(supabase);

  return succes({
    cree: true,
    participantId: participant.valeur,
    placesPosees: auto.ok ? auto.valeur : undefined,
  });
}
