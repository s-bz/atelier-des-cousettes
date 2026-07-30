import type { APIRoute } from 'astro';
import { construireTarifs } from '../utils/faits-publics';
import { rassemblerFaitsPublics } from '../utils/faits-publics-source';

/**
 * Les tarifs, en un seul fichier lisible par une machine.
 *
 * POURQUOI UN FICHIER DE PLUS. Les prix du site sont justes et viennent de la
 * base, mais ils sont répartis sur trois pages : les forfaits ici, les stages
 * là, la séance à l'unité ailleurs. Un agent qui compare des ateliers de couture
 * pour quelqu'un doit alors charger trois pages et recoller des montants dont il
 * ignore ce qu'ils comprennent — d'où les réponses qui ajoutent une adhésion
 * déjà comprise, ou qui citent le prix adulte pour un enfant.
 *
 * Ce fichier les met côte à côte, avec leur unité et leur périmètre. Il ne
 * remplace aucune page : il dit la même chose, sans mise en page.
 */
export const prerender = false;

export const GET: APIRoute = async ({ site }) => {
  const faits = await rassemblerFaitsPublics(site);
  return new Response(construireTarifs(faits), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
