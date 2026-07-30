/**
 * D'où viennent les faits publics : le CMS pour les mots, la base pour les prix.
 *
 * Séparé de `faits-publics.ts` pour que la composition des trois fichiers reste
 * vérifiable sans lecteur Keystatic ni base : les fonctions qui les écrivent ne
 * reçoivent que des données, celle-ci est la seule à savoir les trouver.
 */

import { reader } from './reader';
import { filterPublishedPosts } from './blog';
import { lireCreneauxPublics, type FaitsPublics } from './faits-publics';

export async function rassemblerFaitsPublics(site: URL | undefined): Promise<FaitsPublics> {
  const [settings, ateliers, stages, seances, articles, creneaux] = await Promise.all([
    reader.singletons.siteSettings.read(),
    reader.singletons.ateliersReguliers.read(),
    reader.singletons.stagesThematiques.read(),
    reader.singletons.apresMidiCouture.read(),
    reader.collections.blog.all(),
    lireCreneauxPublics(),
  ]);

  return {
    siteUrl: site?.origin ?? 'https://atelier-des-cousettes.fr',
    siteName: settings?.siteName ?? "L'Atelier des Cousettes",
    email: settings?.email,
    telephones: settings?.phones ?? [],
    facebookUrl: settings?.facebookUrl,
    auteur: settings?.authorName,
    auteurTitre: settings?.authorJobTitle,
    adresse: {
      rue: settings?.streetAddress,
      ville: settings?.addressLocality,
      codePostal: settings?.postalCode,
      region: settings?.addressRegion,
    },
    creneaux,
    ateliers: {
      introduction: ateliers?.introduction,
      tarifsIntro: ateliers?.tarifsIntro,
      tarifsNote: ateliers?.tarifsNote,
      grille: ateliers?.tarifs ?? [],
      creneauxCms: ateliers?.creneaux ?? [],
    },
    stages: {
      introduction: stages?.introduction,
      liste: stages?.stages ?? [],
    },
    seances: {
      introduction: seances?.introduction,
      description: seances?.description,
      publics: seances?.audienceItems ?? [],
    },
    // Du plus récent au plus ancien : un modèle qui tronque la liste garde
    // alors ce qui a le plus de chances d'être encore juste.
    articles: filterPublishedPosts(articles)
      .sort((a, b) => new Date(b.entry.publishDate).getTime() - new Date(a.entry.publishDate).getTime())
      .map((p) => ({
        slug: p.slug,
        titre: p.entry.title,
        description: p.entry.seoDescription ?? '',
        publieLe: p.entry.publishDate,
      })),
    avisProvisoire: settings?.avisProvisoire,
  };
}
