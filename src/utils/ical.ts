/**
 * Fabrique de calendriers iCalendar (RFC 5545).
 *
 * Écrit à la main plutôt que tiré d'une bibliothèque : le besoin tient en trois
 * règles — échapper, plier, terminer les lignes par CRLF — et chacune est
 * vérifiable. Une dépendance pour cela coûterait plus à suivre qu'à écrire.
 *
 * Les trois règles ne sont pas facultatives. Un agenda qui reçoit une ligne mal
 * pliée ou un point-virgule non échappé n'affiche pas un événement bancal : il
 * refuse le fichier entier, souvent sans rien dire.
 */

/** Une ligne physique iCalendar ne dépasse pas 75 octets. */
const LIGNE_MAX = 75;

/**
 * Échappe les caractères que la syntaxe réserve.
 *
 * L'ordre compte : la barre oblique inverse d'abord, sinon on échapperait les
 * barres que l'on vient soi-même d'ajouter.
 *
 * Les retours à la ligne deviennent un « \n » littéral — deux caractères, pas
 * un saut de ligne, qui couperait l'événement en deux propriétés illisibles.
 */
export function echapper(texte: string): string {
  return texte
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Plie une ligne trop longue, en comptant les OCTETS et non les caractères.
 *
 * C'est le piège de ce format pour un calendrier français : « é » occupe deux
 * octets en UTF-8. Compter les caractères laisserait passer des lignes de 75
 * signes et 90 octets, et surtout couperait au milieu d'un caractère — l'agenda
 * recevrait alors une séquence UTF-8 invalide.
 *
 * Les lignes suivantes commencent par une espace, que le lecteur retire en
 * recollant.
 */
export function plier(ligne: string): string {
  const octets = new TextEncoder().encode(ligne);
  if (octets.length <= LIGNE_MAX) return ligne;

  const decodeur = new TextDecoder();
  const morceaux: string[] = [];
  let debut = 0;
  // La première ligne prend 75 octets, les suivantes 74 : l'espace de
  // continuation en consomme un.
  let limite = LIGNE_MAX;

  while (debut < octets.length) {
    let fin = Math.min(debut + limite, octets.length);
    // Ne pas couper au milieu d'un caractère : les octets de continuation UTF-8
    // valent 10xxxxxx, on recule tant qu'on en voit un.
    while (fin > debut && fin < octets.length && (octets[fin] & 0xc0) === 0x80) fin--;
    morceaux.push(decodeur.decode(octets.subarray(debut, fin)));
    debut = fin;
    limite = LIGNE_MAX - 1;
  }

  return morceaux.join('\r\n ');
}

/** Un instant au format iCalendar UTC : 20260917T120000Z. */
export function horodatage(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export interface Evenement {
  /** Identifiant stable : c'est lui qui distingue une mise à jour d'un doublon. */
  uid: string;
  debut: Date;
  fin: Date;
  titre: string;
  description?: string;
  lieu?: string;
  url?: string;
  /** Une séance annulée reste dans le flux, barrée, plutôt que de disparaître. */
  annule?: boolean;
}

/**
 * Assemble un calendrier complet.
 *
 * `genere` est passé en paramètre plutôt que lu de l'horloge : un DTSTAMP qui
 * change à chaque requête ferait voir une modification à chaque
 * rafraîchissement, et rend le résultat intestable.
 */
export function construireCalendrier(options: {
  nom: string;
  description?: string;
  evenements: Evenement[];
  genere: Date;
}): string {
  const { nom, description, evenements, genere } = options;
  const stamp = horodatage(genere);

  const lignes: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Atelier des Cousettes//Seances//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${echapper(nom)}`,
    'X-WR-TIMEZONE:Europe/Paris',
    // Deux formulations de la même demande : la première est standard, la
    // seconde est celle qu'Outlook et Apple lisent réellement. Google, lui,
    // rafraîchit à son rythme quoi qu'on écrive.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  if (description) lignes.push(`X-WR-CALDESC:${echapper(description)}`);

  for (const e of evenements) {
    lignes.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${horodatage(e.debut)}`,
      `DTEND:${horodatage(e.fin)}`,
      `SUMMARY:${echapper(e.titre)}`,
    );
    if (e.description) lignes.push(`DESCRIPTION:${echapper(e.description)}`);
    if (e.lieu) lignes.push(`LOCATION:${echapper(e.lieu)}`);
    // L'URL n'est pas cliquable partout ; elle est donc AUSSI dans la
    // description, où tous les agendas la rendent.
    if (e.url) lignes.push(`URL:${e.url}`);
    if (e.annule) lignes.push('STATUS:CANCELLED');
    lignes.push('END:VEVENT');
  }

  lignes.push('END:VCALENDAR');

  // CRLF partout, y compris à la fin : la RFC l'exige et certains lecteurs
  // ignorent le dernier événement d'un fichier qui s'achève sans.
  return lignes.map(plier).join('\r\n') + '\r\n';
}
