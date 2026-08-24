import type { SupabaseClient } from '@supabase/supabase-js';
import type { Resultat } from './inscriptions';
import { saisonDe } from './inscriptions';
import { preparerAchatUnite, creerIntention } from './helloasso';
import { lireCode, reductionDe, normaliserCode } from './codes-promo';
import { provisionner } from './provisionnement';
import { mesurer } from './mesure';
import { origineJoignable } from './achat';

/**
 * L'achat d'une place, à une date.
 *
 * Stages et séances sans engagement se vendent ainsi, et se ressemblent au
 * point de partager tout ce fichier : ce qui les distingue est le `kind` du
 * créneau, rien d'autre. Le forfait, lui, achète une saison — il vit dans
 * `achat.ts`, et les deux ne se mélangent pas.
 *
 * TROIS DIFFÉRENCES DE FOND AVEC LE FORFAIT, toutes tenues ici :
 *
 *  1. L'ADHÉSION EST COMPRISE dans le prix affiché. Les pages publiques
 *     l'écrivent — « il n'y a rien à régler en plus » — donc on n'ajoute rien,
 *     et le formulaire ne pose pas la question.
 *  2. LE PRIX VIENT DE LA SÉANCE, `sessions.unit_price_cents`, et non d'une
 *     formule : deux dates du même créneau peuvent ne pas valoir le même prix.
 *  3. ON ACHÈTE UNE PLACE QUI EXISTE. Un forfait ouvre des droits sur la
 *     saison ; ici, la place est comptée, et vendue une fois.
 */

const echec = (erreur: string): Resultat<never> => ({ ok: false, erreur });
const succes = <T>(valeur: T): Resultat<T> => ({ ok: true, valeur });

/** Ce que vend chacune des deux pages publiques. */
export type Genre = 'seance' | 'stage';

export interface SeanceAchetable {
  id: string;
  creneauId: string;
  creneauLabel: string;
  audience: string;
  debut: Date;
  fin: Date | null;
  lieu: string | null;
  prixCents: number;
  placesRestantes: number;
}

interface LigneSeance {
  id: string;
  creneau_id: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  capacity: number;
  unit_price_cents: number | null;
  bookings: { status: string }[] | null;
  creneaux: {
    label: string; audience: string; kind: string;
    a_l_unite: boolean; default_unit_price_cents: number | null;
  } | null;
}

/**
 * Les dates encore achetables, dans l'ordre.
 *
 * ON N'AFFICHE PAS CE QUI EST COMPLET, et on ne l'affiche pas non plus grisé :
 * une liste de dates barrées fait chercher longtemps celle qui reste. Le compte
 * des places se refait ici à chaque affichage — il vieillit en quelques
 * minutes, et c'est `book_participant` qui tranche pour de bon, au moment de
 * poser la place.
 */
export async function seancesAchetables(
  supabase: SupabaseClient,
  genre: Genre,
): Promise<SeanceAchetable[]> {
  const { data } = await supabase
    .from('sessions')
    .select(
      'id, creneau_id, starts_at, ends_at, location, capacity, unit_price_cents, '
      + 'bookings(status), creneaux!inner(label, audience, kind, a_l_unite, default_unit_price_cents)',
    )
    .eq('status', 'scheduled')
    .eq('creneaux.a_l_unite', true)
    .is('creneaux.archived_at', null)
    .gt('starts_at', new Date().toISOString())
    .order('starts_at');

  const lignes = (data ?? []) as unknown as LigneSeance[];

  return lignes
    .filter((s) => s.creneaux !== null)
    .filter((s) => (genre === 'stage' ? s.creneaux!.kind === 'stage' : s.creneaux!.kind !== 'stage'))
    .map((s) => {
      const prises = (s.bookings ?? []).filter((b) => b.status === 'booked').length;
      return {
        id: s.id,
        creneauId: s.creneau_id,
        creneauLabel: s.creneaux!.label,
        audience: s.creneaux!.audience,
        debut: new Date(s.starts_at),
        fin: s.ends_at ? new Date(s.ends_at) : null,
        lieu: s.location,
        // Le prix de la séance prime ; celui du créneau n'est qu'un défaut, et
        // sert quand une date n'a jamais été tarifée à part.
        prixCents: s.unit_price_cents ?? s.creneaux!.default_unit_price_cents ?? 0,
        placesRestantes: Math.max(0, s.capacity - prises),
      };
    })
    .filter((s) => s.placesRestantes > 0 && s.prixCents > 0);
}

/** Ce qu'il en coûtera. Bien plus simple qu'un forfait : une place, un prix. */
export interface DevisUnite {
  prixCents: number;
  reductionCents: number;
  totalCents: number;
}

export function devisUnite(prixCents: number, reductionCents = 0): DevisUnite {
  return {
    prixCents,
    reductionCents,
    totalCents: Math.max(0, prixCents - reductionCents),
  };
}

/**
 * Vérifie, crée l'intention, et rend l'URL de paiement.
 *
 * LA PLACE EST VÉRIFIÉE DEUX FOIS : ici avant de faire payer, puis par
 * `book_participant` au provisionnement, sous verrou. La première évite de
 * prendre l'argent de quelqu'un pour une place qui n'existe plus ; la seconde
 * est la seule qui fasse foi, deux achats pouvant se croiser pendant le trajet
 * jusqu'à HelloAsso.
 */
export async function demarrerAchatUnite(
  supabase: SupabaseClient,
  o: {
    email: string;
    payeurPrenom?: string;
    payeurNom?: string;
    /** La personne qui participe. Le payeur lui-même, le plus souvent. */
    prenom: string;
    sessionId: string;
    codePromo?: string;
    origine: string;
    site?: URL;
    cheminAchat: string;
    cheminRetour: string;
  },
): Promise<Resultat<{ redirectUrl: string }>> {
  const participant = o.prenom.trim();
  if (!participant) return echec('Indiquez le nom de la personne qui participe.');

  const email = o.email.trim().toLowerCase();
  if (!email) return echec('Indiquez une adresse électronique.');
  if (!o.sessionId) return echec('Choisissez une date.');

  /*
   * LA SÉANCE SE RELIT EN BASE, et le prix vient de là. Le formulaire porte des
   * montants pour les afficher ; s'en servir pour facturer laisserait n'importe
   * qui choisir ce qu'il paie en modifiant un champ caché.
   */
  const { data } = await supabase
    .from('sessions')
    .select(
      'id, creneau_id, starts_at, capacity, unit_price_cents, status, '
      + 'bookings(status), creneaux!inner(label, audience, a_l_unite, default_unit_price_cents)',
    )
    .eq('id', o.sessionId)
    .maybeSingle();

  const seance = data as unknown as LigneSeance & { status: string } | null;
  if (!seance || !seance.creneaux) return echec('Cette date n’existe pas.');
  if (seance.status !== 'scheduled') return echec('Cette date a été annulée.');
  if (!seance.creneaux.a_l_unite) {
    return echec('Ce créneau ne se vend pas à la séance.');
  }
  if (new Date(seance.starts_at) <= new Date()) return echec('Cette date est passée.');

  const prises = (seance.bookings ?? []).filter((b) => b.status === 'booked').length;
  if (prises >= seance.capacity) {
    return echec('Cette date est complète. Choisissez-en une autre.');
  }

  const prixCents = seance.unit_price_cents ?? seance.creneaux.default_unit_price_cents ?? 0;
  if (prixCents <= 0) return echec('Cette date n’a pas de tarif : écrivez-nous.');

  const saison = saisonDe(new Date());

  /*
   * LE CODE SE VALIDE ICI, PAS DANS LE NAVIGATEUR. Un code refusé arrête
   * l'achat plutôt que de le laisser passer au plein tarif en silence :
   * quelqu'un qui a saisi un code s'attend à ce qu'il compte.
   */
  let reductionCents = 0;
  let codeApplique: string | null = null;

  if (o.codePromo?.trim()) {
    const code = await lireCode(supabase, o.codePromo);
    if (!code) return echec(`Le code « ${normaliserCode(o.codePromo)} » n'existe pas.`);

    const r = reductionDe(prixCents, code, { saison, aujourdhui: new Date() });
    if (!r.ok) return r;
    reductionCents = r.valeur;
    codeApplique = code.code;
  }

  const base = origineJoignable(o.origine, o.site);

  const achat = preparerAchatUnite({
    seance: { id: seance.id, debut: new Date(seance.starts_at), prixCents },
    creneau: { id: seance.creneau_id, label: seance.creneaux.label },
    participant,
    saison,
    reductionCents,
    codePromo: codeApplique,
    achatLe: new Date(),
    payeur: {
      email,
      ...(o.payeurPrenom?.trim() ? { firstName: o.payeurPrenom.trim() } : {}),
      ...(o.payeurNom?.trim() ? { lastName: o.payeurNom.trim() } : {}),
    },
    urls: {
      retour: `${base}${o.cheminRetour}`,
      erreur: `${base}${o.cheminAchat}?echec=1`,
      retourArriere: `${base}${o.cheminAchat}`,
    },
  });

  /*
   * QUAND IL N'Y A RIEN À PAYER, ON NE PASSE PAS PAR HELLOASSO : l'API refuse
   * une intention à zéro. Une place offerte n'en est pas moins une place — on
   * la pose directement, avec une référence qui la distingue d'une commande.
   */
  if (achat.totalCents === 0) {
    const [prenom, ...reste] = participant.split(/\s+/);
    const fait = await provisionner(supabase, {
      produit: 'seance',
      orderId: `GRATUIT-${crypto.randomUUID()}`,
      codePromo: codeApplique,
      montantCents: 0,
      email,
      prenom,
      nom: reste.join(' '),
      saison,
      sessionId: seance.id,
      creneauId: seance.creneau_id,
    });
    if (!fait.ok) return fait;
    return succes({ redirectUrl: `${base}${o.cheminRetour}?gratuit=1` });
  }

  const intention = await creerIntention(achat);
  if (!intention.ok) return intention;

  // Le pendant de `achat_abouti`, comme pour le forfait : l'écart entre les
  // deux mesure ce qui se perd sur la page de paiement.
  await mesurer('achat_engage', email, {
    produit: 'seance',
    montant_cents: achat.totalCents,
    versements: 1,
    comptant: true,
    saison,
    session_id: seance.id,
    creneau_id: seance.creneau_id,
    creneau: seance.creneaux.label,
    code_promo: codeApplique,
    reduction_cents: reductionCents,
    depuis: o.cheminAchat,
  });

  return succes({ redirectUrl: intention.valeur.redirectUrl });
}

export interface SaisieReservation {
  email: string; payeurPrenom: string; payeurNom: string; autre: boolean;
  prenom: string; nom: string; session: string; code: string;
}

export const saisieVide = (): SaisieReservation => ({
  email: '', payeurPrenom: '', payeurNom: '', autre: false,
  prenom: '', nom: '', session: '', code: '',
});

/** Ce que le formulaire a envoyé, relu tel quel pour le réafficher en cas d'échec. */
export function lireFormulaireReservation(form: FormData): SaisieReservation {
  const texte = (cle: string) => String(form.get(cle) ?? '').trim();
  return {
    email: texte('email'),
    payeurPrenom: texte('payeurPrenom'),
    payeurNom: texte('payeurNom'),
    autre: form.get('autre') === 'oui',
    prenom: texte('prenom'),
    nom: texte('nom'),
    session: texte('session'),
    code: texte('code'),
  };
}

/**
 * Qui participe ?
 *
 * SANS LA CASE COCHÉE, C'EST LE PAYEUR. Un adulte qui s'inscrit lui-même ne
 * doit pas donner son nom deux fois. Le repli vaut aussi sans JavaScript : les
 * champs du participant restent alors visibles mais facultatifs, et vides ils
 * ne disent rien.
 */
export function participantDe(s: SaisieReservation): string {
  return s.autre && s.prenom
    ? `${s.prenom} ${s.nom}`.trim()
    : `${s.payeurPrenom} ${s.payeurNom}`.trim();
}
