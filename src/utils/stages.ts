/**
 * Les stages : leur liste, leurs formules, leurs dates et leurs prix.
 *
 * CE MODULE EXISTE PARCE QUE DEUX PAGES LISENT MAINTENANT LES MÊMES STAGES.
 * Le hub `/stages-thematiques/` en affiche la grille, et chaque stage a
 * désormais sa page — `/stages-thematiques/stage-patronage/` et ses cinq
 * sœurs. Tant qu'il n'y avait qu'une page, le calcul pouvait vivre dans son
 * frontmatter ; à deux, le laisser là garantissait qu'une copie prenne du
 * retard sur l'autre, et que le prix de la grille cesse un jour de
 * correspondre au prix de la fiche.
 *
 * Le regroupement en familles, l'ordre, les durées et la fourchette de prix
 * viennent donc d'ici, à l'identique pour les deux pages.
 */

import { getAdminClient } from './supabase';
import { toSlug } from './strings';

/** Le texte du CMS qui décrit un stage. Le nom fait la jointure avec la base. */
export interface DescriptionStage {
  name: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  prerequisite?: string | null;
  /** Slugs d'articles de blog, choisis dans le CMS. */
  articles?: readonly (string | null)[] | null;
}

/**
 * Une séance telle que la base la rend.
 *
 * Les champs suivent EXACTEMENT ceux qu'attend `CalendrierCreneau` : ces
 * séances lui sont passées telles quelles, et un `places_attente` facultatif
 * ici l'obligerait à traiter un cas que la base ne produit pas. La colonne est
 * `not null` en base ; le type le dit aussi.
 */
interface SeanceBrute {
  starts_at: string;
  ends_at: string;
  capacity: number;
  places_attente: number;
  status: string;
  bookings: { status: string }[] | null;
}

export const euros = (cents: number) => (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);

const minutesDe = (s: { starts_at: string; ends_at: string }) =>
  (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 60000;

const enHeures = (m: number) =>
  m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60}`;

/** « A, B ou C » — on choisit entre des options, on ne parcourt pas une échelle. */
export const enumerer = (parts: string[]) =>
  parts.length < 2 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} ou ${parts.at(-1)}`;

/**
 * « En N séances » et non « forfait de N séances ». Dans cette maison, un forfait
 * est un lot de séances d'atelier payé d'avance et posé sur les dates de son
 * choix ; un stage en plusieurs séances est l'inverse — une progression, aux
 * dates fixées, où l'on vient à toutes. Le même mot pour les deux ferait croire
 * qu'on peut n'en prendre qu'une.
 */
export const formule = (n: number) => (n > 1 ? `Stage en ${n} séances` : 'Une séance');

/**
 * Le tarif d'une formule, son prix et sa durée appariés : « 70 € pour 5 h ».
 *
 * Deux fourchettes côte à côte — « 70 € – 95 € » puis « 5 h – 7 h » — obligeaient
 * à deviner laquelle allait avec laquelle. Rien n'y disait que la moins chère
 * était la plus courte : c'est vrai ici, ce n'est pas une loi.
 */
export const prixEtDuree = (c: { heures: string | null; default_unit_price_cents: number }) =>
  c.heures
    ? `${euros(c.default_unit_price_cents)} € pour ${c.heures}`
    : `${euros(c.default_unit_price_cents)} €`;

export type Formule = Awaited<ReturnType<typeof chargerStages>>['formules'][number];
export type StageGroupe = Awaited<ReturnType<typeof chargerStages>>['stages'][number];

/**
 * Charge les stages, les apparie au texte du CMS, et les regroupe par famille.
 *
 * `descriptions` est la liste du CMS, dans l'ordre où Isabelle l'a rangée — cet
 * ordre est celui de l'affichage, voir plus bas.
 */
export async function chargerStages(descriptions: readonly DescriptionStage[]) {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('creneaux')
    .select(`
      id, label, audience, default_location, default_capacity,
      default_unit_price_cents, seances_par_stage,
      sessions(starts_at, ends_at, capacity, places_attente, status, bookings(status))
    `)
    .eq('kind', 'stage')
    .is('archived_at', null)
    .order('label');

  const maintenant = new Date().toISOString();

  /**
   * Le texte du contenu qui décrit ce stage, s'il en existe un.
   *
   * Rapprochement par préfixe : « Stage découverte de la couture — formule
   * complète » commence par « Stage découverte de la couture ». Les deux formules
   * héritent donc de la même description, ce qui est exact — c'est le même stage,
   * proposé sur deux durées.
   */
  const descriptionDe = (label: string) =>
    descriptions.find((d) => label === d.name || label.startsWith(d.name)) ?? null;

  const formules = (data ?? []).map((c) => {
    const toutes = [...((c.sessions ?? []) as SeanceBrute[])]
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const aVenir = toutes.filter((s) => s.status === 'scheduled' && s.starts_at > maintenant);

    /**
     * La durée annoncée, et elle ne se calcule pas de la même façon des deux côtés.
     *
     * FORFAIT (plusieurs séances) : la somme des séances du stage. C'est le chiffre
     * annoncé — « 95 € pour 7 h » — et il ne se lit nulle part ailleurs, les trois
     * matinées faisant 2 h, 2 h et 3 h.
     *
     * DATES INDÉPENDANTES : chaque date est une séance à part entière, et RIEN NE
     * LES OBLIGE À DURER PAREIL. L'initiation machine à coudre le montre : trois
     * jeudis de 2 h 30 et un samedi de 3 h. Prendre la durée de la première date
     * pour celle du stage annoncerait 2 h 30 à qui vient le samedi.
     */
    const dureesSeules = [...new Set(aVenir.map(minutesDe))].sort((a, b) => a - b);
    const minutesForfait = toutes
      .slice(0, c.seances_par_stage)
      .reduce((n, s) => n + minutesDe(s), 0);

    const heures = c.seances_par_stage > 1
      ? enHeures(minutesForfait)
      : enumerer(dureesSeules.map(enHeures));

    const [base, ...reste] = c.label.split('—');

    return {
      ...c,
      aVenir,
      description: descriptionDe(c.label),
      heures: heures || null,
      base: base.trim(),
      variante: reste.join('—').trim() || null,
      // Sert à ordonner les formules d'un même stage, de la plus courte à la plus
      // longue. Pour des dates indépendantes, la plus brève fait référence.
      minutes: c.seances_par_stage > 1 ? minutesForfait : (dureesSeules[0] ?? 0),
    };
  });

  /**
   * Un stage, ses formules regroupées sous un seul titre.
   *
   * La base porte deux lignes nommées « Stage découverte de la couture — formule
   * complète » et « … — formule courte », et c'est juste : ce sont deux cohortes
   * distinctes, chacune avec son prix, ses dates, ses places et sa réservation en
   * bloc. Mais deux cartes aux titres presque identiques, portant la même
   * description, se lisent comme un doublon.
   *
   * On les réunit donc : un titre, la description une fois, puis chaque formule
   * avec ce qui la distingue vraiment — sa durée, son prix, ses dates. Le
   * regroupement se fait sur ce qui précède le tiret cadratin, seule marque
   * commune aux deux libellés.
   */
  type Famille = { base: string; formules: typeof formules };
  const familles: Famille[] = [];
  for (const c of formules) {
    const famille = familles.find((f) => f.base === c.base);
    if (famille) famille.formules.push(c);
    else familles.push({ base: c.base, formules: [c] });
  }
  // De la plus courte à la plus longue, sur le temps qu'elle demande — non sur le
  // nombre de séances, qui vaut 1 des deux côtés dès que les formules se
  // distinguent par la durée d'une séance unique.
  for (const f of familles) {
    f.formules.sort((a, b) => a.minutes - b.minutes);
  }

  /**
   * L'ORDRE DES STAGES SUIT CELUI DU CONTENU, et non l'alphabet.
   *
   * Isabelle range ses stages dans le CMS, et cet ordre veut dire quelque chose :
   * l'initiation ouvre, la découverte suit, les stages techniques viennent après.
   * Trier sur le libellé effaçait ce classement et remontait la banane en
   * deuxième position, entre l'initiation et la découverte, pour la seule raison
   * qu'elle commence par un B.
   *
   * Un stage que le contenu ne décrit pas passe à la fin, où il se remarque —
   * c'est un stage à décrire, pas un stage à cacher.
   */
  const rangDansLeContenu = (base: string) => {
    const i = descriptions.findIndex((d) => base === d.name || base.startsWith(d.name));
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  familles.sort(
    (a, b) => rangDansLeContenu(a.base) - rangDansLeContenu(b.base) || a.base.localeCompare(b.base),
  );

  const stages = familles.map((f) => {
    const prix = f.formules.map((c) => c.default_unit_price_cents);
    const heures = f.formules.map((c) => c.heures).filter(Boolean) as string[];
    // Lieu et nombre de places ne remontent en tête que s'ils valent pour toutes
    // les formules. Sinon chacune porte les siens : mieux vaut le répéter que
    // laisser croire qu'un stage se tient là où il ne se tient pas.
    const lieux = new Set(f.formules.map((c) => c.default_location));
    const places = new Set(f.formules.map((c) => c.default_capacity));
    return {
      ...f,
      /**
       * L'adresse de la fiche du stage.
       *
       * C'est le MÊME identifiant que les ancres d'autrefois (`toSlug` sur le
       * nom de base) : la page hub s'en servait pour ses `id=`, la fiche s'en
       * sert maintenant pour son URL. Rien n'a jamais pointé vers ces ancres —
       * aucune redirection n'est donc due.
       */
      href: `/stages-thematiques/${toSlug(f.base)}/`,
      // La description est celle du stage, pas de la formule : c'est le même stage.
      description: f.formules[0].description,
      audience: f.formules[0].audience,
      // Une seule formule : le prix en couleur, la durée en gris à côté — il n'y a
      // rien à apparier. Plusieurs : chaque prix porte sa durée, d'un bloc.
      tarifPrincipal: f.formules.length > 1
        ? enumerer(f.formules.map(prixEtDuree))
        : `${euros(prix[0])} €`,
      tarifSecondaire: f.formules.length > 1 ? null : (heures[0] ?? null),
      lieuCommun: lieux.size === 1 ? f.formules[0].default_location : null,
      placesCommunes: places.size === 1 ? f.formules[0].default_capacity : null,
      prixMin: Math.min(...prix),
    };
  });

  /**
   * La fourchette de prix de la FAQ, recalculée à chaque visite.
   *
   * Elle était écrite à la main — « de 45 € à 95 € » — et fausse depuis le jour
   * où la formule de 2 h 30 de l'initiation est passée à 38 € : le plancher a
   * bougé sans que personne ne pense à la phrase qui l'annonce. C'est le propre
   * d'un chiffre recopié.
   */
  const tousLesPrix = (data ?? []).map((c) => c.default_unit_price_cents);
  const fourchette = tousLesPrix.length
    ? `de ${euros(Math.min(...tousLesPrix))} € à ${euros(Math.max(...tousLesPrix))} €`
    : null;

  return { stages, formules, fourchette, offresBrutes: data ?? [], error };
}

/**
 * Remplace la fourchette de prix écrite à la main par celle de la base.
 *
 * Seuls les NOMBRES sont remplacés : la phrase reste celle d'Isabelle, et si
 * elle la réécrit sans la tournure « de X € à Y € », la réponse passe inchangée
 * plutôt que d'être mutilée.
 */
export function fourchetteAJour<T extends { question: string; answer: string }>(
  items: readonly T[],
  fourchette: string | null,
): T[] {
  return items.map((q) => ({
    ...q,
    answer: fourchette
      ? q.answer.replace(/de\s+\d+(?:,\d+)?\s*€\s+à\s+\d+(?:,\d+)?\s*€/, fourchette)
      : q.answer,
  }));
}
