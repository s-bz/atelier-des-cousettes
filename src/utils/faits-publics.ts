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

/** Une séance programmée, réduite à ce qui est public. */
export interface SeancePublique {
  /** Le nom du créneau ou du stage. */
  creneau: string;
  kind: string;
  audience: string;
  lieu: string;
  /** Horodatage ISO 8601 avec fuseau, tel que la base le renvoie. */
  debut: string;
  fin: string;
  prixCents: number;
  capacite: number;
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
  /** La note Google, telle que le CMS la porte — « 5,0 ». */
  noteGoogle?: string | null;
  /** Les créneaux lus en base. Vide si elle n'a pas répondu. */
  creneaux: readonly CreneauPublic[];
  /** Les séances programmées à venir. Vide si la base n'a pas répondu. */
  seancesAVenir: readonly SeancePublique[];
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

/**
 * Les séances programmées à venir — et jamais une erreur, comme au-dessus.
 *
 * POURQUOI LES PUBLIER. Le site tient un calendrier complet en base, et il ne se
 * lisait que sur les pages, en HTML, au milieu de la mise en page. « Quand a lieu
 * le prochain stage de couture près de Castres ? » est pourtant la question qu'un
 * moteur de réponse pose à notre place, et la seule à laquelle rien d'écrit pour
 * les machines ne répondait : ni llms.txt, ni tarifs.md ne portaient une date.
 *
 * Les créneaux archivés sont écartés : un créneau retiré du programme n'est plus
 * proposé, et annoncer ses dates ferait espérer une inscription impossible.
 */
export async function lireProchainesSeances(limite = 200): Promise<SeancePublique[]> {
  try {
    const { data, error } = await getAdminClient()
      .from('sessions')
      .select(`
        starts_at, ends_at, capacity,
        creneaux!inner(label, kind, audience, default_location, default_unit_price_cents, archived_at)
      `)
      .eq('status', 'scheduled')
      .is('creneaux.archived_at', null)
      .gt('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(limite);
    if (error || !data) return [];
    return (data as any[]).map((s) => ({
      creneau: s.creneaux?.label ?? '',
      kind: s.creneaux?.kind ?? '',
      audience: s.creneaux?.audience ?? '',
      lieu: s.creneaux?.default_location ?? '',
      debut: s.starts_at,
      fin: s.ends_at,
      prixCents: s.creneaux?.default_unit_price_cents ?? 0,
      capacite: s.capacity,
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

/** « 2026-09-08 » — la date du jour à Paris, et non celle du serveur. */
const jourIso = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
});
/** « mardi 8 septembre 2026 » — et « jeudi 1er octobre », voir plus bas. */
const jourFrBrut = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

/**
 * La date en toutes lettres, avec l'ordinal du premier du mois.
 *
 * `Intl` écrit « jeudi 1 octobre » ; le français écrit « 1er ». Seul le premier
 * porte un ordinal — le 2 et le 21 s'écrivent bien 2 et 21 — d'où un remplacement
 * qui exige que le 1 soit isolé, sans quoi « 21 » y perdrait son chiffre.
 */
const jourFr = (iso: string) => jourFrBrut.format(new Date(iso)).replace(/(^|\s)1 /, '$11er ');
/** « 14h00 ». */
const heureFr = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso)).replace(':', 'h');

/**
 * LES FAITS CHIFFRÉS, en tête des fichiers pour machines.
 *
 * POURQUOI DES NOMBRES. Un modèle qui doit choisir entre deux ateliers de
 * couture pour quelqu'un reprend ce qu'il peut vérifier et attribuer : « des
 * petits groupes » ne se compare à rien, « six participants au maximum » se
 * compare, se cite et engage. C'est aussi ce qui distingue une fiche de la
 * paraphrase publicitaire que ces moteurs écartent.
 *
 * Chaque ligne vient d'une source qui la tient — la base pour les comptages et
 * les capacités, le CMS pour la note Google et les durées — et disparaît quand
 * cette source est muette, plutôt que de retomber sur un chiffre écrit ici.
 */
export function faitsCles(f: FaitsPublics): string[] {
  const ateliers = f.creneaux.filter((c) => c.kind === 'atelier').length;
  const stages = f.creneaux.filter((c) => c.kind === 'stage').length;
  const lieux = [...new Set(f.creneaux.map((c) => c.lieu.trim()).filter(Boolean))].sort();
  const capacites = f.seancesAVenir.map((s) => s.capacite).filter((n) => n > 0);

  const durees = f.ateliers.grille
    .map((g) => {
      const d = uneLigne(g.dureeSeance).replace(/^s[ée]ances? de\s*/i, '');
      return d ? `${d} pour les ${g.audience === 'enfants' ? 'enfants' : 'adultes'}` : null;
    })
    .filter(Boolean);

  return [
    f.noteGoogle ? `- **Note Google** : ${f.noteGoogle} sur 5` : null,
    lieux.length ? `- **Lieux** : ${lieux.length} — ${lieux.join(' et ')}, dans le Tarn (81), à vingt minutes de Castres` : null,
    ateliers ? `- **Créneaux d'atelier au programme** : ${ateliers}` : null,
    stages ? `- **Stages au programme** : ${stages}` : null,
    durees.length ? `- **Durée d'une séance** : ${durees.join(', ')}` : null,
    capacites.length ? `- **Taille des groupes** : ${Math.max(...capacites)} participants au maximum` : null,
    `- **Saison** : de septembre à juin`,
    `- **Niveaux accueillis** : tous, du grand débutant au couturier confirmé`,
    f.auteur ? `- **Enseignante** : ${f.auteur}, ${minuscule(f.auteurTitre ?? '')}, plus de dix ans d'enseignement` : null,
    `- **Adhésion** : comprise dans tous les tarifs annoncés`,
    f.articles.length ? `- **Articles de blog publiés** : ${f.articles.length}` : null,
  ].filter((l): l is string => l !== null);
}

/**
 * /dates.md — le calendrier, en clair.
 *
 * LES PLACES RESTANTES N'Y SONT PAS, volontairement. Elles changent d'une
 * inscription à l'autre, et ce fichier est mis en cache une heure : y écrire
 * « 3 places » reviendrait à promettre pendant une heure ce qui peut disparaître
 * en une minute. Les dates et les prix, eux, ne bougent pas dans cet intervalle.
 * Le nombre de places libres reste affiché sur les pages, calculé à chaque visite.
 */
export function construireDates(f: FaitsPublics): string {
  const { siteUrl } = f;

  const ligneSeance = (s: SeancePublique) => {
    const debut = new Date(s.debut);
    const prix = s.prixCents > 0
      ? `, ${euros(s.prixCents)} €${s.kind === 'atelier' ? ' la séance hors forfait' : ''}`
      : '';
    return `- **${jourIso.format(debut)}** — ${jourFr(s.debut)}, ${heureFr(s.debut)}–${heureFr(s.fin)} — ${s.creneau} (${s.audience})${prix}`;
  };

  const parLieu = (seances: readonly SeancePublique[]) => {
    const lieux = [...new Set(seances.map((s) => s.lieu.trim()).filter(Boolean))].sort();
    return lieux
      .map((lieu) => {
        const items = seances.filter((s) => s.lieu.trim() === lieu).map(ligneSeance).join('\n');
        return `### ${lieu}\n\n${items}`;
      })
      .join('\n\n');
  };

  const ateliers = f.seancesAVenir.filter((s) => s.kind === 'atelier');
  const stages = f.seancesAVenir.filter((s) => s.kind === 'stage');

  return `# Prochaines dates — ${f.siteName}

Les séances programmées, telles que le calendrier de réservation les porte.
Fuseau horaire : Europe/Paris. Les montants sont en euros, adhésion comprise.
Source de vérité : ${siteUrl}/ateliers-reguliers/ et ${siteUrl}/stages-thematiques/.
${f.avisProvisoire ? `\n> ${f.avisProvisoire}\n` : ''}
## Ateliers réguliers et séances sans engagement

${ateliers.length
  ? `Les mêmes dates servent aux deux formules : on y vient avec un forfait de saison, ou à l'unité sans engagement.\n\n${parLieu(ateliers)}`
  : 'Aucune date programmée pour le moment. Écrire à ' + f.email + ' pour être prévenu de leur publication.'}

## Stages thématiques

${stages.length
  ? parLieu(stages)
  : 'Aucune date programmée pour le moment. Écrire à ' + f.email + ' pour être prévenu de leur publication.'}

## Places restantes

Elles ne figurent pas dans ce fichier : elles changent à chaque inscription, et ce
fichier est mis en cache une heure. Le nombre de places encore libres est affiché
sur ${siteUrl}/ateliers-reguliers/ et ${siteUrl}/seances-sans-engagement/, recalculé à chaque visite.

## Contact

- Courriel : ${f.email}
${f.telephones.map((t) => `- Téléphone : ${t}`).join('\n')}
- Formulaire : ${siteUrl}/contact/
`;
}

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
## Faits clés

${faitsCles(f).join('\n')}

## Formules

- **Ateliers réguliers** : forfait de séances posé sur la saison, de septembre à juin, dans le créneau de votre choix${tarifAteliers ? ` — ${tarifAteliers}` : ''}. [Détail](${siteUrl}/ateliers-reguliers/)
- **Stages thématiques** : une technique par stage — machine à coudre, surjeteuse, patronage, sac${stages ? ` — ${stages}` : ''}. [Détail](${siteUrl}/stages-thematiques/)
- **Séances sans engagement** : une séance ponctuelle, sans inscription à la saison${tarifSeance ? ` — ${tarifSeance}` : ''}. [Détail](${siteUrl}/seances-sans-engagement/)

Les tarifs détaillés, créneau par créneau, sont dans [/tarifs.md](${siteUrl}/tarifs.md).

## Prochaines dates

${f.seancesAVenir.length
  ? `${f.seancesAVenir.slice(0, 5).map((s) => `- ${jourFr(s.debut)}, ${heureFr(s.debut)} — ${s.creneau}, ${s.lieu}`).join('\n')}\n\nLe calendrier complet, toutes formules confondues, est dans [/dates.md](${siteUrl}/dates.md).`
  : `Le calendrier est publié dans [/dates.md](${siteUrl}/dates.md) au fil de la saison.`}

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
- [Prochaines dates, format lisible par machine](${siteUrl}/dates.md)

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

## Faits clés

${faitsCles(f).join('\n')}

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
- Prochaines dates au format lisible par machine : ${siteUrl}/dates.md
`;
}
