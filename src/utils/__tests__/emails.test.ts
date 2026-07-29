import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { remplir, variables } from '../emails';

const source = readFileSync('src/utils/emails.ts', 'utf8');

describe('envoi', () => {
  it('pose un Reply-To sur tout envoi', () => {
    // Exigence tenue en un seul endroit à dessein : un en-tête recopié à
    // chaque appel finirait par manquer quelque part, et le message où il
    // manquerait serait celui auquel quelqu'un a répondu.
    expect(source).toMatch(/reply_to:\s*REPONSE_VERS/);
    expect(source).toMatch(/REPONSE_VERS\s*=\s*'info@atelier-des-cousettes\.fr'/);
  });

  it('envoie depuis le sous-domaine authentifié', () => {
    expect(source).toMatch(/no_reply@portail\.atelier-des-cousettes\.fr/);
  });

  it("n'a qu'un seul appel à l'API d'envoi", () => {
    // Un second point d'envoi serait un second endroit où oublier le Reply-To.
    expect(source.match(/api\.resend\.com/g)?.length).toBe(1);
  });
});

describe('remplissage des gabarits', () => {
  const valeurs = { prenom: 'Marie', lieu: 'Revel' };

  it('remplace les variables connues', () => {
    expect(remplir('Bonjour {{prenom}}, à {{lieu}}.', valeurs)).toBe('Bonjour Marie, à Revel.');
  });

  it('tolère les espaces dans les accolades', () => {
    expect(remplir('{{ prenom }}', valeurs)).toBe('Marie');
  });

  it('laisse visible une variable inconnue plutôt que de la vider', () => {
    // Un « {{prenm}} » dans le message reçu signale la faute de frappe ; un
    // trou silencieux passerait inaperçu jusqu'à ce que quelqu'un le signale.
    expect(remplir('Bonjour {{prenm}}', valeurs)).toBe('Bonjour {{prenm}}');
  });

  it('remplace toutes les occurrences', () => {
    expect(remplir('{{prenom}} et {{prenom}}', valeurs)).toBe('Marie et Marie');
  });
});

describe('variables disponibles', () => {
  const v = variables({
    prenom: 'Léa',
    starts_at: '2026-10-09T12:00:00Z',
    ends_at: '2026-10-09T15:00:00Z',
    location: 'Revel',
  });

  it('expose exactement ce que l’écran d’édition annonce', () => {
    expect(Object.keys(v).sort()).toEqual(
      ['date', 'heure_debut', 'heure_fin', 'lien', 'lieu', 'prenom'].sort(),
    );
  });

  it('formate les heures en 24 h, à Paris', () => {
    // 12:00 UTC en octobre = 14:00 à Paris. Un formatage en UTC afficherait
    // une heure fausse à l'adhérent, sans que rien ne le signale.
    expect(v.heure_debut).toBe('14:00');
    expect(v.heure_fin).toBe('17:00');
  });

  it('écrit la date en français', () => {
    expect(v.date).toBe('vendredi 9 octobre');
  });
});
