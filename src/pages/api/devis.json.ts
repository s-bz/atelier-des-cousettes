import type { APIRoute } from 'astro';
import { getAdminClient } from '../../utils/supabase';
import { lireCatalogueFormules } from '../../utils/tarifs';
import { adhesionDuePour, devis } from '../../utils/achat';

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

  return new Response(
    JSON.stringify(devis({
      formule,
      adhesionDue,
      comptant: url.searchParams.get('comptant') === '1',
      achatLe: new Date(),
    })),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
  );
};
