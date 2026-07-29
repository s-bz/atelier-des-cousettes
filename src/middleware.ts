import { defineMiddleware } from 'astro:middleware';
import { getRequestClient, getAdminClient } from './utils/supabase';

/**
 * Résout la session et le compte pour chaque requête à l'espace membre.
 *
 * Deux principes :
 *
 *   1. Le rôle est TOUJOURS lu en base, jamais dans le jeton. Les métadonnées
 *      d'un utilisateur Supabase sont modifiables par l'utilisateur lui-même
 *      et ne peuvent donc pas fonder une autorisation.
 *
 *   2. Rien n'est jamais créé ici. Une identité d'authentification sans ligne
 *      « accounts » correspondante laisse `account` à null : c'est le cas
 *      « Compte non reconnu », traité par les pages, pas par une création
 *      implicite.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.session = null;
  context.locals.account = null;
  context.locals.isAdmin = false;

  // Les pages publiques sont prérendues : le middleware s'exécute alors au
  // moment du build, sans requête réelle. On sort immédiatement — et surtout
  // sans lever d'erreur, sinon le build entier échouerait.
  if (!context.url.pathname.startsWith('/espace-membre')) {
    return next();
  }

  try {
    const supabase = getRequestClient(context.request, context.cookies);

    // getUser() revalide le jeton auprès de Supabase. getSession() se
    // contenterait de lire le cookie, qui n'est pas une preuve.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return next();

    const { data: { session } } = await supabase.auth.getSession();
    context.locals.session = session;

    // Lecture avec la clé secrète : le compte doit pouvoir être résolu même
    // lorsqu'aucune politique RLS ne s'applique encore à cette requête.
    const admin = getAdminClient();
    const { data: account } = await admin
      .from('accounts')
      .select('id, email, role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (account) {
      context.locals.account = account;
      context.locals.isAdmin = account.role === 'admin';
    }
  } catch (error) {
    // Une panne d'authentification ne doit pas rendre le site inaccessible :
    // la requête continue en visiteur anonyme et les gardes feront leur office.
    console.error('[middleware] résolution de session impossible :', error);
  }

  return next();
});
