import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Accès Supabase strictement côté serveur.
 *
 * Aucune variable n'est préfixée PUBLIC_ : Astro n'expose au navigateur que les
 * variables portant ce préfixe, si bien que le nommage seul garantit qu'aucune
 * clé ne peut fuir côté client. C'est aussi ce qui permet de n'apporter aucune
 * modification à la CSP (src/config/csp.js) : le navigateur ne contacte jamais
 * supabase.co.
 *
 * Clés : sb_publishable_… et sb_secret_…, et non les clés héritées anon /
 * service_role, que Supabase retire d'ici fin 2026.
 */

function requireEnv(name: string): string {
  const value = import.meta.env?.[name] ?? process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

/**
 * Client porté par la session de l'adhérent : le RLS s'applique pleinement.
 *
 * `accessToken` est le JWT de l'utilisateur. Les clés sb_publishable_… ne sont
 * pas des JWT et ne peuvent donc jamais figurer dans l'en-tête Authorization,
 * qui reste réservé au jeton de session.
 */
export function getServerClient(accessToken?: string): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
  });
}

/**
 * Client d'administration. Contourne le RLS — réservé aux routes déjà protégées
 * par une vérification du rôle admin lue en base. Ne jamais l'utiliser dans une
 * route accessible à un adhérent.
 */
export function getAdminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
