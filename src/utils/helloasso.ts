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
