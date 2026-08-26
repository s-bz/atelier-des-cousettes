import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { toSlug } from '../strings';
import { FICHIERS_POUR_MACHINES } from '../hors-index';

/*
 * UN LIEN ÉCRIT DANS LE CONTENU DOIT MENER QUELQUE PART.
 *
 * Le formulaire Keystatic d'une fiche de glossaire fait SAISIR À LA MAIN le
 * chemin du stage concerné — les stages vivent en base, Keystatic ne sait pas
 * les proposer — et son commentaire l'avait prévu mot pour mot : « un stage
 * renommé changerait son adresse et laisserait ce lien dans le vide — LE
 * CONTRÔLE DES LIENS INTERNES LE VERRAIT ». Ce contrôle n'existait pas.
 *
 * Le stage patronage est devenu « stage patronage de jupe », le stage
 * découverte de la couture a disparu, et dix fiches ont continué d'envoyer vers
 * `/stages-thematiques/stage-patronage/` et
 * `/stages-thematiques/stage-decouverte-de-la-couture/` — deux adresses qui
 * répondent 302 vers le moyeu. Dix liens depuis la page qui EXPLIQUE un geste
 * vers la page qui le fait PRATIQUER, tous perdus en silence, et sans le
 * moindre symptôme visible : la fiche s'affiche, le lien est cliquable, il
 * ramène simplement à la liste.
 *
 * LE TEST BALAIE TOUT `src/content/`, et pas le seul champ « stage » du seul
 * glossaire : c'est le lien qu'on écrira demain, ailleurs, qui est le cas
 * dangereux. Il vérifie d'abord qu'il a lu du contenu ET trouvé des liens,
 * sans quoi un dossier renommé ou une extraction cassée le rendrait vert à
 * vide.
 */

const RACINE = 'src/content';

function fichiers(dossier = RACINE): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) return fichiers(chemin);
    return /\.(yaml|mdoc)$/.test(e.name) ? [chemin] : [];
  });
}

/**
 * Les liens internes d'un fichier de contenu, dans les trois formes qu'il en a :
 * un lien Markdoc `[texte](/chemin/)`, un attribut `href="/chemin/"`, et un
 * champ YAML dont la valeur est un chemin nu — c'est la forme du champ
 * « stage » d'une fiche de glossaire.
 */
function liensInternes(source: string): string[] {
  const formes = [
    /\]\((\/[^)\s#?]*)/g,
    /href="(\/[^"\s#?]*)/g,
    /^\s*[\w-]+:\s*'?"?(\/[^'"\s#?]*)/gm,
  ];
  return formes
    .flatMap((forme) => [...source.matchAll(forme)].map((m) => m[1]))
    // `/src/assets/...` n'est pas une adresse : c'est le chemin d'une image que
    // Keystatic écrit dans le contenu et qu'Astro résout à la construction. Une
    // image manquante fait échouer la construction ; elle n'a pas besoin de ce
    // filet-ci.
    .filter((lien) => !lien.startsWith('/src/'));
}

const contenus = fichiers().map((chemin) => ({ chemin, source: readFileSync(chemin, 'utf8') }));

/** Les fiches de stage, dépliées depuis le CMS comme le fait le plan du site. */
function cheminsDeStage(): string[] {
  const yaml = readFileSync('src/content/pages/stages-thematiques/index.yaml', 'utf8');
  return [...yaml.matchAll(/^ {2}- name:\s*(.+)$/gm)]
    .map((m) => `/stages-thematiques/${toSlug(m[1].trim())}/`);
}

/** `src/pages/reserver/retour.astro` → `/reserver/retour/` */
function routeDe(chemin: string): string {
  const sansRacine = chemin.slice('src/pages/'.length).replace(/\.astro$/, '');
  const sansIndex = sansRacine.replace(/(^|\/)index$/, '');
  return `/${sansIndex}${sansIndex.endsWith('/') || sansIndex === '' ? '' : '/'}`;
}

function pagesAstro(dossier = 'src/pages'): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) return pagesAstro(chemin);
    return e.name.endsWith('.astro') ? [chemin] : [];
  });
}

/**
 * TOUT ce que le site sert : les pages de fichier, ce que les routes dynamiques
 * déplient — un article par dossier de blog, une fiche par terme du glossaire,
 * une fiche par stage du CMS — les fichiers écrits pour les machines, et ce que
 * `public/` publie tel quel.
 *
 * Les routes dynamiques sont écartées comme fichiers : `[slug].astro` n'est pas
 * une adresse, ce sont les entrées de contenu qu'il déplie qui en sont.
 */
const servies = new Set([
  ...pagesAstro().filter((c) => !c.includes('[')).map(routeDe),
  ...readdirSync('src/content/blog', { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `/blog/${e.name}/`),
  ...readdirSync('src/content/glossaire')
    .filter((n) => n.endsWith('.yaml'))
    .map((n) => `/glossaire/${n.replace(/\.yaml$/, '')}/`),
  ...cheminsDeStage(),
  ...FICHIERS_POUR_MACHINES,
  ...readdirSync('public').map((n) => `/${n}`),
]);

describe('les liens internes du contenu', () => {
  it('trouve bien du contenu à lire', () => {
    expect(contenus.length).toBeGreaterThanOrEqual(40);
    expect(contenus.some((c) => c.chemin.includes('glossaire'))).toBe(true);
    expect(contenus.some((c) => c.chemin.includes('blog'))).toBe(true);
  });

  it('trouve bien des liens à vérifier, et des adresses où les mener', () => {
    // Une extraction cassée ne doit pas se lire comme « aucun lien mort », et
    // un inventaire vide ferait échouer tout le monde plutôt que personne.
    const total = contenus.flatMap((c) => liensInternes(c.source)).length;
    expect(total).toBeGreaterThanOrEqual(50);
    expect(servies.size).toBeGreaterThanOrEqual(70);
    expect(servies.has('/stages-thematiques/stage-patronage-de-jupe/')).toBe(true);
  });

  it('mènent tous à une adresse que le site sert', () => {
    const morts = contenus.flatMap(({ chemin, source }) =>
      liensInternes(source)
        .filter((lien) => !servies.has(lien))
        .map((lien) => `${chemin} → ${lien}`),
    );

    expect(
      morts,
      'Ces liens ne mènent nulle part. Une fiche de stage renommée dans le CMS '
        + 'change son adresse : reportez-la dans le contenu qui y renvoie.',
    ).toEqual([]);
  });
});
