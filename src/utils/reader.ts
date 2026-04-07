import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

export const reader = createReader(process.cwd(), keystaticConfig);

/**
 * Read site settings + derive siteUrl from Astro.site.
 * Reduces the `settings + siteUrl` boilerplate repeated in every page.
 */
export async function getPageContext(site: URL | undefined) {
  const settings = await reader.singletons.siteSettings.read();
  const siteUrl = site?.origin ?? '';
  return { settings, siteUrl };
}
