/**
 * Lecture des notifications HelloAsso.
 *
 * Le contrat de cette route est celui du PRD §6 : **aucune commande n'est jamais
 * silencieusement ignorée**. Tout ce qui arrive est stocké brut, et rien de ce
 * qui est écrit ici ne doit pouvoir lever d'exception — une notification que
 * l'on refuse est une notification que HelloAsso réémettra pendant 48 h, puis
 * abandonnera. Passé ce délai, quelqu'un a payé et n'apparaît nulle part.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { Resultat } from './inscriptions';

const echec = (erreur: string): Resultat<never> => ({ ok: false, erreur });
const succes = <T>(valeur: T): Resultat<T> => ({ ok: true, valeur });

/**
 * Le jeton partagé, lu dans la chaîne de requête de l'URL de rappel.
 *
 * HelloAsso ne signe pas ses notifications : il n'existe pas de secret partagé
 * ni d'en-tête à vérifier. Le jeton en chaîne de requête est donc le seul garde
 * possible, et il ne prouve pas grand-chose — c'est pourquoi il ne décide de
 * rien. Une notification sans jeton valable est **stockée quand même**, marquée
 * comme non authentifiée : le vrai contrôle est la relecture de la commande par
 * l'API avant tout provisionnement.
 *
 * Comparaison à temps constant sur des empreintes de longueur fixe : deux
 * chaînes de longueurs différentes feraient sinon échouer `timingSafeEqual`, et
 * la durée de la réponse trahirait la longueur du secret.
 */
export function jetonValide(url: string | URL, attendu: string | undefined | null): boolean {
  if (!attendu) return false;

  let recu: string | null;
  try {
    recu = new URL(String(url)).searchParams.get('jeton');
  } catch {
    return false;
  }
  if (!recu) return false;

  const condense = (valeur: string) => createHash('sha256').update(valeur).digest();
  return timingSafeEqual(condense(recu), condense(attendu));
}

export interface NotificationHelloAsso {
  /** `Order`, `Payment`, `Form`… tel qu'annoncé par HelloAsso. */
  type: string;
  /** L'identifiant porté par la charge utile, ou `null` si l'on n'en trouve pas. */
  identifiant: string | null;
  /** Clé d'idempotence : deux réémissions d'un même événement la partagent. */
  cle: string;
}

/** Empreinte du contenu, quand rien d'autre ne peut servir de clé. */
function empreinte(brut: unknown): string {
  return createHash('sha256').update(JSON.stringify(brut) ?? '').digest('hex').slice(0, 32);
}

export function lireNotification(brut: unknown): NotificationHelloAsso {
  const enveloppe = (brut ?? {}) as { eventType?: unknown; data?: { id?: unknown } };

  const type =
    typeof enveloppe.eventType === 'string' && enveloppe.eventType ? enveloppe.eventType : 'Inconnu';

  const id = enveloppe.data?.id;
  const identifiant = id === undefined || id === null ? null : String(id);

  /*
   * SANS IDENTIFIANT, LA CLÉ VIENT DU CONTENU — et non d'une constante.
   * Une clé constante ferait passer toute notification illisible pour un
   * doublon de la précédente : la deuxième serait écartée en silence, et la
   * commande qu'elle portait n'existerait nulle part. L'empreinte préserve
   * l'idempotence (une réémission à l'octet près garde sa clé) sans jamais
   * confondre deux charges utiles distinctes.
   */
  return {
    type,
    identifiant,
    cle: identifiant ? `${type}:${identifiant}` : `${type}:sha:${empreinte(brut)}`,
  };
}

/** Le jour le plus tardif qu'HelloAsso accepte pour une échéance. */
const JOUR_MAX = 27;
/** Aucune échéance ne peut être programmée au-delà de douze mois. */
const HORIZON_MOIS = 12;

export interface Echeance {
  /** Montant de l'échéance, en centimes. */
  amount: number;
  /** Date de prélèvement, au format ISO. */
  date: string;
}

export interface Echeancier {
  totalAmount: number;
  initialAmount: number;
  terms: Echeance[];
}

/**
 * L'échéancier d'un forfait, tel que l'API l'accepte.
 *
 * QUATRE RÈGLES, TOUTES MESURÉES CONTRE L'ORGANISATION RÉELLE le 24/08/2026 —
 * la documentation ne les énonçait pas toutes, et l'API les fait respecter à
 * coups de 400 :
 *
 *   - `totalAmount` doit valoir exactement `initialAmount + Σ terms` ;
 *   - aucune échéance sur le mois courant ni dans le passé : la première tombe
 *     le mois SUIVANT le paiement initial ;
 *   - aucune échéance après le 27 du mois — une campagne accepte le 28, pas un
 *     Checkout ;
 *   - aucune échéance au-delà de douze mois.
 *
 * `versements` COMPTE LE PAIEMENT INITIAL. Neuf mensualités, ce sont un
 * règlement à l'inscription puis huit échéances — et non neuf échéances après
 * coup. C'est le nombre que porte `formules.mensualites`.
 */
export function construireEcheancier(o: {
  totalCents: number;
  versements: number;
  achatLe: Date;
  /** Jour du mois du prélèvement. Ramené à 27 s'il le dépasse. */
  jour?: number;
  /** L'adhésion, quand elle se règle avec le forfait : elle ne pèse que sur le premier versement. */
  supplementInitialCents?: number;
}): Echeancier {
  const { totalCents, versements, achatLe } = o;
  if (versements < 1) throw new Error('Il faut au moins un versement.');

  const supplement = o.supplementInitialCents ?? 0;
  const jour = Math.min(o.jour ?? JOUR_MAX, JOUR_MAX);
  const nbEcheances = versements - 1;

  if (nbEcheances > HORIZON_MOIS) {
    throw new Error(
      `${versements} versements demandent ${nbEcheances} échéances, `
      + `soit au-delà de 12 mois — HelloAsso les refuse.`,
    );
  }

  /*
   * LE RESTE SE POSE SUR LE PREMIER VERSEMENT. Un total qui ne se divise pas
   * juste — ce n'est pas le cas de la grille 2026-2027, mais rien ne le
   * garantit d'une saison à l'autre — laisserait sinon manquer quelques
   * centimes, et l'API refuserait l'intention. Le premier versement est aussi
   * le seul que le payeur voie avant de s'engager : c'est là que la différence
   * est honnête.
   */
  const part = Math.floor(totalCents / versements);
  const reste = totalCents - part * versements;

  const terms: Echeance[] = Array.from({ length: nbEcheances }, (_, i) => {
    // i = 0 → le mois suivant l'achat.
    const d = new Date(Date.UTC(achatLe.getUTCFullYear(), achatLe.getUTCMonth() + 1 + i, jour));
    return { amount: part, date: d.toISOString() };
  });

  return {
    totalAmount: totalCents + supplement,
    initialAmount: part + reste + supplement,
    terms,
  };
}

/** `itemName` est borné à 250 caractères par l'API. */
const LIBELLE_MAX = 250;

export interface Payeur {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface Achat {
  /** Ce que le payeur lira sur la page de paiement et sur son reçu. */
  libelle: string;
  totalCents: number;
  /** Nombre de versements, paiement initial compris. 1 pour un règlement comptant. */
  versements: number;
  achatLe: Date;
  jour?: number;
  supplementInitialCents?: number;
  /** Le panier réel : formule, créneau, participants. Revient intact sur le GET. */
  metadata: Record<string, unknown>;
  payeur?: Payeur;
  urls: { retour: string; erreur: string; retourArriere: string };
}

export interface CorpsIntention extends Echeancier {
  itemName: string;
  backUrl: string;
  errorUrl: string;
  returnUrl: string;
  containsDonation: boolean;
  metadata: Record<string, unknown>;
  payer?: Payeur;
}

/**
 * Le corps d'une intention de paiement.
 *
 * SÉPARÉ DE L'APPEL RÉSEAU À DESSEIN : c'est ici que vivent les règles, et
 * elles se vérifient sans joindre HelloAsso. L'appel lui-même n'est qu'un POST.
 *
 * UNE INTENTION NE PORTE QU'UNE LIGNE D'ARTICLE — un libellé, un montant. Le
 * détail vit dans `metadata`, objet JSON libre jusqu'à 20 000 caractères, qui
 * revient intact sur le GET. C'est lui qui remplace la table de correspondance
 * « tarif → formule » prévue au PRD §6 : le `formule_id` est écrit par le site,
 * il n'a jamais à être deviné depuis un libellé.
 */
export function corpsIntention(a: Achat): CorpsIntention {
  const echeancier = construireEcheancier({
    totalCents: a.totalCents,
    versements: a.versements,
    achatLe: a.achatLe,
    jour: a.jour,
    supplementInitialCents: a.supplementInitialCents,
  });

  return {
    ...echeancier,
    itemName: a.libelle.slice(0, LIBELLE_MAX),
    backUrl: a.urls.retourArriere,
    errorUrl: a.urls.erreur,
    returnUrl: a.urls.retour,
    // Rien de ce que vend l'atelier n'est un don : le déclarer changerait le
    // traitement fiscal de la commande.
    containsDonation: false,
    metadata: a.metadata,
    // Un payeur vide vaut mieux absent : HelloAsso demande alors les
    // coordonnées lui-même, au lieu d'afficher des champs pré-remplis à blanc.
    ...(a.payeur && Object.keys(a.payeur).length ? { payer: a.payeur } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// L'appel à l'API
// ─────────────────────────────────────────────────────────────────────────────

const API = 'https://api.helloasso.com/v5';
const JETON_URL = 'https://api.helloasso.com/oauth2/token';

/**
 * Le slug de l'association, tel qu'il figure dans ses propres URL publiques
 * (helloasso.com/associations/les-p-tits-piafs). Ce n'est pas un secret, et le
 * changer serait un événement bien plus grand qu'une variable d'environnement.
 */
const ORGANISATION = 'les-p-tits-piafs';

const env = (nom: string) => import.meta.env?.[nom] ?? process.env[nom];

/**
 * Le jeton d'accès, gardé jusqu'à son expiration.
 *
 * Il vaut trente minutes ; en redemander un à chaque appel ajouterait un
 * aller-retour à chaque paiement, pour rien. La marge de soixante secondes
 * évite de présenter un jeton qui expire pendant le trajet.
 */
let jetonEnCours: { valeur: string; expireA: number } | null = null;

async function jetonApi(): Promise<Resultat<string>> {
  if (jetonEnCours && Date.now() < jetonEnCours.expireA) return succes(jetonEnCours.valeur);

  const id = env('HELLOASSO_CLIENT_ID');
  const secret = env('HELLOASSO_CLIENT_SECRET');
  if (!id || !secret) return echec('HELLOASSO_CLIENT_ID ou HELLOASSO_CLIENT_SECRET manquant.');

  try {
    const r = await fetch(JETON_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
    });
    if (!r.ok) return echec(`Authentification HelloAsso refusée (${r.status}).`);

    const j = (await r.json()) as { access_token: string; expires_in: number };
    jetonEnCours = { valeur: j.access_token, expireA: Date.now() + (j.expires_in - 60) * 1000 };
    return succes(j.access_token);
  } catch (e) {
    return echec(`HelloAsso injoignable : ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function appeler(chemin: string, init?: RequestInit): Promise<Resultat<unknown>> {
  const j = await jetonApi();
  if (!j.ok) return j;

  try {
    const r = await fetch(API + chemin, {
      ...init,
      headers: { ...init?.headers, authorization: `Bearer ${j.valeur}`, 'content-type': 'application/json' },
    });
    const texte = await r.text();
    let corps: unknown;
    try { corps = JSON.parse(texte); } catch { corps = texte; }

    if (!r.ok) {
      // L'API dit précisément ce qu'elle refuse — « Aucune échéance après le 27
      // de chaque mois », par exemple. Perdre ce message pour un « erreur 400 »
      // rendrait la panne indéchiffrable.
      const messages = (corps as { errors?: { message?: string }[] })?.errors
        ?.map((x) => x.message).filter(Boolean).join(' ; ');
      return echec(messages || `HelloAsso a répondu ${r.status}.`);
    }
    return succes(corps);
  } catch (e) {
    return echec(`HelloAsso injoignable : ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface IntentionCreee {
  id: number;
  redirectUrl: string;
}

/**
 * Crée l'intention de paiement et rend l'URL vers laquelle rediriger.
 *
 * `redirectUrl` NE VAUT QUE QUINZE MINUTES : l'intention se crée au moment où
 * l'on clique pour payer, jamais en amont.
 */
export async function creerIntention(a: Achat): Promise<Resultat<IntentionCreee>> {
  let corps: CorpsIntention;
  try {
    corps = corpsIntention(a);
  } catch (e) {
    // construireEcheancier refuse un échéancier hors des bornes de l'API : mieux
    // vaut l'apprendre ici que par un 400 après avoir fait patienter quelqu'un.
    return echec(e instanceof Error ? e.message : String(e));
  }

  const r = await appeler(`/organizations/${ORGANISATION}/checkout-intents`, {
    method: 'POST',
    body: JSON.stringify(corps),
  });
  if (!r.ok) return r;

  const lu = r.valeur as Partial<IntentionCreee>;
  if (!lu?.id || !lu?.redirectUrl) return echec('Réponse inattendue de HelloAsso : ni id ni redirectUrl.');
  return succes({ id: lu.id, redirectUrl: lu.redirectUrl });
}

export interface IntentionLue {
  id: number;
  metadata?: Record<string, unknown>;
  /** Absente tant que le paiement n'est pas autorisé. */
  order?: Record<string, unknown>;
}

/**
 * Relit une intention — le seul témoignage digne de foi de ce qui a été payé.
 *
 * Les paramètres ajoutés à l'URL de retour (`checkoutIntentId`, `code`,
 * `orderId`) sont falsifiables : ils servent à savoir QUOI relire, jamais à
 * décider. La commande n'apparaît ici qu'une fois le paiement autorisé.
 */
export async function lireIntention(id: number | string): Promise<Resultat<IntentionLue>> {
  const r = await appeler(`/organizations/${ORGANISATION}/checkout-intents/${id}`);
  if (!r.ok) return r;
  return succes(r.valeur as IntentionLue);
}
