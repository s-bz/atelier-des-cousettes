/**
 * Cross-link definitions for service pages.
 * Each service page links to the other services.
 */
export const SERVICE_LINKS = [
  { href: '/ateliers-reguliers/', label: 'Ateliers réguliers' },
  { href: '/stages-thematiques/', label: 'Stages thématiques' },
  { href: '/un-apres-midi-couture/', label: 'Un après-midi couture' },
] as const;

/** Return service links excluding the current page's href. */
export function getCrossLinks(excludeHref: string) {
  return SERVICE_LINKS.filter((l) => l.href !== excludeHref);
}
