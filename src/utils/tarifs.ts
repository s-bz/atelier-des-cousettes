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
 * La grille des forfaits, telle que le CMS la porte.
 *
 * On lit le nombre dans « 28 € par mois » plutôt que d'ajouter un champ : le
 * chiffre est déjà écrit là, et un second endroit pour le même montant est
 * exactement ce que ce fichier cherche à supprimer.
 */
type GrilleTarifs =
  | readonly { readonly formules?: readonly { readonly mensuel?: string | null }[] | null }[]
  | null
  | undefined;

function montantsMensuels(tarifs: GrilleTarifs): number[] {
  return (tarifs ?? [])
    .flatMap((t) => t.formules ?? [])
    .map((f) => Number(f.mensuel?.match(/\d+/)?.[0]))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function forfaitLePlusBas(tarifs: GrilleTarifs): number | null {
  const montants = montantsMensuels(tarifs);
  return montants.length ? Math.min(...montants) : null;
}

/** « De 28€ à 58€ » — du forfait le plus bas au plus élevé de la grille. */
export function fourchetteForfaits(tarifs: GrilleTarifs): string | null {
  const m = montantsMensuels(tarifs);
  return m.length ? `De ${Math.min(...m)}€ à ${Math.max(...m)}€` : null;
}
