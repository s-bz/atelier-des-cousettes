import { describe, expect, it } from 'vitest';
import { construireCalendrier, echapper, horodatage, plier } from '../ical';

/** Longueur en octets, l'unité que la RFC 5545 impose pour le pliage. */
const octets = (s: string) => new TextEncoder().encode(s).length;

describe('echapper', () => {
  it('échappe les caractères réservés du format', () => {
    expect(echapper('Revel; 14h, 3 places')).toBe('Revel\\; 14h\\, 3 places');
  });

  it('échappe la barre oblique inverse avant tout le reste', () => {
    // Dans l'autre ordre, on échapperait les barres qu'on vient d'ajouter et
    // « ; » deviendrait « \\\\; » : le lecteur y verrait une barre littérale
    // suivie d'un séparateur de propriété, et couperait l'événement.
    expect(echapper('a\\b;c')).toBe('a\\\\b\\;c');
  });

  it('transforme un saut de ligne en « \\n » littéral', () => {
    expect(echapper('Marie\nRobert')).toBe('Marie\\nRobert');
    expect(echapper('Marie\r\nRobert')).toBe('Marie\\nRobert');
  });
});

describe('plier', () => {
  it('laisse une ligne courte intacte', () => {
    expect(plier('SUMMARY:Atelier')).toBe('SUMMARY:Atelier');
  });

  it('coupe à 75 octets et poursuit avec une espace', () => {
    const ligne = 'DESCRIPTION:' + 'a'.repeat(200);
    const morceaux = plier(ligne).split('\r\n');
    expect(morceaux.length).toBeGreaterThan(1);
    expect(octets(morceaux[0])).toBe(75);
    for (const suite of morceaux.slice(1)) expect(suite.startsWith(' ')).toBe(true);
  });

  it('compte les octets et non les caractères', () => {
    // Soixante « é » font soixante caractères mais cent vingt octets : compter
    // les caractères laisserait passer la ligne sans la plier.
    const ligne = 'SUMMARY:' + 'é'.repeat(60);
    const morceaux = plier(ligne).split('\r\n');
    expect(morceaux.length).toBeGreaterThan(1);
    for (const m of morceaux) expect(octets(m)).toBeLessThanOrEqual(75);
  });

  it('ne coupe jamais au milieu d’un caractère', () => {
    // Une coupe au mauvais octet produirait une séquence UTF-8 invalide, et
    // l'agenda rejetterait le fichier entier.
    const ligne = 'DESCRIPTION:' + 'éàçùè'.repeat(40);
    const recolle = plier(ligne).split('\r\n ').join('');
    expect(recolle).toBe(ligne);
    expect(recolle).not.toContain('�');
  });
});

describe('horodatage', () => {
  it('écrit l’instant en UTC, sans séparateur', () => {
    expect(horodatage(new Date('2026-09-17T12:00:00Z'))).toBe('20260917T120000Z');
  });

  it('convertit une heure de Paris en UTC', () => {
    // 14 h à Paris en septembre, c'est 12 h UTC. L'agenda de l'abonné
    // reconvertit ensuite vers son propre fuseau.
    expect(horodatage(new Date('2026-09-17T14:00:00+02:00'))).toBe('20260917T120000Z');
  });
});

describe('construireCalendrier', () => {
  const base = {
    nom: 'Séances',
    genere: new Date('2026-07-30T10:00:00Z'),
    evenements: [
      {
        uid: 'seance-1@atelier-des-cousettes.fr',
        debut: new Date('2026-09-17T12:00:00Z'),
        fin: new Date('2026-09-17T15:00:00Z'),
        titre: 'Atelier du jeudi après-midi — 2/3',
        description: 'Marie Dupont\nRobert Martin',
        lieu: 'Revel',
        url: 'https://atelier-des-cousettes.fr/espace-membre/admin/seances/1/',
      },
    ],
  };

  it('termine toutes les lignes par CRLF, y compris la dernière', () => {
    const ics = construireCalendrier(base);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.split('\r\n').length).toBeGreaterThan(10);
    // Aucun LF esseulé : certains lecteurs s'arrêtent au premier.
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it('ouvre et ferme le calendrier et chaque événement', () => {
    const ics = construireCalendrier(base);
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('END:VCALENDAR\r\n');
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
    expect((ics.match(/END:VEVENT/g) ?? []).length).toBe(1);
  });

  it('porte un DTSTAMP figé, non l’heure courante', () => {
    // Un DTSTAMP qui bouge à chaque requête ferait voir une modification à
    // chaque rafraîchissement, et rendrait ce test impossible à écrire.
    expect(construireCalendrier(base)).toContain('DTSTAMP:20260730T100000Z');
  });

  it('conserve l’identifiant, seul rempart contre les doublons', () => {
    const ics = construireCalendrier(base);
    expect(ics).toContain('UID:seance-1@atelier-des-cousettes.fr');
  });

  it('marque une séance annulée sans la retirer', () => {
    const ics = construireCalendrier({
      ...base,
      evenements: [{ ...base.evenements[0], annule: true }],
    });
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics).toContain('BEGIN:VEVENT');
  });

  it('n’émet aucune ligne de plus de 75 octets', () => {
    const ics = construireCalendrier({
      ...base,
      evenements: [
        {
          ...base.evenements[0],
          titre: 'Atelier du jeudi après-midi à Revel — complet, liste d’attente ouverte',
          description: Array.from({ length: 12 }, (_, i) => `Participante numéro ${i} Dupont-Martin`).join('\n'),
        },
      ],
    });
    for (const ligne of ics.split('\r\n')) expect(octets(ligne)).toBeLessThanOrEqual(75);
  });
});
