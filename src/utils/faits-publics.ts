/**
 * Les fichiers écrits POUR LES MACHINES : /llms.txt, /llms-full.txt, /tarifs.md.
 *
 * POURQUOI CE FICHIER EXISTE. Les trois étaient des fichiers statiques déposés
 * dans `public/`, recopiés à la main. Ils n'ont plus bougé depuis la migration
 * de domaine, et ont passé une saison entière à annoncer aux modèles de langage
 * des prix qui n'existaient plus — « 25 à 55 € par mois », « après-midi couture
 * 40 € », « adhésion 15 € » alors qu'elle est comprise — en pointant vers
 * `/un-apres-midi-couture/`, une adresse redirigée depuis. Les moteurs ont
 * appris et récitent encore ces montants.
 *
 * C'est la faute la plus coûteuse du lot : ces fichiers n'ont AUCUNE autre
 * raison d'être que d'être lus par une machine qui répondra à notre place.
 * Un prix faux y vaut un prix faux dans la réponse, sans qu'aucun visiteur ne
 * puisse le corriger.
 *
 * Ils sont donc désormais rendus, jamais recopiés : les prix à l'unité et les
 * créneaux viennent de la base — celle qui facture — les forfaits et les textes
 * du CMS. Plus rien à penser à mettre à jour ; il n'y a plus de copie.
 *
 * Les fonctions de composition sont pures et prennent leurs données en
 * argument : c'est ce qui les rend vérifiables sans base ni CMS.
 */

import { getAdminClient } from './supabase';

/** Un créneau tel que la base le décrit, réduit à ce qui est public. */
export interface CreneauPublic {
  label: string;
  kind: string;
  audience: string;
  lieu: string;
  debut: string;
  fin: string;
  prixCents: number;
}

export interface Formule {
  seances?: string | null;
  mensuel?: string | null;
  detail?: string | null;
}

export interface GrilleAudience {
  audience?: string | null;
  dureeSeance?: string | null;
  formules?: readonly Formule[] | null;
}

export interface CreneauCms {
  name?: string | null;
  location?: string | null;
  day?: string | null;
  time?: string | null;
  note?: string | null;
}

export interface StageCms {
  name?: string | null;
  shortDescription?: string | null;
  prerequisite?: string | null;
}

export interface ArticlePublic {
  slug: string;
  titre: string;
  description: string;
  publieLe: string;
}

export interface FaitsPublics {
  siteUrl: string;
  siteName: string;
  email?: string | null;
  telephones: readonly string[];
  facebookUrl?: string | null;
  auteur?: string | null;
  auteurTitre?: string | null;
  adresse: {
    rue?: string | null;
    ville?: string | null;
    codePostal?: string | null;
    region?: string | null;
  };
  /** Les créneaux lus en base. Vide si elle n'a pas répondu. */
  creneaux: readonly CreneauPublic[];
  ateliers: {
    introduction?: string | null;
    tarifsIntro?: string | null;
    tarifsNote?: string | null;
    grille: readonly GrilleAudience[];
    creneauxCms: readonly CreneauCms[];
  };
  stages: {
    introduction?: string | null;
    liste: readonly StageCms[];
  };
  seances: {
    introduction?: string | null;
    description?: string | null;
    publics: readonly string[];
  };
  articles: readonly ArticlePublic[];
  /** L'avertissement du CMS quand la saison n'est pas encore arrêtée. */
  avisProvisoire?: string | null;
}

const euros = (cents: number) => Math.round(cents / 100);

/** « 14h00 » — l'heure d'une colonne `time` de Postgres, en français. */
function heure(t: string): string {
  return `${t.slice(0, 2)}h${t.slice(3, 5)}`;
}

/**
 * La première lettre en minuscule, et ELLE SEULE.
 *
 * `toLowerCase()` sur la phrase entière écrivait « couturière diplômée cap » :
 * le titre d'Isabelle contient un sigle, et le mettre en bas de casse le change
 * en mot. On ne touche donc qu'au caractère dont la casse tenait à la place
 * qu'il occupait.
 */
function minuscule(texte: string): string {
  return texte.charAt(0).toLowerCase() + texte.slice(1);
}

/** Un texte du CMS, ramené à une ligne — espaces de bord et retours compris. */
const uneLigne = (texte: string | null | undefined) => (texte ?? '').replace(/\s+/g, ' ').trim();

/**
 * Les créneaux publics, lus en base — et jamais une erreur.
 *
 * Ces trois fichiers ne valent que servis. Une base injoignable doit les
 * amputer de leurs prix, pas les remplacer par une erreur 500 : un robot qui
 * reçoit 500 réessaie rarement, et l'absence se lit alors comme un site sans
 * tarifs. Le même choix qu'à `lireTarifs`, pour la même raison.
 */
export async function lireCreneauxPublics(): Promise<CreneauPublic[]> {
  try {
    const { data, error } = await getAdminClient()
      .from('creneaux')
      .select('label, kind, audience, default_location, default_start_time, default_end_time, default_unit_price_cents')
      .is('archived_at', null);
    if (error || !data) return [];
    return data.map((c) => ({
      label: c.label,
      kind: c.kind,
      audience: c.audience,
      lieu: c.default_location,
      debut: c.default_start_time,
      fin: c.default_end_time,
      prixCents: c.default_unit_price_cents,
    }));
  } catch {
    return [];
  }
}

/** Le prix d'une séance hors forfait, par public. */
export function prixSeance(creneaux: readonly CreneauPublic[], audience: string): number | null {
  const c = creneaux.find((x) => x.kind === 'atelier' && x.audience === audience && x.prixCents > 0);
  return c ? euros(c.prixCents) : null;
}

/**
 * Le prix d'un stage, apparié PAR SON NOM.
 *
 * Le nom est le seul identifiant commun au CMS et à la base — la page des
 * stages fait déjà cet appariement, et le fait de la même façon. Un stage que
 * la base ignore ressort sans prix plutôt qu'avec un prix d'emprunt.
 */
export function prixStage(creneaux: readonly CreneauPublic[], nom: string): number[] {
  const cle = (s: string) => s.trim().toLowerCase();
  return creneaux
    .filter((c) => c.kind === 'stage' && cle(c.label).startsWith(cle(nom)) && c.prixCents > 0)
    .map((c) => euros(c.prixCents))
    .sort((a, b) => a - b);
}

/** « de 38 € à 95 € » — la fourchette de tous les stages au programme. */
export function fourchetteStages(creneaux: readonly CreneauPublic[]): string | null {
  const prix = creneaux.filter((c) => c.kind === 'stage' && c.prixCents > 0).map((c) => euros(c.prixCents));
  return prix.length ? `de ${Math.min(...prix)} € à ${Math.max(...prix)} €` : null;
}

/** Les montants mensuels d'une grille de forfaits, tous publics confondus. */
function mensuels(grille: readonly GrilleAudience[]): number[] {
  return grille
    .flatMap((g) => g.formules ?? [])
    .map((f) => Number(f.mensuel?.match(/\d+/)?.[0]))
    .filter((n) => Number.isFinite(n) && n > 0);
}

// ---------------------------------------------------------------------------
// Composition des trois fichiers
// ---------------------------------------------------------------------------

/** Assemble des lignes en écartant celles qu'aucune donnée n'a remplies. */
const lignes = (...parts: (string | null | undefined | false)[]) =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join('\n');

/**
 * /llms.txt — la fiche d'identité, au format llmstxt.org.
 *
 * Court par construction : c'est un index, pas une documentation. Tout ce qui
 * demande un paragraphe appartient à llms-full.txt, et tout ce qui est un
 * montant appartient à tarifs.md.
 */
export function construireLlms(f: FaitsPublics): string {
  const { siteUrl } = f;
  const forfaits = mensuels(f.ateliers.grille);
  const seanceAdulte = prixSeance(f.creneaux, 'adultes');
  const seanceEnfant = prixSeance(f.creneaux, 'enfants');
  const stages = fourchetteStages(f.creneaux);

  const tarifAteliers = forfaits.length
    ? `de ${Math.min(...forfaits)} € à ${Math.max(...forfaits)} € par mois, adhésion comprise`
    : null;
  const tarifSeance = lignes(
    seanceAdulte ? `${seanceAdulte} € pour les adultes` : null,
    seanceEnfant ? `${seanceEnfant} € pour les enfants` : null,
  ).replace('\n', ', ');

  return `# ${f.siteName}

> Cours de couture, ateliers réguliers, stages thématiques et séances sans engagement à Revel et Verdalle dans le Tarn (France), pour adultes et enfants.

${f.siteName} est un atelier de couture animé par ${f.auteur}, ${minuscule(f.auteurTitre ?? '')}, à Verdalle et Revel dans le Tarn (81), à vingt minutes de Castres. Les cours accueillent tous les niveaux, du grand débutant au couturier confirmé, en petits groupes. Adultes et enfants.
${f.avisProvisoire ? `\n**À noter** : ${f.avisProvisoire}\n` : ''}
## Formules

- **Ateliers réguliers** : forfait de séances posé sur la saison, de septembre à juin, dans le créneau de votre choix${tarifAteliers ? ` — ${tarifAteliers}` : ''}. [Détail](${siteUrl}/ateliers-reguliers/)
- **Stages thématiques** : une technique par stage — machine à coudre, surjeteuse, patronage, sac${stages ? ` — ${stages}` : ''}. [Détail](${siteUrl}/stages-thematiques/)
- **Séances sans engagement** : une séance ponctuelle, sans inscription à la saison${tarifSeance ? ` — ${tarifSeance}` : ''}. [Détail](${siteUrl}/seances-sans-engagement/)

Les tarifs détaillés, créneau par créneau, sont dans [/tarifs.md](${siteUrl}/tarifs.md).

## Informations pratiques

- **Atelier privé** : ${f.adresse.rue}, ${f.adresse.codePostal} ${f.adresse.ville}, ${f.adresse.region}, France
- **Maison des associations** : Revel
- **Courriel** : ${f.email}
${f.telephones.map((t) => `- **Téléphone** : ${t}`).join('\n')}
- **Site** : ${siteUrl}
${f.facebookUrl ? `- **Facebook** : ${f.facebookUrl}` : ''}
- **Association support** : Les P'tits Piafs — l'adhésion est comprise dans tous les tarifs annoncés

## Pages

- [Accueil](${siteUrl}/)
- [Ateliers réguliers](${siteUrl}/ateliers-reguliers/)
- [Stages thématiques](${siteUrl}/stages-thematiques/)
- [Séances sans engagement](${siteUrl}/seances-sans-engagement/)
- [La couturière](${siteUrl}/la-couturiere/)
- [Mes créations](${siteUrl}/mes-creations/)
- [Blog couture](${siteUrl}/blog/)
- [Contact](${siteUrl}/contact/)
- [Tarifs, format lisible par machine](${siteUrl}/tarifs.md)

## Blog couture

${f.articles.map((a) => `- [${a.titre}](${siteUrl}/blog/${a.slug}/) — ${uneLigne(a.description)}`).join('\n')}
`;
}

/**
 * /tarifs.md — les montants, et rien d'autre.
 *
 * Un fichier séparé parce qu'un agent qui compare des prix pour quelqu'un ne
 * veut ni la biographie ni les articles de blog : il veut des montants, leurs
 * unités et ce qu'ils comprennent. C'est aussi le seul endroit du site où les
 * trois formules se lisent côte à côte.
 */
export function construireTarifs(f: FaitsPublics): string {
  const { siteUrl } = f;
  const seanceAdulte = prixSeance(f.creneaux, 'adultes');
  const seanceEnfant = prixSeance(f.creneaux, 'enfants');

  const grille = f.ateliers.grille.map((g) => {
    const titre = g.audience === 'enfants' ? 'Enfants' : 'Adultes';
    const formules = (g.formules ?? [])
      .map((fo) => `- **${fo.seances}** : ${fo.mensuel}${fo.detail ? ` (${fo.detail})` : ''}`)
      .join('\n');
    return `### Ateliers réguliers — ${titre}\n\n${g.dureeSeance ? `${g.dureeSeance}. ` : ''}Saison de septembre à juin. Adhésion comprise.\n\n${formules}`;
  }).join('\n\n');

  const stages = f.stages.liste.map((s) => {
    const prix = prixStage(f.creneaux, s.name ?? '');
    const montant = prix.length === 0
      ? 'prix communiqué à l’ouverture des dates'
      : prix.length === 1
        ? `${prix[0]} €`
        : `${prix.join(' € ou ')} € selon la formule`;
    return `- **${s.name}** : ${montant}${s.prerequisite ? ` — prérequis : ${minuscule(uneLigne(s.prerequisite).replace(/\.$/, ''))}` : ''}`;
  }).join('\n');

  const creneauxParLieu = ['Revel', 'Verdalle'].map((lieu) => {
    const items = f.creneaux
      .filter((c) => c.kind === 'atelier' && c.lieu.trim().toLowerCase() === lieu.toLowerCase())
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
      .map((c) => `- **${c.label}** — ${c.audience}, ${heure(c.debut)}–${heure(c.fin)}, ${euros(c.prixCents)} € la séance hors forfait`)
      .join('\n');
    return items ? `### ${lieu}\n\n${items}` : null;
  }).filter(Boolean).join('\n\n');

  return `# Tarifs — ${f.siteName}

Cours de couture à Revel et Verdalle (Tarn, France). Tous les montants sont en euros, toutes taxes comprises.
Dernière source de vérité : ${siteUrl}/ateliers-reguliers/ et ${siteUrl}/stages-thematiques/.
${f.avisProvisoire ? `\n> ${f.avisProvisoire}\n` : ''}
## Ce que les prix comprennent

- L'adhésion à l'association Les P'tits Piafs est **comprise** dans tous les montants ci-dessous. Il n'y a rien à régler en plus.
- Le tissu et les fournitures restent à la charge du participant.
- Chaque participant vient avec sa machine à coudre. Isabelle peut en prêter une sur demande préalable.

## Forfaits de saison

${grille}

## Séance sans engagement

Sans inscription à la saison, à l'unité.

${lignes(
  seanceAdulte ? `- **Adulte** : ${seanceAdulte} € la séance de 3 h` : null,
  seanceEnfant ? `- **Enfant** : ${seanceEnfant} € la séance de 2 h` : null,
) || '- Prix communiqué sur demande.'}

C'est aussi le tarif d'une séance venant en plus d'un forfait.

## Stages thématiques

Un stage, une technique. Dates publiées au fil de la saison.

${stages}

## Créneaux et prix à l'unité

${creneauxParLieu || 'Créneaux publiés sur la page des ateliers réguliers.'}

## Contact

- Courriel : ${f.email}
${f.telephones.map((t) => `- Téléphone : ${t}`).join('\n')}
- Formulaire : ${siteUrl}/contact/
`;
}

/**
 * /llms-full.txt — la version longue, celle qui répond aux questions.
 *
 * Elle reprend les montants de tarifs.md plutôt que d'y renvoyer : un modèle
 * qui ne charge qu'un fichier doit pouvoir répondre « combien ça coûte » sans
 * en demander un second.
 */
export function construireLlmsFull(f: FaitsPublics): string {
  const { siteUrl } = f;

  const creneaux = ['Revel', 'Verdalle'].map((lieu) => {
    const items = f.ateliers.creneauxCms
      .filter((c) => c.location?.trim().toLowerCase() === lieu.toLowerCase())
      // `uneLigne` sur chaque champ, et pas seulement par confort de lecture :
      // un « 1 fois par mois le jeudi » saisi dans le CMS traîne une espace de
      // fin, qui donnait « le jeudi , de 9h30 ».
      .map((c) => `- **${uneLigne(c.name)}** — ${uneLigne(c.day)}, ${uneLigne(c.time)}${c.note ? ` (${uneLigne(c.note)})` : ''}`)
      .join('\n');
    return items ? `**${lieu}**\n\n${items}` : null;
  }).filter(Boolean).join('\n\n');

  const stages = f.stages.liste.map((s) => {
    const prix = prixStage(f.creneaux, s.name ?? '');
    const montant = prix.length ? ` (${prix.join(' € ou ')} €)` : '';
    return `#### ${s.name}${montant}\n\n${uneLigne(s.shortDescription)}${s.prerequisite ? `\n\nPrérequis : ${uneLigne(s.prerequisite)}` : ''}`;
  }).join('\n\n');

  return `# ${f.siteName} — informations complètes

> Cours de couture, ateliers réguliers, stages thématiques et séances sans engagement à Revel et Verdalle dans le Tarn (France), pour adultes et enfants, animés par ${f.auteur}, ${minuscule(f.auteurTitre ?? '')}.

## À propos

${f.siteName} est un atelier de couture animé par ${f.auteur}, ${minuscule(f.auteurTitre ?? '')}. Les cours ont lieu à Verdalle et à Revel, dans le Tarn (81), à vingt minutes de Castres, et accueillent tous les niveaux — du grand débutant au couturier confirmé — en petits groupes pour garantir un accompagnement personnalisé. Adultes et enfants.

Isabelle enseigne la couture depuis plus de dix ans. Son parcours mêle héritage familial (son arrière-grand-père était tailleur), passion pour le patronage et engagement artisanal.

Les cours se déroulent à deux endroits :

- **Atelier privé** : ${f.adresse.rue}, ${f.adresse.codePostal} ${f.adresse.ville}, ${f.adresse.region}
- **Maison des associations** : Revel

L'atelier s'appuie sur l'association Les P'tits Piafs. **L'adhésion est comprise dans tous les tarifs annoncés** : il n'y a rien à régler en plus. Le tissu et les fournitures restent à la charge du participant.
${f.avisProvisoire ? `\n**À noter** : ${f.avisProvisoire}\n` : ''}
## Les trois formules

### Ateliers réguliers

${uneLigne(f.ateliers.introduction)}

${uneLigne(f.ateliers.tarifsIntro)}

${f.ateliers.grille.map((g) => {
  const titre = g.audience === 'enfants' ? 'Enfants' : 'Adultes';
  const formules = (g.formules ?? [])
    .map((fo) => `- ${fo.seances} : ${fo.mensuel}${fo.detail ? ` — ${fo.detail}` : ''}`)
    .join('\n');
  return `**${titre}** — ${g.dureeSeance ?? ''}\n\n${formules}`;
}).join('\n\n')}

#### Créneaux

${creneaux}

### Séances sans engagement

${uneLigne(f.seances.introduction)}

${lignes(
  ...(() => {
    const a = prixSeance(f.creneaux, 'adultes');
    const e = prixSeance(f.creneaux, 'enfants');
    return [
      a ? `- Adulte : ${a} € la séance de 3 h, adhésion comprise` : null,
      e ? `- Enfant : ${e} € la séance de 2 h, adhésion comprise` : null,
    ];
  })(),
)}

${f.seances.publics.length ? `Cette formule s'adresse à :\n\n${f.seances.publics.map((p) => `- ${p}`).join('\n')}` : ''}

### Stages thématiques

${uneLigne(f.stages.introduction)}

${stages}

## Questions fréquentes

**Faut-il apporter sa machine à coudre ?**
Oui, chaque participant vient avec sa propre machine, ses accessoires et sa notice — chaque machine étant différente, on apprend mieux sur la sienne. Isabelle peut en prêter une sur demande préalable.

**Faut-il déjà savoir coudre ?**
Non. Les grands débutants sont attendus : enfiler la machine, régler la tension, coudre droit, faire un ourlet. Isabelle adapte son accompagnement au niveau de chacun.

**L'adhésion est-elle en plus du tarif ?**
Non. L'adhésion à l'association Les P'tits Piafs est comprise dans tous les tarifs annoncés.

**Les enfants sont-ils acceptés ?**
Oui, des créneaux leur sont réservés, avec des séances de 2 h et une grille tarifaire distincte.

**Où se garer ?**
Parking gratuit à proximité des deux lieux.

## Blog couture

${f.articles.map((a) => `- [${a.titre}](${siteUrl}/blog/${a.slug}/) — ${uneLigne(a.description)}`).join('\n')}

## Contact

- Courriel : ${f.email}
${f.telephones.map((t) => `- Téléphone : ${t}`).join('\n')}
- Formulaire de contact : ${siteUrl}/contact/
${f.facebookUrl ? `- Facebook : ${f.facebookUrl}` : ''}
- Tarifs au format lisible par machine : ${siteUrl}/tarifs.md
`;
}
