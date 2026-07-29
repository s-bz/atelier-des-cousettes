/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Session Supabase de la requête, ou null si personne n'est connecté. */
    session: import('@supabase/supabase-js').Session | null;
    /**
     * Ligne « accounts » correspondant à la session. Null si personne n'est
     * connecté, ou si l'identité d'authentification ne correspond à aucun
     * compte — le cas « Compte non reconnu ».
     */
    account: {
      id: string;
      email: string;
      role: 'member' | 'admin';
    } | null;
    /** Rôle lu en base, jamais dans le jeton. */
    isAdmin: boolean;
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_PUBLISHABLE_KEY: string;
  readonly SUPABASE_SECRET_KEY: string;
  readonly RESEND_API_KEY: string;
  readonly ADMIN_EMAILS: string;
  readonly PUBLIC_POSTHOG_KEY: string;
  readonly PUBLIC_POSTHOG_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
