import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

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

/**
 * Client lié à la requête, dont la session vit dans des cookies httpOnly.
 *
 * C'est ce client qui sert à ouvrir et fermer une session. Les cookies étant
 * posés et lus côté serveur uniquement, aucun jeton n'est accessible au
 * JavaScript de la page — et le navigateur ne contacte jamais supabase.co,
 * ce qui laisse la CSP inchangée.
 */
export function getRequestClient(request: Request, cookies: AstroCookies): SupabaseClient {
  return createServerClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          // AstroCookies n'expose pas d'énumération : on lit l'en-tête brut.
          const header = request.headers.get('cookie');
          if (!header) return [];
          return header
            .split(';')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => {
              const eq = part.indexOf('=');
              return eq === -1
                ? { name: part, value: '' }
                : { name: part.slice(0, eq), value: decodeURIComponent(part.slice(eq + 1)) };
            });
        },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            cookies.set(name, value, {
              ...(options as CookieOptions),
              // Imposé, quoi que propose la bibliothèque : le jeton de session
              // ne doit jamais être lisible par le JavaScript de la page.
              httpOnly: true,
              sameSite: 'lax',
              secure: import.meta.env.PROD,
              path: '/',
            });
          }
        },
      },
    },
  );
}
