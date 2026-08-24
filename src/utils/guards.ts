import type { AstroGlobal } from 'astro';

/**
 * Garde des écrans d'administration.
 *
 * Renvoie une `Response` à retourner immédiatement, ou `null` si l'accès est
 * accordé. À appeler en TÊTE de chaque page d'admin :
 *
 *   const garde = requireAdmin(Astro);
 *   if (garde) return garde;
 *
 * Le rôle vient de `Astro.locals`, que le middleware a lu EN BASE. Il ne
 * provient jamais d'une revendication du jeton : les métadonnées d'un
 * utilisateur Supabase sont modifiables par l'utilisateur lui-même.
 *
 * CETTE GARDE EST LA SÉCURITÉ, ET NON UNE COMMODITÉ.
 *
 * On a longtemps écrit ici l'inverse — que le RLS rattraperait une page
 * distraite. Ce n'est pas vrai du système déployé : `getServerClient`, le seul
 * client porté par le jeton de l'adhérent et donc soumis aux politiques, n'est
 * appelé nulle part. Toutes les routes lisent avec `getAdminClient`, dont la
 * clé secrète contourne le RLS par construction.
 *
 * Une page d'administration qui oublierait cet appel exposerait donc les
 * données de tous, sans filet. Le RLS reste une défense en profondeur pour un
 * accès direct à PostgREST ; il n'en est pas une pour nos propres routes.
 */
export function requireAdmin(astro: AstroGlobal): Response | null {
  const { session, account, isAdmin } = astro.locals;

  if (!session || !account) {
    return astro.redirect('/espace-membre/connexion/');
  }
  if (!isAdmin) {
    // 403 plutôt qu'une redirection : la personne est bien connectée, mais
    // n'a simplement pas ce droit. La renvoyer vers la connexion laisserait
    // croire à un problème de session et ferait boucler.
    return new Response('Accès réservé à l’administration.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  return null;
}
