import type { APIRoute } from 'astro';
import { getAdminClient } from '../../utils/supabase';
import { lireCatalogueFormules } from '../../utils/tarifs';
import { adhesionDuePour, devis } from '../../utils/achat';
import { lireCode, reductionDe } from '../../utils/codes-promo';
import { saisonDe } from '../../utils/inscriptions';

export const prerender = false;

/**
 * Ce que coûtera l'inscription, pendant qu'on la remplit.
 *
 * LE CALCUL RESTE ICI. `construireEcheancier` produira l'échéancier réellement
 * envoyé à HelloAsso ; le refaire en JavaScript donnerait deux arithmétiques à
 * tenir d'accord, et le jour où elles divergeraient, la page annoncerait un
 * montant que le prélèvement démentirait.
 *
 * CE QUE CETTE ROUTE RÉVÈLE, et qu'il faut assumer : répondre « adhésion non
 * due » pour une adresse apprend qu'une famille l'a réglée cette saison. C'est
 * le même aveu que tout « cette adresse est déjà inscrite », et il est ici
 * volontaire — sans lui, une famille qui revient lirait qu'elle va payer 15 €
 * de plus. Rien d'autre ne sort : ni nom, ni participant, ni historique.
 */
export const GET: APIRoute = async ({ url }) => {
  const supabase = getAdminClient();
  const formules = await lireCatalogueFormules(supabase);
  const formule = formules.find((f) => f.id === url.searchParams.get('formule'));

  if (!formule) {
    return new Response(JSON.stringify({ erreur: 'Formule inconnue.' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    });
  }

  const email = url.searchParams.get('email');
  // Une adresse encore incomplète ne vaut pas un « non » : tant qu'on ne sait
  // pas, l'adhésion est annoncée due — l'annoncer par excès vaut mieux que de
  // la découvrir au moment de payer.
  const adhesionDue = await adhesionDuePour(supabase, email && email.includes('@') ? email : null);

  /*
   * LE CODE EST ÉVALUÉ ICI AUSSI, pour que le devis dise la vérité avant le
   * clic. Il sera revalidé à la création de l'intention : c'est là que le
   * montant engage, et un devis n'engage rien.
   */
  const saisi = url.searchParams.get('code');
  let reductionCents = 0;
  let codeErreur: string | null = null;

  if (saisi?.trim()) {
    const saison = saisonDe(new Date());
    const code = await lireCode(supabase, saisi);
    if (!code) codeErreur = 'Ce code n’existe pas.';
    else {
      const r = reductionDe(formule.prixCents, code, { saison, aujourdhui: new Date() });
      if (r.ok) reductionCents = r.valeur;
      else codeErreur = r.erreur;
    }
  }

  return new Response(
    JSON.stringify({
      ...devis({
        formule,
        adhesionDue,
        comptant: url.searchParams.get('comptant') === '1',
        achatLe: new Date(),
        reductionCents,
      }),
      codeErreur,
    }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
  );
};
