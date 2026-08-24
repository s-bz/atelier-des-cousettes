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
import { AUDIENCES, libelleAudience } from './ateliers';

/** Un créneau tel que la base le décrit, réduit à ce qui est public. */
export interface CreneauPublic {
  label: string;
  kind: string;
  audience: string;
  lieu: string;
  debut: string;
  fin: string;
  prixCents: number;
  /**
   * Ce créneau se vend-il à la séance ?
   *
   * Faux pour les ateliers ados et enfants depuis la saison 2026-2027 : on y
   * prend un forfait, ou rien. Leur `prixCents` demeure — il facture une séance
   * qui dépasse le forfait — mais ces fichiers ne doivent plus l'annoncer comme
   * un tarif d'essai. FACTURER N'EST PAS PROPOSER, et c'est précisément le
   * genre de nuance qu'un modèle de langage ne peut pas deviner : il lirait
   * « 35 € la séance enfant » et le répéterait à un parent.
   *
   * Optionnel, et vrai par défaut à la lecture : les jeux d'essai écrits avant
   * cette colonne décrivent des créneaux qui se vendaient bien des deux façons.
   */
  aLUnite?: boolean;
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

/**
 * Un terme du glossaire, réduit à ce qui se cite.
 *
 * La définition courte et rien d'autre : c'est le seul morceau du site écrit
 * pour tenir hors de sa page. Un modèle qui répond « qu'est-ce que le droit
 * fil » n'a que faire des trois paragraphes qui suivent — il a besoin d'une
 * phrase juste, attribuable, et d'une adresse où l'envoyer.
 */
export interface TermePublic {
  slug: string;
  terme: string;
  definition: string;
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
  /** Voir `CreneauPublic.aLUnite` : ce prix s'achète-t-il seul ? */
  aLUnite?: boolean;
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
    /**
     * Ce qu'on peut faire en une séance — « coudre un ourlet », « poser une
     * fermeture éclair ».
     *
     * « QUE PEUT-ON FAIRE EN COURS DE COUTURE ? » est une question qu'on pose à
     * un moteur de réponse, et à laquelle rien ici ne répondait : ces fichiers
     * savaient dire les prix, les dates, les lieux et les publics, mais pas les
     * gestes. Un tarif ne rassure que celui qui sait déjà ce qu'il vient faire.
     */
    idees: readonly string[];
  };
  articles: readonly ArticlePublic[];
  /** Le glossaire, par ordre alphabétique. Vide tant qu'aucune fiche n'existe. */
  glossaire: readonly TermePublic[];
  /** L'avertissement du CMS quand la saison n'est pas encore arrêtée. */
  avisProvisoire?: string | null;
  /**
   * L'ADHÉSION À L'ASSOCIATION, ET SES DEUX RÉGIMES.
   *
   * Ces fichiers ont affirmé neuf fois « l'adhésion est comprise dans tous les
   * tarifs annoncés ». C'était vrai des stages et des séances à l'unité, dont
   * les prix ont été relevés d'autant en juillet 2026, et faux des forfaits de
   * saison, auxquels 15 € par an s'ajoutent. « Tous » est le mot qui a fait la
   * faute : une phrase juste sur deux formules, étendue à la troisième parce
   * qu'aucun fait ne la contredisait.
   *
   * Les deux montants viennent donc du CMS, et les phrases se déduisent d'eux
   * plutôt que de l'affirmer. Vider l'un retire sa mention partout.
   */
  adhesionAnnuelle?: string | null;
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
      .select('label, kind, audience, default_location, default_start_time, default_end_time, default_unit_price_cents, a_l_unite')
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
      aLUnite: c.a_l_unite ?? true,
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
        creneaux!inner(label, kind, audience, default_location, default_unit_price_cents, a_l_unite, archived_at)
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
      aLUnite: s.creneaux?.a_l_unite ?? true,
    }));
  } catch {
    return [];
  }
}

/**
 * Le prix d'une séance ACHETÉE À L'UNITÉ, par public.
 *
 * Un créneau qui ne se vend qu'au forfait n'a pas de prix à l'unité à annoncer,
 * même si sa colonne en porte un : ce montant-là facture les dépassements de
 * forfait, il ne s'offre pas. Les ateliers ados et enfants sont dans ce cas.
 */
export function prixSeance(creneaux: readonly CreneauPublic[], audience: string): number | null {
  const c = creneaux.find(
    (x) => x.kind === 'atelier' && x.audience === audience && x.prixCents > 0 && x.aLUnite !== false,
  );
  return c ? euros(c.prixCents) : null;
}

/**
 * « 3 h », « 2 h 30 » — la durée d'une séance de ce public, LUE SUR SES CRÉNEAUX.
 *
 * Elle était écrite en toutes lettres dans la phrase qui l'affiche : « 45 € la
 * séance de 3 h », « 35 € la séance de 2 h ». Deux durées codées en dur, donc
 * deux publics et pas un de plus — l'atelier ados serait sorti sans durée, ou
 * pire, avec celle d'un autre. Le montant venait déjà de la base ; la durée
 * vient désormais du même endroit, et les deux ne peuvent plus se contredire.
 */
function dureeDe(debut: string, fin: string): string | null {
  const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const m = min(fin) - min(debut);
  return m <= 0 ? null : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60}`;
}

export function dureeSeance(creneaux: readonly CreneauPublic[], audience: string): string | null {
  const c = creneaux.find(
    (x) => x.kind === 'atelier' && x.audience === audience && x.aLUnite !== false,
  );
  return c ? dureeDe(c.debut, c.fin) : null;
}

/**
 * LES OFFRES ACHETABLES À L'UNITÉ — une par couple (durée, prix).
 *
 * `prixSeance` rend UN prix pour UN public, et c'était suffisant tant qu'un
 * public n'avait qu'un tarif. Les adultes en ont désormais deux : 3 h à 45 €
 * dans les ateliers réguliers, 1 h 30 à 22 € le jeudi soir. Interrogée par
 * public, la fonction rendait le premier des deux — c'est-à-dire l'ordre que
 * la base voulait bien donner — et /tarifs.md n'annonçait qu'une des deux
 * formules, sans rien signaler.
 *
 * Ce sont donc les OFFRES qu'on énumère, non les publics. Deux créneaux qui
 * durent autant et coûtent autant sont la même offre, quel que soit le jour :
 * les cinq créneaux adultes de 3 h à 45 € n'en font qu'une.
 *
 * La plus chère d'abord : c'est la formule principale, la courte se lit ensuite
 * comme ce qu'elle est, une porte d'entrée.
 */
export interface OffreUnite {
  /** « Séance de 3 h » — le nom sous lequel elle se propose. */
  titre: string;
  duree: string | null;
  prix: number;
}

export function offresALUnite(creneaux: readonly CreneauPublic[]): OffreUnite[] {
  const par = new Map<string, OffreUnite>();
  for (const c of creneaux) {
    if (c.kind !== 'atelier' || c.prixCents <= 0 || c.aLUnite === false) continue;
    const duree = dureeDe(c.debut, c.fin);
    const cle = `${c.prixCents}|${duree ?? ''}`;
    if (!par.has(cle)) {
      par.set(cle, {
        titre: duree ? `Séance de ${duree}` : 'Séance',
        duree,
        prix: euros(c.prixCents),
      });
    }
  }
  return [...par.values()].sort((a, b) => b.prix - a.prix);
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
      // Le public se dit tel qu'il est écrit. Le ternaire d'avant repliait tout
      // ce qui n'était pas « enfants » sur « adultes » : la durée de la séance
      // ados serait sortie annoncée pour les adultes, à qui elle ne s'applique
      // pas — et ce fichier est lu par des modèles qui la réciteront.
      return d ? `${d} pour les ${g.audience}` : null;
    })
    .filter(Boolean);

  return [
    f.noteGoogle ? `- **Note Google** : ${f.noteGoogle} sur 5` : null,
    lieux.length ? `- **Lieux** : ${lieux.length} — ${lieux.join(' et ')}. Revel est en Haute-Garonne (31), Verdalle dans le Tarn (81), à vingt minutes de Castres` : null,
    ateliers ? `- **Créneaux d'atelier au programme** : ${ateliers}` : null,
    stages ? `- **Stages au programme** : ${stages}` : null,
    durees.length ? `- **Durée d'une séance** : ${durees.join(', ')}` : null,
    capacites.length ? `- **Taille des groupes** : ${Math.max(...capacites)} participants au maximum` : null,
    `- **Saison** : de septembre à juin`,
    `- **Niveaux accueillis** : tous, du grand débutant au couturier confirmé`,
    f.auteur ? `- **Enseignante** : ${f.auteur}, ${minuscule(f.auteurTitre ?? '')}, plus de dix ans d'enseignement` : null,
    // Deux régimes, dits l'un après l'autre. Une seule ligne « comprise dans
    // tous les tarifs » était fausse pour les forfaits, et c'est le fait le
    // plus repris d'un llms.txt : celui qu'un modèle récite en répondant
    // « combien ça coûte ».
    //
    // LE PREMIER RÉGIME NE DÉPEND DE RIEN. Il était conditionné à un champ
    // `adhesionPonctuelle` qui portait « 5 € » sans jamais l'afficher : un
    // montant que personne ne paie, qui ne servait que de drapeau, et dont
    // l'oubli aurait fait disparaître un fait vrai.
    `- **Adhésion** : comprise dans le prix des stages et des séances sans engagement`,
    f.adhesionAnnuelle
      ? `- **Adhésion annuelle** : ${f.adhesionAnnuelle}, en plus du forfait de saison`
      : null,
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
    /*
     * LE PRIX NE S'ÉCRIT QUE S'IL S'ACHÈTE. Un atelier ados ou enfants ne se
     * vend plus à la séance, et son montant ne facture plus rien depuis que le
     * dépassement se règle au prix divisé du forfait. L'annoncer « 35 € la
     * séance hors forfait » proposait à un moteur de réponse un tarif que
     * personne ne peut ni payer ni se voir facturer.
     */
    const prix = s.prixCents > 0 && s.aLUnite !== false
      ? `, ${euros(s.prixCents)} €${s.kind === 'atelier' ? ' la séance' : ''}`
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
Fuseau horaire : Europe/Paris. Les montants sont en euros. Le prix indiqué est celui d'une séance à l'unité, adhésion ponctuelle comprise.
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
  const stages = fourchetteStages(f.creneaux);

  const tarifAteliers = forfaits.length
    ? `de ${Math.min(...forfaits)} € à ${Math.max(...forfaits)} € par mois` +
      (f.adhesionAnnuelle ? `, plus l'adhésion annuelle de ${f.adhesionAnnuelle}` : '')
    : null;
  // Une ligne par OFFRE, non par public : les adultes en ont deux, et une
  // énumération par public n'en rendait qu'une.
  const tarifSeance = offresALUnite(f.creneaux)
    .map((o) => `${o.prix} €${o.duree ? ` la séance de ${o.duree}` : ''}`)
    .join(', ');

  return `# ${f.siteName}

> Cours de couture, ateliers réguliers, stages thématiques et séances sans engagement à Revel (Haute-Garonne) et Verdalle (Tarn), en France, pour adultes, ados et enfants.

${f.siteName} est un atelier de couture animé par ${f.auteur}, ${minuscule(f.auteurTitre ?? '')}, à Revel (Haute-Garonne) et Verdalle (Tarn), à vingt minutes de Castres. Les cours accueillent tous les niveaux, du grand débutant au couturier confirmé, en petits groupes. Adultes, ados et enfants.
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
- **Association support** : Les P'tits Piafs — l'adhésion est comprise dans le prix des stages et des séances sans engagement${f.adhesionAnnuelle ? `, et coûte ${f.adhesionAnnuelle} en plus d'un forfait de saison` : ''}

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
${f.glossaire.length ? `
## Glossaire de la couture

${f.glossaire.map((t) => `- [${t.terme}](${siteUrl}/glossaire/${t.slug}/) — ${uneLigne(t.definition)}`).join('\n')}
` : ''}`;
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
  // Une ligne par OFFRE, prix ET durée lus en base.
  const seances = offresALUnite(f.creneaux).map(
    (o) => `- **${o.titre}** : ${o.prix} €`,
  );

  const grille = f.ateliers.grille.map((g) => {
    const titre = libelleAudience(g.audience ?? '');
    const formules = (g.formules ?? [])
      .map((fo) => `- **${fo.seances}** : ${fo.mensuel}${fo.detail ? ` (${fo.detail})` : ''}`)
      .join('\n');
    const adhesion = f.adhesionAnnuelle ? ` Adhésion de ${f.adhesionAnnuelle} en plus.` : '';
    return `### Ateliers réguliers — ${titre}\n\n${g.dureeSeance ? `${g.dureeSeance}. ` : ''}Saison de septembre à juin.${adhesion}\n\n${formules}`;
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
      .map((c) => {
        // Un créneau au forfait seul n'a pas de prix à l'unité à annoncer : on
        // dit alors comment il se prend, plutôt qu'un montant inachetable.
        const prix = c.aLUnite === false
          ? 'au forfait de saison uniquement'
          : `${euros(c.prixCents)} € la séance`;
        return `- **${c.label}** — ${c.audience}, ${heure(c.debut)}–${heure(c.fin)}, ${prix}`;
      })
      .join('\n');
    return items ? `### ${lieu}\n\n${items}` : null;
  }).filter(Boolean).join('\n\n');

  return `# Tarifs — ${f.siteName}

Cours de couture à Revel (Haute-Garonne) et Verdalle (Tarn), France. Tous les montants sont en euros, toutes taxes comprises.
Dernière source de vérité : ${siteUrl}/ateliers-reguliers/ et ${siteUrl}/stages-thematiques/.
${f.avisProvisoire ? `\n> ${f.avisProvisoire}\n` : ''}
## Ce que les prix comprennent

- L'adhésion à l'association Les P'tits Piafs est **comprise** dans le prix des stages et des séances sans engagement. Il n'y a rien à régler sur place.
${f.adhesionAnnuelle ? `- Un forfait de saison suppose en revanche l'adhésion annuelle, **${f.adhesionAnnuelle}**, à régler **en plus** du forfait — une seule fois pour la saison.` : ''}
- Le tissu et les fournitures restent à la charge du participant.
- Chaque participant vient avec sa machine à coudre. Isabelle peut en prêter une sur demande préalable.

## Forfaits de saison

${grille}

## Séance sans engagement

Sans inscription à la saison, à l'unité.

${lignes(...seances) || '- Prix communiqué sur demande.'}

Une séance venant en plus d'un forfait ne se facture PAS à ces tarifs : elle revient au prix du forfait divisé par son nombre de séances, moins cher. Les montants ci-dessus valent pour qui vient sans forfait.

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

> Cours de couture, ateliers réguliers, stages thématiques et séances sans engagement à Revel (Haute-Garonne) et Verdalle (Tarn), en France, pour adultes, ados et enfants, animés par ${f.auteur}, ${minuscule(f.auteurTitre ?? '')}.

## Faits clés

${faitsCles(f).join('\n')}

## À propos

${f.siteName} est un atelier de couture animé par ${f.auteur}, ${minuscule(f.auteurTitre ?? '')}. Les cours ont lieu à Revel (Haute-Garonne, 31) et à Verdalle (Tarn, 81), à vingt minutes de Castres, et accueillent tous les niveaux — du grand débutant au couturier confirmé — en petits groupes pour garantir un accompagnement personnalisé. Adultes, ados et enfants.

Isabelle enseigne la couture depuis plus de dix ans. Son parcours mêle héritage familial (son arrière-grand-père était tailleur), passion pour le patronage et engagement artisanal.

Les cours se déroulent à deux endroits :

- **Atelier privé** : ${f.adresse.rue}, ${f.adresse.codePostal} ${f.adresse.ville}, ${f.adresse.region}
- **Maison des associations** : Revel

L'atelier s'appuie sur l'association Les P'tits Piafs. **L'adhésion est comprise dans le prix des stages et des séances sans engagement** : il n'y a rien à régler sur place.${f.adhesionAnnuelle ? ` Un forfait de saison suppose en revanche l'adhésion annuelle, **${f.adhesionAnnuelle}**, à régler en plus du forfait.` : ''} Le tissu et les fournitures restent à la charge du participant.
${f.avisProvisoire ? `\n**À noter** : ${f.avisProvisoire}\n` : ''}
## Les trois formules

### Ateliers réguliers

${uneLigne(f.ateliers.introduction)}

${uneLigne(f.ateliers.tarifsIntro)}

${f.ateliers.grille.map((g) => {
  const titre = libelleAudience(g.audience ?? '');
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
  ...offresALUnite(f.creneaux).map(
    (o) => `- ${o.titre} : ${o.prix} €, adhésion comprise`,
  ),
)}

${f.seances.idees.length ? `On peut y venir pour :\n\n${f.seances.idees.map((i) => `- ${i}`).join('\n')}\n` : ''}
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
Cela dépend de la formule. Pour un stage ou une séance sans engagement, non : l'adhésion ponctuelle est comprise dans le prix affiché.${f.adhesionAnnuelle ? ` Pour un forfait de saison, oui : l'adhésion annuelle à l'association Les P'tits Piafs coûte ${f.adhesionAnnuelle} et s'ajoute au forfait, réglée une seule fois pour la saison.` : ''}

**Les enfants sont-ils acceptés ?**
Oui, des créneaux leur sont réservés, avec des séances de 2 h et une grille tarifaire distincte.

**Où se garer ?**
Parking gratuit à proximité des deux lieux.

## Blog couture

${f.articles.map((a) => `- [${a.titre}](${siteUrl}/blog/${a.slug}/) — ${uneLigne(a.description)}`).join('\n')}
${f.glossaire.length ? `
## Glossaire de la couture

Quarante termes définis par Isabelle Bultez. Chaque définition tient seule ; la
page correspondante l'explique et donne ce qu'elle fait rater en atelier.

${f.glossaire.map((t) => `**${t.terme}** — ${uneLigne(t.definition)}\n${siteUrl}/glossaire/${t.slug}/`).join('\n\n')}
` : ''}
## Contact

- Courriel : ${f.email}
${f.telephones.map((t) => `- Téléphone : ${t}`).join('\n')}
- Formulaire de contact : ${siteUrl}/contact/
${f.facebookUrl ? `- Facebook : ${f.facebookUrl}` : ''}
- Tarifs au format lisible par machine : ${siteUrl}/tarifs.md
- Prochaines dates au format lisible par machine : ${siteUrl}/dates.md
`;
}
