import { describe, it, expect } from 'vitest';
import { origineDe, lienContact, origineSure } from '../origine';

describe('origineDe', () => {
  it('réduit un chemin à son étiquette', () => {
    expect(origineDe('/ateliers-reguliers/')).toBe('ateliers-reguliers');
    expect(origineDe('/stages-thematiques/')).toBe('stages-thematiques');
  });

  it('aplatit les chemins à plusieurs segments', () => {
    expect(origineDe('/blog/ourlet-invisible/')).toBe('blog-ourlet-invisible');
  });

  it('donne un nom à l’accueil', () => {
    // « / » ne se lit pas dans un tableau de bord, et une chaîne vide s'y
    // confondrait avec une demande sans origine — qui est autre chose.
    expect(origineDe('/')).toBe('accueil');
    expect(origineDe('')).toBe('accueil');
  });

  it('tolère l’absence de barre oblique finale', () => {
    expect(origineDe('/contact')).toBe('contact');
  });

  it('ne laisse sortir que la forme attendue', () => {
    // Ce que produit cette fonction sera relu depuis la barre d'adresse puis
    // réinjecté dans une URL : ce qui sort ici doit passer le filtre d'entrée.
    for (const chemin of ['/Ateliers-Réguliers/', '/blog/été 2026/', '/a?b=c/', '/x"y/']) {
      expect(origineSure(origineDe(chemin))).not.toBeNull();
    }
  });

  it('borne la longueur', () => {
    expect(origineDe(`/${'a'.repeat(200)}/`)).toHaveLength(64);
  });
});

describe('lienContact', () => {
  it('garde la barre oblique avant le point d’interrogation', () => {
    // Vercel redirige en 308 les adresses sans elle : une redirection sur un
    // lien de conversion coûte un aller-retour à qui a déjà cliqué.
    expect(lienContact('/ateliers-reguliers/')).toBe('/contact/?origine=ateliers-reguliers');
    expect(lienContact('/')).toBe('/contact/?origine=accueil');
  });
});

describe('origineSure', () => {
  it('accepte une étiquette bien formée', () => {
    expect(origineSure('ateliers-reguliers')).toBe('ateliers-reguliers');
    expect(origineSure('accueil')).toBe('accueil');
  });

  it('refuse ce qui pourrait sortir de l’adresse de l’iframe', () => {
    expect(origineSure('a&b=1')).toBeNull();
    expect(origineSure('../../autre')).toBeNull();
    expect(origineSure('https://ailleurs.example')).toBeNull();
    expect(origineSure('MAJUSCULES')).toBeNull();
    expect(origineSure('a'.repeat(65))).toBeNull();
  });

  it('refuse le vide', () => {
    expect(origineSure('')).toBeNull();
    expect(origineSure(null)).toBeNull();
    expect(origineSure(undefined)).toBeNull();
  });
});
