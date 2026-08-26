import type { SupabaseClient } from '@supabase/supabase-js';
import type { Resultat } from './inscriptions';
import { euros } from './stages';

/**
 * Les règlements par chèque ou en espèces.
 *
 * CE N'EST PAS UNE REMISE, ET C'EST TOUT LE POINT. Un code de réduction à 100 %
 * en tenait lieu : la commande partait à zéro euro, et les livres annonçaient
 * une place offerte là où l'association avait encaissé trois cent trente-neuf
 * euros. Une remise réduit ce qui est dû ; un règlement hors ligne atteste que
 * ce qui était dû a été réglé ailleurs. Les prix, ici, ne bougent pas d'un
 * centime : le forfait vaut son prix, l'adhésion le sien, et le registre des
 * adhérents reçoit les quinze euros que la famille a bel et bien versés.
 *
 * LE CODE EST LE REÇU. Pour un paiement par carte, HelloAsso tient le registre.
 * Pour un chèque, il n'existait aucune trace nulle part — ces lignes sont le
 * livre de caisse qui manquait.
 *
 * L'ARGENT EST DÉJÀ LÀ. Isabelle ne remet le code qu'une fois le chèque en
 * main : il n'y a pas d'état « en attente d'encaissement » à tenir.
 */

const echec = (erreur: string): Resultat<never> => ({ ok: false, erreur });
const succes = <T>(valeur: T): Resultat<T> => ({ ok: true, valeur });

export type MoyenHorsLigne = 'cheque' | 'especes';

export interface ReglementHorsLigne {
  code: string;
  moyen: MoyenHorsLigne;
  /** Ce qu'Isabelle a REÇU, en centimes. */
  montantCents: number;
  saison: string;
  encaisseLe: string;
  /** Nul tant que personne ne s'en est servi. */
  utiliseLe: string | null;
  /** Nul : sans date limite. */
  expireLe: string | null;
}

/** Les codes se disent à l'oral et se recopient : ni casse ni espaces. */
export function normaliserCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Pourquoi un règlement ne vaut plus — ou qu'il vaut encore. */
export type EtatReglement = 'disponible' | 'hors-saison' | 'expire' | 'utilise';

/**
 * L'état d'un règlement, indépendamment de tout prix.
 *
 * COMME POUR LES CODES DE RÉDUCTION, une seule fonction décide des deux côtés :
 * ce qu'Isabelle lit dans sa liste est ce que la famille lit à l'écran. Un
 * règlement rangé sous « disponible » pendant que l'achat le refuse l'enverrait
 * chercher une panne qui n'existe pas.
 */
export function etatDe(
  r: ReglementHorsLigne,
  o: { saison: string; aujourdhui: Date },
): EtatReglement {
  if (r.saison !== o.saison) return 'hors-saison';
  if (r.utiliseLe) return 'utilise';

  if (r.expireLe) {
    // Le dernier jour est inclus, comme partout ailleurs.
    const jour = o.aujourdhui.toISOString().slice(0, 10);
    if (jour > r.expireLe) return 'expire';
  }

  return 'disponible';
}

/**
 * Ce règlement paie-t-il cette inscription ?
 *
 * LE MONTANT DOIT TOMBER JUSTE, ET L'ÉCART ARRÊTE L'ACHAT.
 *
 * Le code a été créé pour une somme reçue : trois cent trente-neuf euros de
 * chèque paient un forfait de neuf séances, adhésion comprise, et rien d'autre.
 * Laisser passer un forfait de dix-huit séances reviendrait à en offrir la
 * moitié sans que personne l'ait décidé. Isabelle émet un nouveau code si la
 * famille change d'avis — c'est un geste de quelques secondes, et il laisse une
 * trace juste dans le livre de caisse.
 *
 * Le message nomme LES DEUX chiffres : « ce code ne marche pas » ferait
 * ressaisir le même code, alors que voir 339 contre 546 explique tout.
 */
export function verifierReglement(
  totalCents: number,
  r: ReglementHorsLigne,
  o: { saison: string; aujourdhui: Date },
): Resultat<null> {
  switch (etatDe(r, o)) {
    case 'hors-saison': return echec(`Ce code ne vaut pas pour la saison ${o.saison}.`);
    case 'expire': return echec('Ce code a expiré.');
    case 'utilise': return echec('Ce code a déjà servi à une inscription.');
  }

  if (r.montantCents !== totalCents) {
    return echec(
      `Ce code correspond à un règlement de ${euros(r.montantCents)} €, `
      + `mais cette inscription en coûte ${euros(totalCents)} €. `
      + `Écrivez-nous : nous ajusterons.`,
    );
  }

  return succes(null);
}

/** Le règlement tel qu'il est en base, ou rien. Un code archivé n'existe plus. */
export async function lireReglement(
  supabase: SupabaseClient,
  code: string,
): Promise<ReglementHorsLigne | null> {
  const { data } = await supabase
    .from('reglements_hors_ligne')
    .select('code, moyen, montant_cents, saison, encaisse_le, utilise_le, expire_le')
    .eq('code', normaliserCode(code))
    .is('archived_at', null)
    .maybeSingle();

  if (!data) return null;
  return {
    code: data.code,
    moyen: data.moyen,
    montantCents: data.montant_cents,
    saison: data.saison,
    encaisseLe: data.encaisse_le,
    utiliseLe: data.utilise_le,
    expireLe: data.expire_le,
  };
}

/**
 * Consomme le code, AVANT de provisionner — l'inverse d'un code de réduction.
 *
 * Celui-ci se compte après le paiement, l'unicité de
 * `subscriptions.helloasso_order_id` empêchant le doublon. Ici il n'y a pas de
 * paiement, et chaque tentative forge sa propre référence : rien n'empêcherait
 * deux onglets d'inscrire deux fois la même famille sur le même chèque. C'est
 * la base qui arbitre, par un `update … where utilise_le is null`.
 *
 * CONSOMMER D'ABORD SIGNIFIE QU'UN ÉCHEC ENSUITE BRÛLE LE CODE. C'est le sens
 * du risque qu'il faut choisir : un code brûlé se réémet en dix secondes, une
 * famille inscrite deux fois se démêle à la main dans quatre tables.
 */
export async function consommerReglement(
  supabase: SupabaseClient,
  code: string,
  reference: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('consommer_reglement_hors_ligne', {
    p_code: normaliserCode(code),
    p_reference: reference,
  });

  if (error) {
    console.error(`[hors-ligne] ${normaliserCode(code)} non consommé :`, error.message);
    return false;
  }
  return data === true;
}
