import type { SupabaseClient } from '@supabase/supabase-js';
import type { Resultat } from './inscriptions';
import { adhesionReglee, saisonDe } from './inscriptions';
import { memePublic } from './ateliers';
import { preparerAchat, creerIntention, construireEcheancier, ADHESION_CENTS } from './helloasso';
import type { FormuleCatalogue } from './tarifs';
import { lireCode, reductionDe, normaliserCode } from './codes-promo';
import { lireCommande, provisionner } from './provisionnement';

/**
 * Le parcours d'achat, avant le paiement.
 *
 * DEUX PORTES, UN SEUL CHEMIN. Un adhérent connu achète depuis son espace ; une
 * famille nouvelle ne le peut pas — `connexion.astro` appelle `signInWithOtp`
 * avec `shouldCreateUser: false`, si bien qu'elle ne peut pas se connecter avant
 * d'avoir acheté. Elle passe donc par une page publique. Les deux portes
 * diffèrent par ce qu'elles savent du payeur, et par rien d'autre : tout ce qui
 * suit leur est commun.
 */

const echec = (erreur: string): Resultat<never> => ({ ok: false, erreur });
const succes = <T>(valeur: T): Resultat<T> => ({ ok: true, valeur });

export interface CreneauAchetable {
  id: string;
  label: string;
  audience: string;
}

/**
 * Une origine que HelloAsso accepte pour ses URL de retour.
 *
 * HELLOASSO REFUSE localhost, 127.0.0.1 ET LE HTTP EN CLAIR — d'un « Le champ
 * BackUrl est invalide » qui ne dit pas lequel des trois est en cause. Sans
 * repli, le parcours d'achat serait intestable ailleurs qu'en production.
 *
 * On retombe alors sur le site configuré : le paiement se fait bien, et le
 * retour atterrit sur le domaine public — qui provisionne dans la MÊME base.
 * Le parcours se vérifie donc en entier depuis un poste de développement, au
 * prix d'un changement de domaine à la dernière étape.
 *
 * Une préversion Vercel, elle, est joignable en https : on la garde, faute de
 * quoi on testerait la production en croyant tester la préversion.
 */
export function origineJoignable(origine: string, site: URL | undefined): string {
  const sans = (u: string) => u.replace(/\/+$/, '');
  try {
    const u = new URL(origine);
    const locale = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(u.hostname);
    if (u.protocol === 'https:' && !locale) return sans(origine);
  } catch {
    /* origine illisible : on tentera le repli */
  }
  return site ? sans(String(site)) : sans(origine);
}

export interface Devis {
  adhesionCents: number;
  reductionCents: number;
  /** Ce qui sera prélevé aujourd'hui. */
  premierCents: number;
  /** Le montant de chacune des échéances suivantes. */
  suivantsCents: number;
  nbEcheances: number;
  totalCents: number;
}

/**
 * Ce qu'il en coûtera, avant de payer.
 *
 * CALCULÉ CÔTÉ SERVEUR, et non dans le navigateur : c'est le même
 * `construireEcheancier` qui produira l'échéancier réellement envoyé à
 * HelloAsso. Refaire l'arithmétique en JavaScript donnerait deux calculs à
 * tenir d'accord, et le jour où ils divergeraient, la page annoncerait un
 * montant que le prélèvement démentirait.
 */
export function devis(o: {
  formule: { prixCents: number; mensualites: number };
  adhesionDue: boolean;
  comptant: boolean;
  achatLe: Date;
  /** Réduction sur le forfait seul, déjà validée. */
  reductionCents?: number;
}): Devis {
  const adhesionCents = o.adhesionDue ? ADHESION_CENTS : 0;
  // La réduction ne mord que sur le forfait : l'adhésion n'est pas un prix
  // qu'on négocie.
  const forfait = Math.max(0, o.formule.prixCents - (o.reductionCents ?? 0));
  const e = construireEcheancier({
    totalCents: forfait,
    versements: o.comptant ? 1 : o.formule.mensualites,
    achatLe: o.achatLe,
    supplementInitialCents: adhesionCents,
  });

  return {
    adhesionCents,
    reductionCents: o.reductionCents ?? 0,
    premierCents: e.initialAmount,
    suivantsCents: e.terms[0]?.amount ?? 0,
    nbEcheances: e.terms.length,
    totalCents: e.totalAmount,
  };
}

/**
 * Ce qui est demandé est-il seulement possible ?
 *
 * Le contrôle des publics n'est pas une politesse : `run_auto_enrolment` exige
 * que le créneau soit celui du public de la personne et écarte le reste EN
 * SILENCE. Un achat mal apparié se paierait normalement et ne poserait jamais
 * une séance — sans que rien ne dise pourquoi.
 */
export function verifierAchat(o: {
  audience: string;
  prenom: string;
  formule?: FormuleCatalogue;
  creneau?: CreneauAchetable;
}): Resultat<null> {
  if (!o.prenom.trim()) return echec('Indiquez le nom de la personne inscrite.');
  if (!o.formule || !o.creneau) return echec('Choisissez une formule et un créneau.');

  if (!memePublic(o.audience, o.creneau.audience)) {
    return echec(
      `Le créneau « ${o.creneau.label} » accueille le public « ${o.creneau.audience} », `
      + `mais l'inscription est faite pour un « ${o.audience} ».`,
    );
  }
  if (!memePublic(o.audience, o.formule.audience)) {
    return echec(
      `Cette formule est celle du public « ${o.formule.audience} », `
      + `mais l'inscription est faite pour un « ${o.audience} ».`,
    );
  }
  return succes(null);
}

/**
 * Vérifie, calcule le dû, crée l'intention, et rend l'URL de paiement.
 *
 * L'ADHÉSION SE DÉCIDE SUR L'ADRESSE DU PAYEUR, y compris quand personne n'est
 * connecté : si un compte porte déjà cette adresse et que la famille a réglé
 * pour la saison, on ne la redemande pas. C'est ce qui permet à une mère
 * d'inscrire sa seconde fille sans repayer, qu'elle soit connectée ou non.
 */
export async function demarrerAchat(
  supabase: SupabaseClient,
  o: {
    email: string;
    /** Le nom du payeur, tel qu'il figurera sur la page de paiement. */
    payeurPrenom?: string;
    payeurNom?: string;
    /** Le nom de la personne inscrite. Le payeur lui-même, le plus souvent. */
    prenom: string;
    audience: string;
    formule?: FormuleCatalogue;
    creneau?: CreneauAchetable;
    comptant: boolean;
    /** Le code saisi, s'il y en a un. */
    codePromo?: string;
    /** Origine de la requête. Remplacée par `site` si HelloAsso la refuserait. */
    origine: string;
    /** Le site public configuré, seul repli possible depuis un poste local. */
    site?: URL;
    /** Chemin de la page d'achat, où revenir en cas d'échec. */
    cheminAchat: string;
    /** Chemin de la page de retour après paiement. */
    cheminRetour: string;
  },
): Promise<Resultat<{ redirectUrl: string }>> {
  const valide = verifierAchat(o);
  if (!valide.ok) return valide;

  const email = o.email.trim().toLowerCase();
  if (!email) return echec('Indiquez une adresse électronique.');

  const saison = saisonDe(new Date());

  /*
   * On cherche le compte SANS LE CRÉER : à ce stade rien n'est payé, et créer
   * un compte pour un panier abandonné laisserait des familles fantômes qu'il
   * faudrait ensuite distinguer des vraies. Le compte naît au provisionnement.
   */
  const { data: compte } = await supabase
    .from('accounts').select('id').eq('email', email).maybeSingle();

  let adhesionDue = true;
  if (compte) {
    const deja = await adhesionReglee(supabase, compte.id as string, saison);
    if (deja.ok) adhesionDue = !deja.valeur;
  }

  const base = origineJoignable(o.origine, o.site);

  /*
   * LE CODE SE VALIDE ICI, PAS DANS LE NAVIGATEUR. Le devis affiché n'engage
   * rien ; c'est le montant de l'intention qui est prélevé. Un code refusé
   * arrête l'achat plutôt que de le laisser passer au plein tarif en silence —
   * quelqu'un qui a saisi un code s'attend à ce qu'il compte.
   */
  let reductionCents = 0;
  let codeApplique: string | null = null;

  if (o.codePromo?.trim()) {
    const code = await lireCode(supabase, o.codePromo);
    if (!code) return echec(`Le code « ${normaliserCode(o.codePromo)} » n'existe pas.`);

    const r = reductionDe(o.formule!.prixCents, code, { saison, aujourdhui: new Date() });
    if (!r.ok) return r;
    reductionCents = r.valeur;
    codeApplique = code.code;
  }

  const achat = preparerAchat({
    formule: o.formule!,
    reductionCents,
    codePromo: codeApplique,
    creneau: o.creneau!,
    participant: o.prenom.trim(),
    saison,
    adhesionDue,
    comptant: o.comptant,
    achatLe: new Date(),
    /*
     * LE PAYEUR N'EST PAS TOUJOURS LE PARTICIPANT, et c'est le cas le plus
     * courant chez les enfants : la page de paiement doit porter le nom de qui
     * règle, non celui de qui coud. Les deux se saisissent séparément, et le
     * formulaire ne demande le second que lorsqu'il diffère.
     */
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
   * QUAND IL N'Y A RIEN À PAYER, ON NE PASSE PAS PAR HELLOASSO.
   *
   * Un code à 100 %, sur une famille dont l'adhésion est déjà réglée, ramène le
   * total à zéro — et l'API refuse : « Les montants sont invalides ». Une place
   * offerte n'en est pas moins une inscription : on la provisionne directement,
   * avec une référence propre qui la distingue d'une commande payée.
   *
   * Le code est consommé comme les autres : c'est bien un usage.
   */
  if (achat.totalCents + (achat.supplementInitialCents ?? 0) === 0) {
    const commande = {
      orderId: `GRATUIT-${crypto.randomUUID()}`,
      codePromo: codeApplique,
      email,
      prenom: o.prenom.trim().split(/\s+/)[0],
      nom: o.prenom.trim().split(/\s+/).slice(1).join(' '),
      saison,
      formuleId: o.formule!.id,
      creneauId: o.creneau!.id,
      adhesionCents: 0,
    };

    const fait = await provisionner(supabase, commande);
    if (!fait.ok) return fait;

    // On rend une URL comme dans le cas payant : l'appelant redirige, sans
    // avoir à connaître ce cas de figure.
    return succes({ redirectUrl: `${base}${o.cheminRetour}?gratuit=1` });
  }

  const intention = await creerIntention(achat);
  if (!intention.ok) return intention;
  return succes({ redirectUrl: intention.valeur.redirectUrl });
}

/**
 * L'adhésion est-elle due pour cette adresse ? Sert à l'annoncer AVANT l'achat.
 *
 * Rend `true` pour une adresse inconnue : une famille nouvelle la doit
 * forcément, et l'annoncer par excès vaut mieux que de la découvrir au moment
 * de payer.
 */
export async function adhesionDuePour(
  supabase: SupabaseClient,
  email: string | null,
): Promise<boolean> {
  if (!email) return true;
  const { data: compte } = await supabase
    .from('accounts').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
  if (!compte) return true;

  const deja = await adhesionReglee(supabase, compte.id as string, saisonDe(new Date()));
  return deja.ok ? !deja.valeur : true;
}
