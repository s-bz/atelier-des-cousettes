import { getAdminClient } from './supabase';

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
 * Ce qui n'en vient pas : les forfaits de saison. Ils n'existent pas en base —
 * on n'y facture pas un abonnement — et restent donc éditoriaux, dans le CMS.
 * Ce fichier sait seulement en lire les montants pour les résumer.
 */

export interface Tarifs {
  /** Prix d'une séance hors forfait, par public. */
  seance: { adultes: number | null; enfants: number | null };
  /** Le moins cher et le plus cher des stages. */
  stages: { min: number; max: number } | null;
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
      .select('kind, audience, default_unit_price_cents')
      .is('archived_at', null);
    if (error || !data?.length) return null;

    const prixDe = (kind: string, audience?: string) =>
      data
        .filter((c) => c.kind === kind && (!audience || c.audience === audience))
        .map((c) => c.default_unit_price_cents)
        .filter((n): n is number => typeof n === 'number' && n > 0);

    const stages = prixDe('stage');

    return {
      seance: {
        adultes: prixDe('atelier', 'adultes')[0] ? euros(prixDe('atelier', 'adultes')[0]) : null,
        enfants: prixDe('atelier', 'enfants')[0] ? euros(prixDe('atelier', 'enfants')[0]) : null,
      },
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
 * La grille des forfaits, telle que le CMS la porte.
 *
 * On lit le nombre dans « 28 € par mois » plutôt que d'ajouter un champ : le
 * chiffre est déjà écrit là, et un second endroit pour le même montant est
 * exactement ce que ce fichier cherche à supprimer.
 */
type GrilleTarifs =
  | readonly {
      readonly audience?: string | null;
      readonly formules?: readonly { readonly mensuel?: string | null }[] | null;
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
 * Le prix d'appel d'une carte, quand deux publics n'ont pas le même tarif.
 *
 * « DÈS 28 € » ÉTAIT UN PRIX D'ENFANT. Les cartes affichaient le plus bas des
 * montants, tous publics confondus : 28 €/mois pour les ateliers, 35 € pour une
 * séance. Un adulte qui cliquait découvrait 36 € et 45 €. L'écart n'est pas une
 * variante de formule qu'on découvre à la lecture — c'est un autre public, et
 * la carte ne disait pas lequel.
 *
 * L'ancrage bas est conservé, mais il annonce désormais à qui il s'adresse :
 * le tarif adulte ouvre, le tarif enfant suit entre parenthèses. Si l'un des
 * deux manque, la phrase se réduit à celui qui reste plutôt que d'inventer une
 * parenthèse vide.
 */
export function prixDeuxPublics(
  adultes: number | null | undefined,
  enfants: number | null | undefined,
  suffixe = '',
): string | null {
  if (!adultes) return enfants ? `Dès ${enfants} €${suffixe}` : null;
  if (!enfants || enfants === adultes) return `Dès ${adultes} €${suffixe}`;
  return `Dès ${adultes} €${suffixe} (${enfants} € enfant)`;
}

/** « De 28€ à 58€ » — du forfait le plus bas au plus élevé de la grille. */
export function fourchetteForfaits(tarifs: GrilleTarifs): string | null {
  const m = montantsMensuels(tarifs);
  return m.length ? `De ${Math.min(...m)}€ à ${Math.max(...m)}€` : null;
}
