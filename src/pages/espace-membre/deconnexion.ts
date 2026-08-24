import type { APIRoute } from 'astro';
import { getRequestClient } from '../../utils/supabase';

export const prerender = false;

/**
 * Déconnexion. En POST uniquement : une déconnexion en GET peut être
 * déclenchée par une simple image ou un lien préchargé, et déconnecterait
 * l'adhérent sans qu'il l'ait demandé.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = getRequestClient(request, cookies);
  await supabase.auth.signOut();
  /*
   * `deconnecte=1` N'EST PAS DÉCORATIF. La mesure d'audience identifie
   * l'adhérent connecté par son adresse ; sans ce signal au retour, l'identité
   * survivrait dans le navigateur et l'ordinateur familial attribuerait à la
   * mère ce que la fille consulte ensuite. C'est le seul moment où l'on sait
   * qu'il faut oublier quelqu'un. Voir BaseLayout.astro.
   */
  return redirect('/espace-membre/connexion/?deconnecte=1', 303);
};
