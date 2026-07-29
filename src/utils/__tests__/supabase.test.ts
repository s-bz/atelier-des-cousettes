import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { toSlug } from '../strings';

const clientSource = readFileSync('src/utils/supabase.ts', 'utf8');

/** Noms de variables réellement exigés par le code, hors commentaires. */
const requiredEnvNames = [...clientSource.matchAll(/requireEnv\('([A-Z0-9_]+)'\)/g)].map(
  ([, name]) => name,
);

describe('client Supabase', () => {
  it('exige exactement les trois variables attendues', () => {
    expect(new Set(requiredEnvNames)).toEqual(
      new Set(['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY']),
    );
  });

  it("n'expose aucune variable Supabase au navigateur", () => {
    // Astro n'expose au client que les variables préfixées PUBLIC_. On teste
    // les noms réellement consommés, pas le texte du fichier — sans quoi une
    // simple mention de PUBLIC_ dans un commentaire ferait échouer le test.
    expect(requiredEnvNames.filter((n) => n.startsWith('PUBLIC_'))).toEqual([]);
    expect(clientSource).not.toMatch(/import\.meta\.env\.PUBLIC_|process\.env\.PUBLIC_/);
  });

  it("n'utilise pas les clés héritées anon / service_role", () => {
    // Supabase les retire d'ici fin 2026 au profit de sb_publishable_ / sb_secret_.
    expect(requiredEnvNames.filter((n) => /ANON_KEY|SERVICE_ROLE/.test(n))).toEqual([]);
  });

  it('lève une erreur explicite quand une variable manque', () => {
    expect(clientSource).toMatch(/Variable d'environnement manquante/);
  });
});

describe('amorçage des créneaux', () => {
  const seedFile = readdirSync('supabase/migrations').find((f) => f.endsWith('_seed_creneaux.sql'));

  it('trouve la migration d’amorçage', () => {
    expect(seedFile).toBeDefined();
  });

  it('donne à chaque créneau un identifiant égal à toSlug(label)', () => {
    // Les ancres du site public sont construites avec toSlug(name). Si les deux
    // divergent, les liens profonds vers un créneau cassent en silence.
    const sql = readFileSync(`supabase/migrations/${seedFile}`, 'utf8');
    const pairs = [...sql.matchAll(/\('([a-z0-9-]+)',\s*'([^']+)',/g)];

    expect(pairs.length).toBe(7);
    for (const [, id, label] of pairs) {
      expect(toSlug(label)).toBe(id);
    }
  });
});
