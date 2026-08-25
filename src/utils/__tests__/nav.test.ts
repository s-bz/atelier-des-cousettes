import { describe, it, expect } from 'vitest';
import { suiteSure } from '../nav';

describe('suiteSure', () => {
  it('accepte un chemin interne', () => {
    expect(suiteSure('/stages-thematiques/reserver/?creneau=x'))
      .toBe('/stages-thematiques/reserver/?creneau=x');
  });

  it('refuse une adresse absolue', () => {
    // Sans quoi la page de connexion devient un tremplin : on se connecte chez
    // nous, on atterrit ailleurs, et le lien avait l'air d'être le nôtre.
    expect(suiteSure('https://exemple-hostile.fr/')).toBe('/espace-membre/');
  });

  it('refuse le double slash, que le navigateur lit comme un hôte', () => {
    // « //exemple.fr » n'est pas un chemin : c'est une URL sans protocole.
    expect(suiteSure('//exemple-hostile.fr/piege')).toBe('/espace-membre/');
  });

  it('retombe sur l’espace adhérent quand rien n’est demandé', () => {
    expect(suiteSure(null)).toBe('/espace-membre/');
    expect(suiteSure('')).toBe('/espace-membre/');
  });
});
