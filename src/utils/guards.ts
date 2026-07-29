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
 * Cette garde est une commodité, pas la sécurité : celle-ci tient aux
 * politiques RLS et aux droits d'exécution des fonctions. Une page qui
 * oublierait de l'appeler ne doit pas pouvoir exposer les données de tous.
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
