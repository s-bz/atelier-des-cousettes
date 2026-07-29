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
  return redirect('/espace-membre/connexion/', 303);
};
