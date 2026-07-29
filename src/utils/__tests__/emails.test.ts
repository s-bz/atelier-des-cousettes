import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { remplir, enHtml, variablesSeance, variablesAccueil } from '../emails';

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
  const v = variablesSeance({
    prenom: 'Léa',
    starts_at: '2026-10-09T12:00:00Z',
    ends_at: '2026-10-09T15:00:00Z',
    location: 'Revel',
  });

  it('expose exactement ce que l’écran d’édition annonce', () => {
    expect(Object.keys(v).sort()).toEqual(
      ['date', 'heure_debut', 'heure_fin', 'lien', 'lien_espace', 'lien_planning', 'lieu', 'prenom'].sort(),
    );
  });

  it('sert les deux destinations, et garde {{lien}} en synonyme', () => {
    // {{lien}} reste servi pour ne pas casser un gabarit déjà enregistré.
    expect(v.lien_planning).toContain('/espace-membre/planning/');
    expect(v.lien_espace).toBe('https://atelier-des-cousettes.fr/espace-membre/');
    expect(v.lien).toBe(v.lien_planning);
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

describe('variables du message d’accueil', () => {
  const v = variablesAccueil({
    prenom: 'Léa',
    creneau: 'Atelier du jeudi après-midi',
    solde: 20,
    seances: [
      { starts_at: '2026-10-08T12:00:00Z', ends_at: '2026-10-08T15:00:00Z', location: 'Revel' },
      { starts_at: '2026-10-22T12:00:00Z', ends_at: '2026-10-22T15:00:00Z', location: 'Revel' },
    ],
  });

  it('expose exactement ce que l’écran d’édition annonce', () => {
    expect(Object.keys(v).sort()).toEqual(
      ['creneau', 'lien', 'lien_espace', 'lien_planning', 'nombre_seances', 'prenom', 'seances', 'solde'].sort(),
    );
  });

  it('compte les séances plutôt que de faire confiance au solde', () => {
    // Le solde est ce qui a été acheté ; la liste est ce qui a effectivement
    // pu être réservé. Les deux diffèrent dès qu'une séance manque au
    // calendrier, et annoncer 20 dates pour n'en montrer que 2 se voit.
    expect(v.nombre_seances).toBe('2');
    expect(v.solde).toBe('20');
  });

  it('rend la liste sous une forme que l’habillage sait reconnaître', () => {
    expect(v.seances).toBe(
      '- jeudi 8 octobre, 14:00 – 17:00, Revel\n' +
      '- jeudi 22 octobre, 14:00 – 17:00, Revel',
    );
  });

  it('reste lisible sans créneau attitré et sans aucune date', () => {
    const vide = variablesAccueil({ prenom: 'Léa', creneau: null, solde: 0, seances: [] });
    expect(vide.creneau).toBe('aucun créneau attitré');
    expect(vide.seances).toBe('- aucune séance encore programmée');
  });
});

describe('habillage HTML', () => {
  it('part en même temps que le texte', () => {
    // Les deux versions ensemble : lisible pour qui bloque le HTML, et la
    // présence du texte améliore la délivrabilité.
    expect(source).toMatch(/text:\s*message\.corps/);
    expect(source).toMatch(/html:\s*message\.html/);
  });

  it('échappe ce qu’Isabelle écrit', () => {
    // Le texte vient d'un champ libre en base : sans échappement, un « < »
    // suffirait à casser la mise en page du message reçu.
    const html = enHtml('Objet', 'Bonjour <b>vous</b> & compagnie');
    expect(html).toContain('Bonjour &lt;b&gt;vous&lt;/b&gt; &amp; compagnie');
  });

  it('fait un bouton d’un bloc réduit à une adresse', () => {
    const html = enHtml('Objet', 'Bonjour\n\nhttps://exemple.fr/espace/\n\nÀ bientôt');
    expect(html).toContain('href="https://exemple.fr/espace/"');
    expect(html).toContain('Ouvrir mon espace');
  });

  it('fait une liste des lignes commençant par un tiret', () => {
    const html = enHtml('Objet', '- jeudi 8 octobre\n- jeudi 22 octobre');
    expect(html).toContain('<ul');
    expect(html.match(/<li/g)?.length).toBe(2);
  });

  it('sépare les paragraphes sur les lignes vides', () => {
    const html = enHtml('Objet', 'Premier.\n\nSecond.');
    expect(html.match(/<p class="e-(texte|pied)"/g)?.length).toBe(3); // deux blocs + le pied
  });

  it('porte les couleurs du site', () => {
    const html = enHtml('Objet', 'Bonjour\n\nhttps://exemple.fr/');
    expect(html).toContain('#f5f4ed');  // fond beige
    expect(html).toContain('#faf9f5');  // carte
    expect(html).toContain('#c96442');  // corail du bouton
    expect(html).toContain('L’Atelier des Cousettes');
  });

  it('suit le thème sombre du lecteur', () => {
    const html = enHtml('Objet', 'Bonjour');

    // Les deux métas disent au client de messagerie : « je gère les deux
    // thèmes ». Sans elles, Apple Mail et Outlook.com inversent d'autorité les
    // couleurs, et le résultat n'est plus celui qu'on a dessiné.
    expect(html).toContain('name="color-scheme" content="light dark"');
    expect(html).toContain('name="supported-color-schemes" content="light dark"');
    expect(html).toContain('@media (prefers-color-scheme: dark)');
    expect(html).toContain('#141413');  // fond sombre du site
  });

  it('force les surcharges sombres au-dessus des styles en ligne', () => {
    // Un style en ligne l'emporte toujours sur une règle de feuille : sans
    // !important, le bloc sombre serait présent et sans effet — un thème
    // sombre qui ne s'applique jamais est pire qu'aucun, on croit l'avoir.
    const sombre = enHtml('Objet', 'Bonjour').split('prefers-color-scheme: dark')[1];
    const regles = sombre.split('}').filter((l) => l.includes('.e-'));
    expect(regles.length).toBeGreaterThan(0);
    for (const regle of regles) expect(regle).toContain('!important');
  });

  it('découpe les paragraphes même en CRLF', () => {
    // Un <textarea> renvoie du CRLF : la norme HTML l'impose. « \r\n\r\n » ne
    // contient pas deux \n adjacents, et sans normalisation tout message
    // enregistré depuis l'écran d'édition repartait en un seul bloc — les
    // paragraphes et les listes aplatis, sans que rien ne le signale.
    const crlf = enHtml('Objet', 'Premier.\r\n\r\nSecond.\r\n\r\n- une date\r\n- une autre');
    expect(crlf.match(/<p class="e-texte"/g)?.length).toBe(2);
    expect(crlf).toContain('<ul');
    expect(crlf.match(/<li/g)?.length).toBe(2);
    expect(crlf).not.toContain('\r');
  });

  it('fait un bouton d’une adresse collée au paragraphe précédent', () => {
    // Sans ligne vide au-dessus : le bouton ne doit pas dépendre d'une
    // convention de saisie qu'Isabelle doit penser à respecter.
    const html = enHtml('Objet', 'Un empêchement ?\nhttps://exemple.fr/planning/\nÀ bientôt');
    expect(html).toContain('Voir le planning');
    expect(html.match(/<p class="e-texte"/g)?.length).toBe(2); // avant et après
  });

  it('nomme le bouton d’après sa destination', () => {
    expect(enHtml('O', 'https://x.fr/espace-membre/')).toContain('Ouvrir mon espace');
    expect(enHtml('O', 'https://x.fr/espace-membre/planning/')).toContain('Voir le planning');
  });

  it('centre la marque', () => {
    expect(enHtml('Objet', 'Bonjour')).toMatch(/align="center"[^>]*text-align:center/);
  });
});
