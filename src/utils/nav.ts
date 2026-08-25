/**
 * Cross-link definitions for service pages.
 * Each service page links to the other services.
 */
export const SERVICE_LINKS = [
  { href: '/ateliers-reguliers/', label: 'Ateliers réguliers' },
  { href: '/stages-thematiques/', label: 'Stages thématiques' },
  { href: '/seances-sans-engagement/', label: 'Séances sans engagement' },
] as const;

/** Return service links excluding the current page's href. */
export function getCrossLinks(excludeHref: string) {
  return SERVICE_LINKS.filter((l) => l.href !== excludeHref);
}

/**
 * Le chemin où revenir après s'être connecté.
 *
 * N'ACCEPTE QU'UN CHEMIN INTERNE. Une adresse absolue — ou un « // » que le
 * navigateur lit comme un hôte — ferait de la page de connexion un tremplin
 * vers un site tiers : on se connecte chez nous, on atterrit ailleurs, et le
 * lien avait l'air d'être le nôtre. Le refus est silencieux et retombe sur
 * l'espace adhérent, qui est toujours une destination valable.
 */
export function suiteSure(brut: string | null | undefined): string {
  if (!brut) return '/espace-membre/';
  if (!brut.startsWith('/') || brut.startsWith('//')) return '/espace-membre/';
  return brut;
}
