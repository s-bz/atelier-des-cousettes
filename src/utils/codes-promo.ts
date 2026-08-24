import type { SupabaseClient } from '@supabase/supabase-js';
import type { Resultat } from './inscriptions';

/**
 * Les codes de réduction.
 *
 * ILS NE PORTENT QUE SUR LE FORFAIT. L'adhésion est une cotisation à
 * l'association, pas un prix qu'on négocie : la remettre reviendrait à inscrire
 * quelqu'un sans qu'il adhère. Le plafond de la réduction est donc le prix du
 * forfait, jamais le total.
 *
 * ILS VALENT PAR INSCRIPTION, non par famille. Une mère qui inscrit ses deux
 * filles l'emploie deux fois — c'est bien deux forfaits qu'elle règle.
 *
 * L'USAGE SE COMPTE AU PROVISIONNEMENT, pas à la création de l'intention : un
 * panier abandonné ne doit pas consommer un code à tirage limité.
 */

const echec = (erreur: string): Resultat<never> => ({ ok: false, erreur });
const succes = <T>(valeur: T): Resultat<T> => ({ ok: true, valeur });

export interface CodePromo {
  code: string;
  reductionPourcent: number | null;
  reductionCents: number | null;
  /** Nul : valable quelle que soit la saison. */
  saison: string | null;
  /** Nul : sans limite de tirage. */
  usagesMax: number | null;
  usages: number;
  /** Dernier jour de validité, inclus. */
  expireLe: string | null;
}

/** Les codes se disent à l'oral et se recopient : ni casse ni espaces. */
export function normaliserCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Ce que ce code retranche au forfait, ou pourquoi il ne s'applique pas.
 *
 * Le message d'échec part à l'écran : « code invalide » ferait ressaisir le
 * même code, alors qu'« expiré » ou « épuisé » ferme la question.
 */
export function reductionDe(
  prixForfaitCents: number,
  code: CodePromo,
  o: { saison: string; aujourdhui: Date },
): Resultat<number> {
  if (code.saison && code.saison !== o.saison) {
    return echec(`Ce code ne vaut pas pour la saison ${o.saison}.`);
  }

  if (code.expireLe) {
    // Le dernier jour est inclus : « valable jusqu'au 1er septembre » se
    // comprend comme « le 1er compris », et l'inverse ferait des mécontents.
    const jour = o.aujourdhui.toISOString().slice(0, 10);
    if (jour > code.expireLe) return echec('Ce code a expiré.');
  }

  if (code.usagesMax !== null && code.usages >= code.usagesMax) {
    return echec('Ce code n’est plus disponible.');
  }

  const brute = code.reductionPourcent !== null
    ? Math.round(prixForfaitCents * code.reductionPourcent / 100)
    : code.reductionCents;

  if (!brute || brute <= 0) return echec('Ce code ne s’applique pas.');

  // JAMAIS AU-DELÀ DU FORFAIT : un montant fixe supérieur au prix déborderait
  // sinon sur l'adhésion, qui ne se remise pas.
  return succes(Math.min(brute, prixForfaitCents));
}

/** Le code tel qu'il est en base, ou rien. Un code archivé n'existe plus. */
export async function lireCode(
  supabase: SupabaseClient,
  code: string,
): Promise<CodePromo | null> {
  const { data } = await supabase
    .from('codes_promo')
    .select('code, reduction_pourcent, reduction_cents, saison, usages_max, usages, expire_le')
    .eq('code', normaliserCode(code))
    .is('archived_at', null)
    .maybeSingle();

  if (!data) return null;
  return {
    code: data.code,
    reductionPourcent: data.reduction_pourcent,
    reductionCents: data.reduction_cents,
    saison: data.saison,
    usagesMax: data.usages_max,
    usages: data.usages,
    expireLe: data.expire_le,
  };
}

/**
 * Compte un usage, une fois le paiement acquis.
 *
 * Idempotent par l'appelant : le provisionnement ne s'exécute qu'une fois par
 * commande, l'unicité de `subscriptions.helloasso_order_id` s'en portant garante.
 */
export async function compterUsage(supabase: SupabaseClient, code: string): Promise<void> {
  await supabase.rpc('incrementer_usage_code', { p_code: normaliserCode(code) });
}
