import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from './supabase';
import { AUDIENCES, type AudienceCreneau } from './ateliers';

/**
 * Les tarifs, lus une fois en base pour toutes les pages qui les affichent.
 *
 * POURQUOI CE FICHIER EXISTE. Les prix étaient recopiés à la main dans le CMS,
 * page par page : l'accueil annonçait « Dès 25 €/mois » et « 40 € les 3 h », la
 * page des stages « de 45 € à 95 € », la description SEO « de 25€ à 90€ ». Aucun
 * de ces quatre chiffres n'était encore juste, et rien ne pouvait le signaler —
 * ce sont des chaînes de caractères, elles ne se contredisent jamais tout haut.
 *
 * Ce qui vient de la base : le prix d'une séance hors forfait et celui d'un
 * stage. Ce sont les montants qui SERVENT À FACTURER ; les afficher d'après une
 * autre source reviendrait à promettre un prix que la facture démentirait.
 *
 * LES FORFAITS EN VIENNENT MAINTENANT AUSSI. Ils sont longtemps restés
 * éditoriaux, et à juste titre : on ne facturait pas un abonnement. Depuis que
 * la séance en dépassement se facture au prix divisé du forfait, ces montants
 * facturent à leur tour — la table `formules` les porte, et
 * `grilleAvecPrixDeLaBase` les substitue dans les phrases du CMS, qui gardent
 * leurs mots. Ce qui reste au CMS : la durée d'une séance, la glose du rythme,
 * l'ordre des cartes.
 */

/** Une séance achetable à l'unité : une durée, un prix. */
export interface OffreSeance {
  duree: string | null;
  prix: number;
}

export interface Tarifs {
  /**
   * LES SÉANCES ACHETABLES À L'UNITÉ, la plus chère d'abord.
   *
   * C'ÉTAIT UN PRIX PAR PUBLIC, et deux hypothèses s'y cachaient, toutes deux
   * devenues fausses la même saison :
   *
   *   — que tout créneau se vende à la séance. Les ateliers ados et enfants ne
   *     le sont plus. Leur `default_unit_price_cents` demeure — la colonne est
   *     obligatoire — mais il n'achète plus rien : depuis la table des
   *     formules, un dépassement se facture au prix divisé du forfait. Faute de
   *     filtrer sur `a_l_unite`, l'accueil a continué d'annoncer « 45 € la
   *     séance (35 € ado et enfant) », un tarif que personne ne peut ni acheter
   *     ni se voir facturer.
   *
   *   — qu'un public n'ait qu'un prix. Les adultes en ont deux depuis la séance
   *     du jeudi soir : 45 € les 3 h, 22 € l'heure et demie. Interrogée par
   *     public, la table rendait le premier des deux — l'ordre de la base,
   *     c'est-à-dire le hasard.
   *
   * Une offre est donc un couple (durée, prix), et non un public. Deux créneaux
   * qui durent autant et coûtent autant n'en font qu'une, quel que soit le jour.
   */
  seances: OffreSeance[];
  /** Le moins cher et le plus cher des stages. */
  stages: { min: number; max: number } | null;
}

/** « 3 h », « 1 h 30 » — la durée lue sur les horaires du créneau. */
function dureeDe(debut: string, fin: string): string | null {
  const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const m = min(fin) - min(debut);
  return m <= 0 ? null : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60}`;
}

const euros = (cents: number) => Math.round(cents / 100);

/**
 * Renvoie null si la base est injoignable — et c'est délibéré.
 *
 * L'accueil est prérendu : une exception ici ferait échouer la construction du
 * site entier pour un prix. Chaque page garde donc son texte du CMS en repli,
 * périmé peut-être, mais affiché.
 */
export async function lireTarifs(): Promise<Tarifs | null> {
  try {
    const { data, error } = await getAdminClient()
      .from('creneaux')
      .select('kind, a_l_unite, default_start_time, default_end_time, default_unit_price_cents')
      .is('archived_at', null);
    if (error || !data?.length) return null;

    const stages = data
      .filter((c) => c.kind === 'stage' && c.default_unit_price_cents > 0)
      .map((c) => c.default_unit_price_cents);

    // Une offre par couple (durée, prix) : les cinq créneaux adultes de 3 h à
    // 45 € n'en font qu'une.
    const offres = new Map<string, OffreSeance>();
    for (const c of data) {
      if (c.kind !== 'atelier' || !c.a_l_unite || !(c.default_unit_price_cents > 0)) continue;
      const duree = dureeDe(c.default_start_time, c.default_end_time);
      const cle = `${c.default_unit_price_cents}|${duree ?? ''}`;
      if (!offres.has(cle)) offres.set(cle, { duree, prix: euros(c.default_unit_price_cents) });
    }

    return {
      // La plus chère d'abord : c'est la formule principale, la courte se lit
      // ensuite comme ce qu'elle est, une porte d'entrée.
      seances: [...offres.values()].sort((a, b) => b.prix - a.prix),
      stages: stages.length
        ? { min: euros(Math.min(...stages)), max: euros(Math.max(...stages)) }
        : null,
    };
  } catch {
    return null;
  }
}

/** « de 38 € à 95 € » — la forme employée dans les phrases. */
export function fourchette(t: { min: number; max: number } | null): string | null {
  return t ? `de ${t.min} € à ${t.max} €` : null;
}

/**
 * Remplace une fourchette déjà écrite dans une phrase du CMS.
 *
 * Le texte reste à Isabelle — c'est elle qui décide de dire « les tarifs varient
 * selon le contenu du stage » — mais les deux nombres qu'il contient viennent de
 * la base. Les deux graphies traînent dans le contenu : « de 45 € à 95 € » et
 * « de 45€ à 95€ », avec ou sans espace insécable.
 */
export function remplacerFourchette(texte: string, nouvelle: string | null): string {
  if (!nouvelle) return texte;
  return texte.replace(
    /(de)(\s+\d+(?:[.,]\d+)?\s*€\s+à\s+\d+(?:[.,]\d+)?\s*€)/gi,
    // La majuscule du « de » d'origine est conservée : la même tournure ouvre
    // un paragraphe sur l'accueil et se glisse au milieu d'une phrase dans la
    // description SEO. Imposer l'une ou l'autre casse abîmait toujours l'un des
    // deux endroits.
    (_, de: string) => nouvelle.replace(/^de\b/i, de),
  );
}

/**
 * Remplace un montant unique déjà écrit dans une phrase du CMS.
 *
 * Même principe que `remplacerFourchette`, pour les phrases qui n'annoncent
 * qu'un prix — « venez d'abord pour une séance sans engagement (45 €) ». La
 * phrase appartient à Isabelle, le nombre à la base.
 *
 * SEULE LA PREMIÈRE OCCURRENCE EST TOUCHÉE : une phrase d'orientation cite un
 * tarif d'appel, pas une grille. Remplacer partout ferait de « 45 € la séance,
 * 360 € la saison » deux fois le même montant.
 */
export function remplacerPrix(texte: string, prix: number | null | undefined): string {
  if (!prix) return texte;
  return texte.replace(/\d+(?:[.,]\d+)?\s*€/, `${prix} €`);
}

/**
 * UNE FORMULE DE SAISON, telle que la base la porte.
 *
 * Les forfaits sont longtemps restés éditoriaux, et à juste titre : on ne
 * facturait pas un abonnement, ils n'existaient donc pas en base. Depuis que
 * la séance en dépassement se facture au prix divisé du forfait
 * (20260824200000), ces montants FACTURENT — et ce fichier existe précisément
 * pour que ce qui facture ne soit écrit qu'une fois.
 */
export interface FormuleBase {
  audience: string;
  seances: number;
  prixCents: number;
  mensualites: number;
}

/**
 * Les formules au catalogue. Null si la base est injoignable.
 *
 * PAS DE FILTRE SUR LA SAISON, et c'est délibéré : déduire la saison courante
 * d'une date se trompe entre juillet et septembre, où l'on prépare déjà la
 * suivante — nous sommes le 24 août 2026 et les formules affichées sont celles
 * de 2026-2027. `archived_at` est ce qui termine une saison, comme pour les
 * créneaux.
 */
export async function lireFormules(): Promise<FormuleBase[] | null> {
  try {
    const { data, error } = await getAdminClient()
      .from('formules')
      .select('audience, seances, prix_cents, mensualites')
      .is('archived_at', null);
    if (error || !data) return null;
    return data.map((f) => ({
      audience: f.audience,
      seances: f.seances,
      prixCents: f.prix_cents,
      mensualites: f.mensualites,
    }));
  } catch {
    return null;
  }
}

/**
 * Une formule telle que l'ADMINISTRATION la manipule : avec son identifiant et
 * son libellé, que `FormuleBase` n'a pas — la grille publique apparie sur le
 * couple (public, nombre de séances) et n'a que faire d'une clé primaire.
 */
export interface FormuleCatalogue {
  id: string;
  libelle: string;
  audience: string;
  seances: number;
  prixCents: number;
  /** Nombre de versements si le forfait n'est pas réglé en une fois. */
  mensualites: number;
}

/**
 * Le catalogue des formules, pour les écrans qui en font choisir une.
 *
 * Le client est passé en paramètre, et non pris ici : les écrans d'admin ont
 * déjà le leur, ouvert derrière `requireAdmin`.
 */
export async function lireCatalogueFormules(
  supabase: SupabaseClient,
): Promise<FormuleCatalogue[]> {
  const { data, error } = await supabase
    .from('formules')
    .select('id, libelle, audience, seances, prix_cents, mensualites')
    .is('archived_at', null)
    .order('audience')
    .order('seances');

  if (error || !data) return [];
  return data.map((f) => ({
    id: f.id,
    libelle: f.libelle,
    audience: f.audience,
    seances: f.seances,
    prixCents: f.prix_cents,
    mensualites: f.mensualites,
  }));
}

/**
 * « adultes — 18 séances · 531 € (29,50 € la séance en plus) ».
 *
 * LE PRIX DIVISÉ EST LA RAISON D'ÊTRE DE CETTE ÉTIQUETTE : c'est lui qui
 * facture un dépassement depuis `20260824200000`, et il ne se lit nulle part
 * ailleurs. Les deux décimales sont conservées même sur un compte rond — un
 * « 25 € » et un « 29,50 € » côte à côte dans une liste se comparent mal.
 */
export function libelleFormule(
  f: { libelle: string; audience: string; seances: number; prixCents: number },
): string {
  const total = (f.prixCents / 100).toFixed(0);
  const divise = (f.prixCents / f.seances / 100).toFixed(2).replace('.', ',');
  return `${f.audience} — ${f.libelle} · ${total} € (${divise} € la séance en plus)`;
}

/** Le premier nombre d'un texte — « 9 séances » → 9, « 324 € » → 324. */
const premierNombre = (texte: string | null | undefined): number | null => {
  const n = Number(texte?.match(/\d+/)?.[0]);
  return Number.isFinite(n) ? n : null;
};

/** « 29.5 » → « 29,50 », « 36 » → « 36 ». La virgule, et pas de zéro inutile. */
export function montantFr(cents: number): string {
  const euros = cents / 100;
  return Number.isInteger(euros) ? String(euros) : euros.toFixed(2).replace('.', ',');
}

/**
 * LA GRILLE DU CMS, SES NOMBRES REPRIS DE LA BASE.
 *
 * Même geste que `remplacerFourchette` et `remplacerPrix`, appliqué à la
 * grille : la phrase appartient à Isabelle — c'est elle qui écrit « environ une
 * fois par mois sur la saison » — et les trois nombres qu'elle contient
 * viennent de `formules`. Le montant mensuel, le total et le nombre
 * d'échéances se déduisent tous du prix et des mensualités ; les recopier dans
 * le CMS en aurait fait des chiffres qu'un changement de tarif oublierait.
 *
 * L'APPARIEMENT SE FAIT SUR LE PUBLIC ET LE NOMBRE DE SÉANCES — « adultes » et
 * le 9 de « 9 séances ». C'est ce couple qui identifie une formule, et il est
 * déjà écrit des deux côtés. Une ligne du CMS qu'aucune formule ne porte
 * garde ses nombres tels quels plutôt que de disparaître : mieux vaut un tarif
 * périmé affiché qu'une formule absente de la page, qui ne se remarque pas.
 */
export function grilleAvecPrixDeLaBase<
  T extends {
    audience?: string | null;
    formules?: readonly { seances?: string | null; mensuel?: string | null; detail?: string | null }[] | null;
  },
>(tarifs: readonly T[] | null | undefined, formules: readonly FormuleBase[] | null): T[] {
  const grille = [...(tarifs ?? [])];
  if (!formules?.length) return grille;

  return grille.map((t) => ({
    ...t,
    formules: (t.formules ?? []).map((f) => {
      const seances = premierNombre(f.seances);
      const base = formules.find((b) => b.audience === t.audience && b.seances === seances);
      if (!base) return f;

      const mensuel = Math.round(base.prixCents / base.mensualites);
      return {
        ...f,
        // « 36 € par mois » — seul le nombre change, les mots restent.
        mensuel: f.mensuel ? f.mensuel.replace(/\d+(?:[.,]\d+)?/, montantFr(mensuel)) : f.mensuel,
        // « … ; 324 €, en 9 mensualités ou en une fois » — le total puis le
        // nombre d'échéances, dans cet ordre. Le premier nombre suivi d'un €
        // est le total ; celui qui précède « mensualité » est le compte.
        detail: f.detail
          ? f.detail
              .replace(/\d+(?:[.,]\d+)?\s*€/, `${montantFr(base.prixCents)} €`)
              .replace(/\d+(\s*mensualit)/, `${base.mensualites}$1`)
          : f.detail,
      };
    }),
  }));
}

/**
 * La grille des forfaits, telle que le CMS la porte.
 *
 * On lit le nombre dans « 28 € par mois » plutôt que d'ajouter un champ : le
 * chiffre est déjà écrit là, et un second endroit pour le même montant est
 * exactement ce que ce fichier cherche à supprimer.
 */
type GrilleTarifs =
  | readonly {
      readonly audience?: string | null;
      readonly formules?:
        | readonly { readonly mensuel?: string | null; readonly seances?: string | null }[]
        | null;
    }[]
  | null
  | undefined;

function montantsMensuels(tarifs: GrilleTarifs, audience?: string): number[] {
  return (tarifs ?? [])
    .filter((t) => !audience || t.audience === audience)
    .flatMap((t) => t.formules ?? [])
    .map((f) => Number(f.mensuel?.match(/\d+/)?.[0]))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function forfaitLePlusBas(tarifs: GrilleTarifs, audience?: string): number | null {
  const montants = montantsMensuels(tarifs, audience);
  return montants.length ? Math.min(...montants) : null;
}

/**
 * Le forfait le moins cher, ET CE QU'IL ACHÈTE.
 *
 * « 36 €/mois » ne dit pas combien de fois on vient ; « 36 €/mois pour
 * 10 séances » le dit, et c'est la seule des deux phrases dont on puisse juger
 * si elle est chère. Le nombre de séances est déjà écrit dans la grille du CMS,
 * à côté du montant — les deux sortent donc d'ici ensemble, et aucune carte ne
 * peut annoncer le prix d'une formule avec le volume d'une autre.
 */
export function formuleLaMoinsChere(
  tarifs: GrilleTarifs,
  audience?: string,
): { mensuel: number; seances: string | null } | null {
  const formules = (tarifs ?? [])
    .filter((t) => !audience || t.audience === audience)
    .flatMap((t) => t.formules ?? [])
    .map((f) => ({
      mensuel: Number(f.mensuel?.match(/\d+/)?.[0]),
      seances: f.seances?.trim() || null,
    }))
    .filter((f) => Number.isFinite(f.mensuel) && f.mensuel > 0);

  if (!formules.length) return null;
  return formules.reduce((moins, f) => (f.mensuel < moins.mensuel ? f : moins));
}

/**
 * Le prix d'une carte, quand les publics n'ont pas tous le même tarif.
 *
 * « DÈS 28 € » ÉTAIT UN PRIX D'ENFANT. Les cartes affichaient le plus bas des
 * montants, tous publics confondus : 28 €/mois pour les ateliers, 35 € pour une
 * séance. Un adulte qui cliquait découvrait 36 € et 45 €. L'écart n'est pas une
 * variante de formule qu'on découvre à la lecture — c'est un autre public, et
 * la carte ne disait pas lequel. Le tarif adulte ouvre donc, le tarif enfant
 * suit entre parenthèses ; si l'un des deux manque, la phrase se réduit à celui
 * qui reste plutôt que d'inventer une parenthèse vide.
 *
 * « DÈS » A DISPARU, et le suffixe dit désormais ce que le montant achète.
 * Sur deux des trois cartes le mot était faux : 45 € n'est pas un prix
 * d'appel, c'est LE prix d'une séance adulte, et rien au-dessus ne l'attend.
 * Ailleurs il était vrai mais creux — « dès 36 €/mois » laisse ignorer combien
 * de fois on vient pour ce montant, ce qui est précisément ce dont on a besoin
 * pour juger s'il est cher. Une fourchette réelle, elle, s'écrit en toutes
 * lettres par l'appelant (« de 45 € à 95 € »), sans passer par ici.
 *
 * LA FONCTION PRENAIT DEUX MONTANTS NOMMÉS, elle prend désormais la table des
 * publics. Le troisième — les ados — serait autrement entré en base sans
 * qu'aucune de ces phrases ne l'apprenne : elles auraient continué d'annoncer
 * deux prix pour trois grilles, ce qui est la forme la plus discrète d'un tarif
 * faux.
 */
export function prixParPublic(
  prix: Partial<Record<AudienceCreneau, number | null | undefined>>,
  suffixe = '',
): string | null {
  const connus = AUDIENCES
    .map((a) => ({ personne: a.personne as string, montant: prix[a.creneau] }))
    .filter((p): p is { personne: string; montant: number } =>
      typeof p.montant === 'number' && p.montant > 0);

  if (!connus.length) return null;

  // AUDIENCES ouvre par les adultes : le premier montant connu est le leur dès
  // qu'ils en ont un, et sinon le public le plus proche. Aucune carte ne peut
  // donc s'ouvrir sur un prix d'enfant, ce qui était tout le problème.
  const [tete, ...suite] = connus;
  const autres = suite.filter((p) => p.montant !== tete.montant);
  if (!autres.length) return `${tete.montant} €${suffixe}`;

  /*
   * LES PUBLICS QUI PAIENT LE MÊME PRIX SE DISENT ENSEMBLE. Les ados et les
   * enfants règlent tous deux 35 € la séance : « (35 € ado, 35 € enfant) »
   * répète un montant pour ne rien ajouter, et fait chercher au lecteur une
   * différence qui n'existe pas. « (35 € ado et enfant) » se lit d'un coup.
   */
  const parMontant = new Map<number, string[]>();
  for (const p of autres) {
    parMontant.set(p.montant, [...(parMontant.get(p.montant) ?? []), p.personne]);
  }

  const parenthese = [...parMontant.entries()]
    .map(([montant, gens]) => {
      const noms = gens.length > 1
        ? `${gens.slice(0, -1).join(', ')} et ${gens[gens.length - 1]}`
        : gens[0];
      return `${montant} € ${noms}`;
    })
    .join(', ');

  return `${tete.montant} €${suffixe} (${parenthese})`;
}

/**
 * « 45 € la séance de 3 h (22 € en 1 h 30) » — les offres à l'unité en une phrase.
 *
 * Même hiérarchie que `prixParPublic` : la principale ouvre, les autres suivent
 * entre parenthèses. Ce qui les distingue n'est plus le public — elles
 * s'adressent toutes aux mêmes personnes — mais la durée, seule à justifier
 * l'écart de prix. La taire ferait de « 22 € » un rabais inexpliqué sur le même
 * service.
 */
export function prixDesOffres(offres: readonly OffreSeance[] | null | undefined): string | null {
  const liste = (offres ?? []).filter((o) => o.prix > 0);
  if (!liste.length) return null;

  const [tete, ...suite] = liste;
  const principal = `${tete.prix} € la séance${tete.duree ? ` de ${tete.duree}` : ''}`;
  if (!suite.length) return principal;

  return `${principal} (${suite.map((o) => `${o.prix} €${o.duree ? ` en ${o.duree}` : ''}`).join(', ')})`;
}

/** « De 28€ à 58€ » — du forfait le plus bas au plus élevé de la grille. */
export function fourchetteForfaits(tarifs: GrilleTarifs): string | null {
  const m = montantsMensuels(tarifs);
  return m.length ? `De ${Math.min(...m)}€ à ${Math.max(...m)}€` : null;
}
