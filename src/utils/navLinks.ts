export const navLinks = [
  { href: '/stages-thematiques/', label: 'Stages thématiques' },
  { href: '/ateliers-reguliers/', label: 'Ateliers réguliers' },
  { href: '/seances-sans-engagement/', label: 'Séances sans engagement' },
  { href: '/la-couturiere/', label: 'La couturière' },
  { href: '/mes-creations/', label: 'Mes créations' },
  { href: '/blog/', label: 'Blog' },
];

/**
 * Les liens du pied de page : ceux du menu, plus le glossaire.
 *
 * LE GLOSSAIRE N'EST PAS DANS LA BARRE DU HAUT, et c'est une question de place :
 * six liens y tiennent déjà à côté du bouton de contact, un septième ferait
 * passer la navigation au menu replié sur les écrans intermédiaires.
 *
 * Il lui faut pourtant un lien depuis chaque page, sans quoi ses quarante fiches
 * ne seraient atteignables que par le plan du site — et ce site sait ce que ça
 * coûte : ses articles les plus anciens sont restés « détectés, actuellement non
 * indexés » pour cette raison exacte. Le pied de page est présent partout lui
 * aussi, et il a la place.
 */
export const footerLinks = [
  ...navLinks,
  { href: '/glossaire/', label: 'Glossaire' },
];
