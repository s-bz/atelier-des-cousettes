import { describe, it, expect } from 'vitest';
import { lienWhatsApp, lienEmail } from '../contact';

describe('lienWhatsApp', () => {
  it('accepte un numéro français écrit avec des espaces', () => {
    expect(lienWhatsApp('06 12 34 56 78')).toBe('https://wa.me/33612345678');
  });

  it('accepte les points et les tirets', () => {
    expect(lienWhatsApp('06.12.34.56.78')).toBe('https://wa.me/33612345678');
    expect(lienWhatsApp('06-12-34-56-78')).toBe('https://wa.me/33612345678');
  });

  it('accepte la forme internationale', () => {
    expect(lienWhatsApp('+33 6 12 34 56 78')).toBe('https://wa.me/33612345678');
    expect(lienWhatsApp('0033612345678')).toBe('https://wa.me/33612345678');
    expect(lienWhatsApp('33612345678')).toBe('https://wa.me/33612345678');
  });

  it('refuse ce qui n’est pas un numéro plausible', () => {
    // Mieux vaut pas de bouton qu'un bouton qui ouvre une conversation avec
    // un inconnu.
    expect(lienWhatsApp('à demander')).toBeNull();
    expect(lienWhatsApp('06 12 34')).toBeNull();
    expect(lienWhatsApp('')).toBeNull();
    expect(lienWhatsApp(null)).toBeNull();
    expect(lienWhatsApp(undefined)).toBeNull();
  });

  it('refuse un numéro trop long pour la norme E.164', () => {
    expect(lienWhatsApp('+3361234567890123456')).toBeNull();
  });
});

describe('lienEmail', () => {
  it('construit un mailto', () => {
    expect(lienEmail('marie@example.fr')).toBe('mailto:marie@example.fr');
  });

  it('refuse une adresse absente ou invraisemblable', () => {
    expect(lienEmail(null)).toBeNull();
    expect(lienEmail('')).toBeNull();
    expect(lienEmail('pas-une-adresse')).toBeNull();
  });
});
