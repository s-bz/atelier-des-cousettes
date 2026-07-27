import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import keystaticConfig from '../../../keystatic.config';

/**
 * Guards the Keystatic *round-trip* for collection image fields.
 *
 * Keystatic derives an asset's filename by slicing a prefix off the stored value:
 *
 *   filename = value.slice(getSrcPrefix(publicPath, slug).length)
 *   getSrcPrefix = (publicPath, slug) => `${publicPath}/${slug ? slug + '/' : ''}`
 *
 * For a *collection* entry the entry slug is part of that prefix, but the asset
 * itself is written flat into `directory` (no slug). Get that wrong and the
 * lookup misses, `parse()` returns null, the Image field renders empty, and every
 * save emits a deletion for a path that was never in the tree.
 *
 * The site-side resolver (`resolveImagePath`) has an `endsWith` fallback that
 * masks all of this, so a rendering test cannot catch it — only this can.
 */
describe('Keystatic collection image round-trip', () => {
  const collections = Object.entries(keystaticConfig.collections ?? {});

  for (const [name, collection] of collections) {
    const contentDir = (collection.path as string).replace(/\/?\*+$/, '');
    const imageFields = Object.entries(collection.schema).filter(
      ([, field]) => (field as { formKind?: string }).formKind === 'asset',
    );

    if (!imageFields.length || !existsSync(contentDir)) continue;

    for (const [fieldName, field] of imageFields) {
      const schema = field as {
        directory?: string;
        filename: (v: unknown, args: { slug: string; suggestedFilenamePrefix: undefined }) => string | undefined;
      };

      describe(`${name}.${fieldName}`, () => {
        const entries = readdirSync(contentDir, { withFileTypes: true });

        for (const entry of entries) {
          const slug = entry.isDirectory() ? entry.name : entry.name.replace(/\.(yaml|yml|mdoc)$/, '');
          const file = entry.isDirectory()
            ? `${contentDir}/${entry.name}/index.yaml`
            : `${contentDir}/${entry.name}`;
          if (!existsSync(file)) continue;

          const raw = readFileSync(file, 'utf8');
          const match = raw.match(new RegExp(`^${fieldName}:\\s*(.+)$`, 'm'));
          const value = match?.[1]?.trim();
          if (!value || value === 'null' || value === "''") continue;

          it(`${slug}: stored value resolves to a file that exists on disk`, () => {
            const derived = schema.filename(value, { slug, suggestedFilenamePrefix: undefined });

            expect(derived, `${slug}: derived an empty filename from "${value}"`).toBeTruthy();

            const assetPath = `${schema.directory}/${slug}/${derived}`;
            expect(
              existsSync(assetPath),
              `${slug}: Keystatic would look for "${assetPath}" (derived from "${value}"), which does not exist. ` +
                `Collection assets live at "<directory>/<slug>/<filename>" and the stored value must be ` +
                `"<publicPath>/<slug>/<filename>".`,
            ).toBe(true);
          });
        }
      });
    }
  }
});
