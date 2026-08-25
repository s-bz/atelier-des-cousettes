import type { APIRoute } from 'astro';
import { getAdminClient } from '../../utils/supabase';
import { devisUnite } from '../../utils/achat-unite';
import { lireCode, reductionDe } from '../../utils/codes-promo';
import { saisonDe } from '../../utils/inscriptions';

export const prerender = false;

/**
 * Ce que coûtera une place, pendant qu'on remplit le formulaire.
 *
 * BEAUCOUP PLUS SIMPLE QUE LE DEVIS D'UN FORFAIT : une place, un prix, pas
 * d'échéancier et pas d'adhésion — elle est comprise. Ne reste que le code, qui
 * mérite d'être évalué ici pour que le montant affiché dise la vérité avant le
 * clic plutôt que de se découvrir sur la page de paiement.
 *
 * LE PRIX VIENT DE LA BASE, jamais du formulaire : celui-ci porte des montants
 * pour les afficher, et s'en servir laisserait choisir ce qu'on paie.
 */
export const GET: APIRoute = async ({ url }) => {
  const supabase = getAdminClient();

  const refus = (erreur: string, status = 400) => new Response(
    JSON.stringify({ erreur }),
    { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
  );

  const sessionId = url.searchParams.get('session');
  if (!sessionId) return refus('Choisissez une date.');

  const { data } = await supabase
    .from('sessions')
    .select('unit_price_cents, creneaux!inner(default_unit_price_cents, a_l_unite)')
    .eq('id', sessionId)
    .eq('status', 'scheduled')
    .maybeSingle();

  const seance = data as unknown as {
    unit_price_cents: number | null;
    creneaux: { default_unit_price_cents: number | null; a_l_unite: boolean } | null;
  } | null;

  if (!seance?.creneaux?.a_l_unite) return refus('Cette date n’est pas en vente.');

  const prixCents = seance.unit_price_cents ?? seance.creneaux.default_unit_price_cents ?? 0;
  if (prixCents <= 0) return refus('Cette date n’a pas de tarif.');

  const saisi = url.searchParams.get('code');
  let reductionCents = 0;
  let codeErreur: string | null = null;

  if (saisi?.trim()) {
    const code = await lireCode(supabase, saisi);
    if (!code) codeErreur = 'Ce code n’existe pas.';
    else {
      const r = reductionDe(prixCents, code, { saison: saisonDe(new Date()), aujourdhui: new Date() });
      if (r.ok) reductionCents = r.valeur;
      else codeErreur = r.erreur;
    }
  }

  return new Response(
    JSON.stringify({ ...devisUnite(prixCents, reductionCents), codeErreur }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
  );
};
