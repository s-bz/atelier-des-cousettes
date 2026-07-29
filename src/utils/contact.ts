/**
 * Lien WhatsApp à partir d'un numéro saisi à la main.
 *
 * Isabelle note les numéros comme elle les entend : « 06 12 34 56 78 »,
 * « 06.12.34.56.78 », parfois « +33 6 12 34 56 78 ». WhatsApp n'accepte que
 * l'international sans séparateur ni plus : 33612345678.
 *
 * Renvoie null plutôt qu'un lien douteux quand le numéro n'est pas
 * reconnaissable : un bouton qui ouvre une conversation avec un inconnu est
 * pire qu'un bouton absent.
 */
export function lienWhatsApp(numero: string | null | undefined): string | null {
  if (!numero) return null;

  const chiffres = numero.replace(/[^\d+]/g, '');

  let international: string | null = null;

  if (chiffres.startsWith('+')) {
    international = chiffres.slice(1);
  } else if (chiffres.startsWith('00')) {
    international = chiffres.slice(2);
  } else if (/^0\d{9}$/.test(chiffres)) {
    // Numéro français à dix chiffres : le 0 initial devient l'indicatif 33.
    international = `33${chiffres.slice(1)}`;
  } else if (/^33\d{9}$/.test(chiffres)) {
    international = chiffres;
  }

  // Un indicatif plausible fait au moins huit chiffres et rarement plus de
  // quinze — la limite de la norme E.164.
  if (!international || !/^\d{8,15}$/.test(international)) return null;

  return `https://wa.me/${international}`;
}

/** Lien mailto, ou null si l'adresse est absente. */
export function lienEmail(adresse: string | null | undefined): string | null {
  if (!adresse || !adresse.includes('@')) return null;
  return `mailto:${adresse}`;
}
